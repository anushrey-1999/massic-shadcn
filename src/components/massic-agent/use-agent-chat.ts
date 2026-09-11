"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { agentKeys, cancelTurn, errorMessage, startChatStream, streamErrorMessage } from "./agent-api";
import { buildChatRequest, intentLabel, lastMatchingPlan, mergeMessages } from "./agent-model";
import { parseAgentStream } from "./agent-sse";
import { reduceAgentEvent } from "./agent-stream-state";
import { useAgentHistory } from "./use-agent-history";
import type { AgentConversation, AgentMessage, ChatRequest, PlanIntent, ResourceRef, Surface } from "./types";

type Draft = { surface: Surface; input: string; resource: ResourceRef | null; selectedIds: string[] };
const emptyDraft = (surface: Surface = "global"): Draft => ({ surface, input: "", resource: null, selectedIds: [] });
type Running = { key: string; thread?: string; turn?: string; controller: AbortController; stopRequested: boolean };

/** This controller is mounted per business. Async work captures its own conversation, never the visible chat. */
export function useAgentChat(business: string) {
  const queryClient = useQueryClient();
  const [urlThread, setUrlThread] = useQueryState("thread");
  const [draftId, setDraftId] = useState("draft:initial");
  const activeKey = urlThread ?? draftId;
  const activeRef = useRef(activeKey); activeRef.current = activeKey;
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [live, setLive] = useState<Record<string, AgentMessage[]>>({});
  const [localThreads, setLocalThreads] = useState<Record<string, AgentConversation>>({});
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditWarning, setCreditWarning] = useState(false);
  const running = useRef<Running | null>(null);
  const mounted = useRef(true);
  const history = useAgentHistory(business, urlThread);
  const conversations = useMemo(() => {
    const all = new Map<string, AgentConversation>();
    for (const t of history.threads.data?.pages.flatMap(p => p.threads) ?? []) all.set(t.thread_id, { id: t.thread_id, title: t.title ?? "New chat", surface: t.surface, updatedAt: Date.parse(t.updated_at) });
    for (const t of Object.values(localThreads)) all.set(t.id, { ...all.get(t.id), ...t });
    return [...all.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [history.threads.data, localThreads]);
  const conversation = conversations.find(c => c.id === activeKey);
  const draft = drafts[activeKey] ?? emptyDraft(conversation?.surface ?? "global");
  const surface = conversation?.surface ?? draft.surface;
  const messages = mergeMessages(history.hydrated, live[activeKey] ?? []);
  const knownThread = !urlThread || !!conversation;
  // A deep link may point beyond the first thread page; obtain its authoritative surface.
  useEffect(() => {
    if (urlThread && !conversation && history.threads.hasNextPage && !history.threads.isFetchingNextPage) void history.threads.fetchNextPage();
  }, [urlThread, conversation, history.threads.hasNextPage, history.threads.isFetchingNextPage, history.threads.fetchNextPage]);
  useEffect(() => {
    if (!urlThread || !conversation || !history.messages.data) return;
    setDrafts(prev => {
      if (prev[urlThread]) return prev;
      const restored = mergeMessages(history.hydrated, []).flatMap(m => m.widgetParts ?? []);
      return { ...prev, [urlThread]: { ...emptyDraft(conversation.surface), resource: lastMatchingPlan(restored, conversation.surface) } };
    });
  }, [urlThread, conversation, history.messages.data]); // restore once; don't override a user closing a plan

  const updateDraft = useCallback((patch: Partial<Draft>) => {
    setDrafts(prev => ({ ...prev, [activeKey]: { ...draft, ...patch } }));
  }, [activeKey, draft]);
  const newChat = useCallback((nextSurface: Surface = "global", resource: ResourceRef | null = null) => {
    const key = `draft:${crypto.randomUUID()}`;
    setDraftId(key); activeRef.current = key;
    setDrafts(prev => ({ ...prev, [key]: { ...emptyDraft(nextSurface), resource } }));
    void setUrlThread(null); setError(null);
  }, [setUrlThread]);
  const selectChat = (id: string) => { activeRef.current = id; void setUrlThread(id); setError(null); };
  const openPlan = (resource: ResourceRef) => {
    const nextSurface = resource.type === "webpage_plan" ? "webpages" : "social_channels";
    if (surface !== "global" && surface !== nextSurface) newChat("global", resource);
    else updateDraft({ resource, selectedIds: [] });
  };
  const requestStop = useCallback(async (run: Running) => {
    if (!run.thread || !run.turn) { run.stopRequested = true; return; }
    await cancelTurn(business, run.thread, run.turn);
  }, [business]);
  const stop = async () => {
    const run = running.current; if (!run || stopping) return;
    setStopping(true); setError(null);
    try { await requestStop(run); } catch (e) { setError(`Could not stop the response. ${errorMessage(e)}`); setStopping(false); }
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const run = running.current;
      if (run) void requestStop(run).catch(() => {}).finally(() => run.controller.abort());
    };
  }, [requestStop]);

  const send = async (intent?: PlanIntent, override?: string) => {
    if (running.current || !business || !knownThread) return;
    let request: ChatRequest;
    try { request = buildChatRequest({ threadId: urlThread, surface, message: override ?? draft.input, intent, resource: draft.resource, selectedIds: draft.selectedIds }); }
    catch (e) { setError(errorMessage(e)); return; }
    const originalDraft = { ...draft, surface };
    const originalKey = activeKey;
    const run: Running = { key: activeKey, thread: urlThread ?? undefined, controller: new AbortController(), stopRequested: false };
    running.current = run; setRunningKey(run.key); setError(null); setStopping(false);
    const now = Date.now();
    let user: AgentMessage = { id: `pending:${now}-user`, role: "user", content: request.message ?? intentLabel(intent!.kind), createdAt: now, intent, view: request.metadata?.view };
    let assistant: AgentMessage = { id: `pending:${now}-assistant`, role: "assistant", content: "", createdAt: now + 1, activity: [] };
    setLive(prev => ({ ...prev, [run.key]: [...(prev[run.key] ?? []), user, assistant] }));
    updateDraft({ input: "" });
    // Coalesce tokens once per frame rather than rerendering for every network token.
    let frame: number | null = null;
    const iterationBuffers = new Map<number, string>();
    const publish = () => {
      frame = null;
      if (!mounted.current) return;
      const snapshot = assistant;
      setLive(prev => ({ ...prev, [run.key]: [...(prev[run.key] ?? []).slice(0, -2), user, snapshot] }));
    };
    let terminal = false;
    try {
      const body = await startChatStream(business, request, run.controller.signal);
      for await (const event of parseAgentStream(body)) {
        if (running.current !== run) break;
        if (event.type === "thread_meta") {
          run.thread = event.thread_id; run.turn = event.turn_id;
          user = { ...user, turnId: event.turn_id, id: `${event.turn_id}-user` };
          if (run.key !== event.thread_id) {
            const oldKey = run.key; run.key = event.thread_id;
            setLive(prev => { const next = { ...prev, [run.key]: prev[oldKey] ?? [] }; delete next[oldKey]; return next; });
            setDrafts(prev => ({ ...prev, [run.key]: { ...originalDraft, input: "" } }));
            if (activeRef.current === oldKey) { activeRef.current = run.key; void setUrlThread(run.key); }
            setRunningKey(run.key);
          }
          setLocalThreads(prev => ({ ...prev, [run.key]: { id: run.key, surface, title: event.title ?? (event.is_new ? request.message?.slice(0, 80) : conversation?.title) ?? (intent ? intentLabel(intent.kind) : "New chat"), updatedAt: now } }));
          if (run.stopRequested) void requestStop(run).catch(e => { if (mounted.current) { setError(errorMessage(e)); setStopping(false); } });
        }
        if (event.type === "thread_title") setLocalThreads(prev => ({ ...prev, [event.thread_id]: { ...prev[event.thread_id], id: event.thread_id, surface, title: event.title, updatedAt: now } }));
        // Iteration-tagged tokens can be private scratch work. Buffer them until
        // the server marks the iteration as final so only conversational text is shown.
        if (event.type === "token" && typeof event.iteration === "number" && (event.depth ?? 0) === 0) {
          iterationBuffers.set(event.iteration, (iterationBuffers.get(event.iteration) ?? "") + event.text);
        } else if (event.type === "iteration_end") {
          const buffered = iterationBuffers.get(event.iteration) ?? "";
          iterationBuffers.delete(event.iteration);
          if (event.phase === "final" && buffered) assistant = reduceAgentEvent(assistant, { type: "token", text: buffered, depth: 0 });
        } else if (event.type === "error") {
          const friendly = streamErrorMessage(event.code, event.message);
          assistant = reduceAgentEvent(assistant, { ...event, message: friendly });
          setError(friendly);
        } else {
          assistant = reduceAgentEvent(assistant, event);
        }
        if (event.type === "turn_end" && (event.depth ?? 0) === 0) {
          terminal = true; setCreditWarning(event.credit_warning === true);
          const resource = lastMatchingPlan(assistant.widgetParts ?? [], surface);
          if (resource) setDrafts(prev => ({ ...prev, [run.key]: { ...(prev[run.key] ?? originalDraft), resource, selectedIds: [] } }));
          void queryClient.invalidateQueries({ queryKey: agentKeys.plans(business) });
          for (const part of assistant.widgetParts ?? []) void queryClient.invalidateQueries({ queryKey: agentKeys.plan(business, part.resource.id) });
        }
        if (frame === null) frame = requestAnimationFrame(publish);
        if (terminal) break;
      }
      if (!terminal && assistant.status !== "error" && assistant.status !== "cancelled") {
        throw new Error("The connection ended before the response finished. Your partial response is saved; reload this chat before retrying.");
      }
    } catch (e) {
      if (!mounted.current) return;
      const detail = errorMessage(e);
      assistant = { ...assistant, status: "error", partial: !!assistant.content, error: detail };
      setError(detail);
      if (run.thread && run.turn) void requestStop(run).catch(() => {});
      setDrafts(prev => ({ ...prev, [run.key]: { ...(prev[run.key] ?? originalDraft), input: prev[run.key]?.input || originalDraft.input } }));
    } finally {
      if (frame !== null) cancelAnimationFrame(frame);
      publish(); run.controller.abort();
      if (running.current === run) running.current = null;
      if (mounted.current) {
        setRunningKey(null); setStopping(false);
        if (assistant.status === "error") setDrafts(prev => ({ ...prev, [run.key]: { ...(prev[run.key] ?? originalDraft), input: prev[run.key]?.input || originalDraft.input } }));
        void queryClient.invalidateQueries({ queryKey: agentKeys.threads(business) });
        if (run.thread) void queryClient.invalidateQueries({ queryKey: agentKeys.messages(business, run.thread) });
      }
    }
  };
  return { activeKey, conversation, conversations, surface, draft, messages, history, runningKey, stopping, error, creditWarning, knownThread,
    setError, updateDraft, newChat, selectChat, openPlan, send, stop,
    updateTitle: (id: string, title: string) => setLocalThreads(prev => ({ ...prev, [id]: { ...conversations.find(c => c.id === id)!, title } })),
  };
}
