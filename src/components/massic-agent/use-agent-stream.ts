"use client";

import * as React from "react";
import { startChatStream, type ChatRequestMetadata } from "./agent-api";
import type {
  AgentMessage,
  SseEvent,
  SseToolCallEnd,
  SseTurnEnd,
  SpecialistState,
  StreamPhase,
  WidgetPart,
} from "./types";

export type AgentStreamCallbacks = {
  onThreadMeta: (threadId: string, turnId: string, isNew: boolean, title?: string) => void;
  onThreadTitle: (threadId: string, title: string, provisional: boolean) => void;
  onMessagePatch: (patcher: (msg: AgentMessage) => AgentMessage) => void;
  onMessageCommit: (content: string, partial: boolean) => void;
  onToolCall: (toolName: string, widgetPart?: WidgetPart) => void;
  onWidgetParts: (parts: WidgetPart[]) => void;
  onTurnEnd: () => void;
  onCancelled: () => void;
  onError: (code: string, message: string) => void;
};

const TOOL_RESOURCE_TYPE: Record<string, string> = {
  get_webpage_plan: "webpage_plan",
  save_plan: "webpage_plan",
};

function parseSseBlock(block: string): SseEvent | null {
  const line = block
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.startsWith("data:"));
  if (!line) return null;
  const payload = line.slice(5).trim();
  if (!payload || payload === "[DONE]") return null;
  try {
    return JSON.parse(payload) as SseEvent;
  } catch {
    return null;
  }
}

function extractResourceId(event: SseToolCallEnd): number | string | null {
  if (event.input?.plan_id !== undefined) {
    return event.input.plan_id as number | string;
  }

  if (event.output) {
    try {
      const parsed =
        typeof event.output === "string"
          ? JSON.parse(event.output)
          : event.output;
      if (
        parsed &&
        typeof parsed === "object" &&
        "id" in parsed &&
        parsed.id !== undefined
      ) {
        return parsed.id as number | string;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function buildWidgetPart(event: SseToolCallEnd): WidgetPart | undefined {
  if (!event.widget) return undefined;
  const resourceType = TOOL_RESOURCE_TYPE[event.tool_name];
  if (!resourceType) return undefined;
  const resourceId = extractResourceId(event);
  if (resourceId === null) return undefined;

  return {
    kind: "widget",
    widget: event.widget,
    schema_version: event.widget_version ?? 1,
    source: {
      tool_call_id: event.call_id,
      tool_name: event.tool_name,
    },
    resource: {
      type: resourceType,
      id: resourceId,
    },
  };
}

function isTerminalTurnEnd(event: SseTurnEnd): boolean {
  return !(event.status === "handoff" && event.agent === "main");
}

export function useAgentStream(businessId: string) {
  const [streamPhase, setStreamPhase] = React.useState<StreamPhase>(null);
  const [specialistState, setSpecialistState] = React.useState<SpecialistState>(null);
  const [activeToolName, setActiveToolName] = React.useState<string | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);
  const turnIdRef = React.useRef<string | null>(null);
  const threadIdRef = React.useRef<string | null>(null);

  const cancel = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamPhase(null);
    setActiveToolName(null);
  }, []);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = React.useCallback(
    async (
      params: {
        message: string | null;
        threadId: string | null;
        metadata?: ChatRequestMetadata;
      },
      callbacks: AgentStreamCallbacks
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Per-iteration token buffers for thinking rollback
      const iterBuffers: Record<number, string> = {};
      let buffer = "";

      setStreamPhase("thinking");
      setSpecialistState(null);
      setActiveToolName(null);

      try {
        const res = await startChatStream(
          businessId,
          params.message,
          params.threadId,
          params.metadata
        );

        if (!res.body) {
          callbacks.onError("no_body", "No response body");
          setStreamPhase(null);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          if (controller.signal.aborted) break;

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split("\n\n");
          // Keep incomplete last block in buffer
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            const event = parseSseBlock(block);
            if (!event) continue;

            switch (event.type) {
              case "thread_meta": {
                turnIdRef.current = event.turn_id;
                threadIdRef.current = event.thread_id;
                callbacks.onThreadMeta(
                  event.thread_id,
                  event.turn_id,
                  event.is_new,
                  event.title
                );
                break;
              }

              case "thread_title": {
                callbacks.onThreadTitle(event.thread_id, event.title, event.provisional);
                break;
              }

              case "turn_start": {
                setStreamPhase("thinking");
                break;
              }

              case "token": {
                iterBuffers[event.iteration] =
                  (iterBuffers[event.iteration] ?? "") + event.text;
                callbacks.onMessagePatch((m) => ({
                  ...m,
                  content: (m.content ?? "") + event.text,
                }));
                break;
              }

              case "iteration_end": {
                const buf = iterBuffers[event.iteration] ?? "";
                delete iterBuffers[event.iteration];

                if (event.phase === "thinking" && buf) {
                  callbacks.onMessagePatch((m) => ({
                    ...m,
                    content: m.content.slice(0, Math.max(0, m.content.length - buf.length)),
                    thinking: (m.thinking ?? "") + (m.thinking ? "\n\n" : "") + buf,
                  }));
                  // Thinking iteration done — switch to responding so the
                  // thinking panel becomes a static collapsed section while
                  // the final response streams in.
                  setStreamPhase("responding");
                }
                // phase === "final": tokens already visible, nothing to move
                break;
              }

              case "tool_call_start": {
                setStreamPhase("tool");
                setActiveToolName(event.tool_name);
                break;
              }

              case "tool_call_end": {
                setActiveToolName(null);
                setStreamPhase("responding");
                callbacks.onToolCall(event.tool_name, buildWidgetPart(event));
                break;
              }

              case "agent_handoff": {
                if (event.to && event.to !== "main") {
                  setSpecialistState(event.to);
                } else if (event.to === "main") {
                  setSpecialistState(null);
                }
                break;
              }

              case "message_complete": {
                callbacks.onMessageCommit(event.content, event.partial);
                if (event.partial) {
                  callbacks.onCancelled();
                }
                break;
              }

              case "turn_end": {
                if (isTerminalTurnEnd(event)) {
                  setSpecialistState(event.active_agent ?? null);
                  setStreamPhase(null);
                  setActiveToolName(null);
                  if (event.widget_parts?.length) {
                    callbacks.onWidgetParts(event.widget_parts);
                  }
                  callbacks.onTurnEnd();
                }
                break;
              }

              case "cancelled": {
                setStreamPhase(null);
                setActiveToolName(null);
                callbacks.onCancelled();
                break;
              }

              case "error": {
                setStreamPhase(null);
                setActiveToolName(null);
                callbacks.onError(event.code, event.message);
                break;
              }

              case "heartbeat":
              case "thinking_summary":
              case "summarising_history":
              case "memory_event":
              case "iteration_start":
                break;
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setStreamPhase(null);
        setActiveToolName(null);
        const msg = err instanceof Error ? err.message : "Unknown error";
        callbacks.onError("stream_error", msg);
      } finally {
        if (!controller.signal.aborted) {
          abortRef.current = null;
        }
      }
    },
    [businessId]
  );

  const getCurrentTurnId = React.useCallback(() => turnIdRef.current, []);
  const getCurrentThreadId = React.useCallback(() => threadIdRef.current, []);

  return {
    send,
    cancel,
    streamPhase,
    specialistState,
    activeToolName,
    getCurrentTurnId,
    getCurrentThreadId,
  };
}
