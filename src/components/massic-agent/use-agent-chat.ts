"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AgentAPIError,
  agentKeys,
  cancelTurn,
  errorMessage,
  getLatestThread,
  getMessages,
  startChatStream,
  streamErrorMessage,
} from "./agent-api";
import {
  buildChatRequest,
  findAcceptedTurn,
  mergeMessages,
} from "./agent-model";
import { parseAgentStream } from "./agent-sse";
import { createStreamPublisher } from "./stream-publisher";
import { reduceAgentEvent } from "./agent-stream-state";
import { useAgentHistory } from "./use-agent-history";
import {
  attachmentsReady,
  uploadAgentFile,
  uploadErrorMessage,
  validateAgentFiles,
  type PendingAttachment,
} from "./agent-uploads";
import type {
  AgentConversation,
  AgentCreditsResponse,
  AgentId,
  AgentMessage,
  AgentThreadTag,
  ChatRequest,
} from "./types";

export type ChatDraft = { input: string; attachments: PendingAttachment[] };
type Options = {
  agentId: AgentId;
  tag: AgentThreadTag;
  threadId: string | null;
  enabled?: boolean;
  confirmedThread?: string;
  onThreadChange: (thread: string | null, previousKey?: string) => void;
  buildRequest?: (
    message: string,
    options?: { omitView?: boolean },
  ) => ChatRequest;
  onTurnEnd?: (message: AgentMessage, thread: string) => void;
  onSettled?: () => Promise<void>;
};
const emptyDraft = (): ChatDraft => ({ input: "", attachments: [] });
type Running = {
  key: string;
  thread?: string;
  turn?: string;
  controller: AbortController;
  stopRequested: boolean;
  cancelSent: boolean;
};

/** This controller is mounted per business. Async work captures its own conversation, never the visible chat. */
export function useAgentChat(business: string, options: Options) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const queryClient = useQueryClient();
  const threadId = options.threadId;
  const changeThread = (thread: string | null, previousKey?: string) =>
    optionsRef.current.onThreadChange(thread, previousKey);
  const [draftId, setDraftId] = useState("draft:initial");
  const activeKey = threadId ?? draftId;
  const [presentationKeys, setPresentationKeys] = useState<
    Record<string, string>
  >({});
  const presentationKey = presentationKeys[activeKey] ?? activeKey;
  const activeRef = useRef(activeKey);
  activeRef.current = activeKey;
  const [drafts, setDrafts] = useState<Record<string, ChatDraft>>({});
  const draftsRef = useRef(drafts);
  const uploads = useRef(new Map<string, AbortController>());
  const [recovery, setRecovery] = useState<{
    key: string;
    thread?: string;
    turn?: string;
    message: string;
    fileIds: string[];
    startedAt: number;
  } | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [live, setLive] = useState<Record<string, AgentMessage[]>>({});
  const [localThreads, setLocalThreads] = useState<
    Record<string, AgentConversation>
  >({});
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditWarning, setCreditWarning] = useState(false);
  const running = useRef<Running | null>(null);
  const mounted = useRef(true);
  const history = useAgentHistory(
    business,
    threadId,
    options.tag,
    options.enabled ?? true,
    localThreads[threadId ?? ""] ? threadId! : options.confirmedThread,
  );
  const conversations = useMemo(() => {
    const all = new Map<string, AgentConversation>();
    for (const t of history.threads.data?.pages.flatMap((p) => p.threads) ?? [])
      if (t.tag === options.tag)
        all.set(t.thread_id, {
          id: t.thread_id,
          title: t.title ?? "New chat",
          updatedAt: Date.parse(t.updated_at),
        });
    for (const t of Object.values(localThreads))
      all.set(t.id, { ...all.get(t.id), ...t });
    return [...all.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [history.threads.data, localThreads, options.tag]);
  const conversation = conversations.find((c) => c.id === activeKey);
  const draft = drafts[activeKey] ?? emptyDraft();
  const messages = useMemo(
    () => mergeMessages(history.hydrated, live[activeKey] ?? []),
    [history.hydrated, live, activeKey],
  );
  const knownThread = !threadId || history.threadAllowed;
  // A deep link may point beyond the first thread page; keep paging until it appears.
  useEffect(() => {
    if (
      threadId &&
      !knownThread &&
      history.threads.hasNextPage &&
      !history.threads.isFetching &&
      !history.threads.isError
    )
      void history.threads.fetchNextPage();
  }, [
    threadId,
    knownThread,
    history.threads.hasNextPage,
    history.threads.isFetching,
    history.threads.isError,
    history.threads.fetchNextPage,
  ]);
  const updateDraftAt = useCallback(
    (key: string, update: (draft: ChatDraft) => ChatDraft) => {
      if (!mounted.current) return;
      const next = {
        ...draftsRef.current,
        [key]: update(draftsRef.current[key] ?? emptyDraft()),
      };
      draftsRef.current = next;
      setDrafts(next);
    },
    [],
  );
  const updateDraft = (patch: Partial<ChatDraft>) =>
    updateDraftAt(activeKey, (value) => ({ ...value, ...patch }));
  const newChat = () => {
    const key = `draft:${crypto.randomUUID()}`;
    setDraftId(key);
    activeRef.current = key;
    changeThread(null);
    setError(null);
    return key;
  };
  const selectChat = (id: string) => {
    activeRef.current = id;
    changeThread(id);
    setError(null);
  };
  const upload = async (key: string, item: PendingAttachment) => {
    const controller = new AbortController();
    uploads.current.set(item.id, controller);
    const patch = (changes: Partial<PendingAttachment>) =>
      updateDraftAt(key, (value) => ({
        ...value,
        attachments: value.attachments.map((file) =>
          file.id === item.id ? { ...file, ...changes } : file,
        ),
      }));
    patch({ status: "uploading", error: undefined });
    try {
      const attachment = await uploadAgentFile(
        business,
        item.file,
        controller.signal,
        () => patch({ status: "finalizing" }),
      );
      if (!controller.signal.aborted) patch({ status: "ready", attachment });
    } catch (error) {
      if (!controller.signal.aborted)
        patch({ status: "error", error: uploadErrorMessage(error) });
    } finally {
      uploads.current.delete(item.id);
    }
  };
  const addFiles = (files: File[]) => {
    if (running.current || recovery) return;
    try {
      validateAgentFiles(
        files,
        draftsRef.current[activeKey]?.attachments.length ?? 0,
      );
    } catch (error) {
      setError(uploadErrorMessage(error));
      return;
    }
    const items = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "uploading" as const,
    }));
    updateDraftAt(activeKey, (value) => ({
      ...value,
      attachments: [...value.attachments, ...items],
    }));
    for (const item of items) void upload(activeKey, item);
  };
  const removeFile = (id: string) => {
    uploads.current.get(id)?.abort();
    updateDraftAt(activeKey, (value) => ({
      ...value,
      attachments: value.attachments.filter((file) => file.id !== id),
    }));
  };
  const retryFile = (id: string) => {
    const item = draftsRef.current[activeKey]?.attachments.find(
      (file) => file.id === id,
    );
    if (item?.status === "error" && !running.current)
      void upload(activeKey, item);
  };
  const requestStop = useCallback(
    async (run: Running) => {
      if (run.cancelSent) return;
      if (!run.thread || !run.turn) {
        run.stopRequested = true;
        return;
      }
      run.cancelSent = true;
      try {
        await cancelTurn(business, run.thread, run.turn);
      } catch (error) {
        run.cancelSent = false;
        throw error;
      }
    },
    [business],
  );
  const stop = async () => {
    const run = running.current;
    if (!run || stopping) return;
    setStopping(true);
    setError(null);
    try {
      await requestStop(run);
    } catch (e) {
      setError(`Could not stop the response. ${errorMessage(e)}`);
      setStopping(false);
    }
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const controller of uploads.current.values()) controller.abort();
      const run = running.current;
      if (run)
        void requestStop(run)
          .catch(() => {})
          .finally(() => run.controller.abort());
    };
  }, [requestStop]);

  const send = async (
    message?: string,
    sendOptions?: { omitView?: boolean },
  ) => {
    if (
      running.current ||
      !business ||
      !knownThread ||
      options.enabled === false ||
      recovery
    )
      return;
    const originalDraft = draftsRef.current[activeKey] ?? emptyDraft();
    let request: ChatRequest;
    try {
      if (!attachmentsReady(originalDraft.attachments))
        throw new Error(
          "Wait for your files to finish, or remove failed uploads.",
        );
      request =
        optionsRef.current.buildRequest?.(
          message ?? originalDraft.input,
          sendOptions,
        ) ??
        buildChatRequest({
          agentId: optionsRef.current.agentId,
          threadId: threadId,
          message: message ?? originalDraft.input,
        });
      request = {
        ...request,
        agent_id: optionsRef.current.agentId,
        ...(originalDraft.attachments.length
          ? {
              attachments: originalDraft.attachments.map(
                (file) => file.attachment!.file_id,
              ),
            }
          : {}),
      };
    } catch (e) {
      setError(errorMessage(e));
      return;
    }
    const requestKey = activeKey;
    const run: Running = {
      key: requestKey,
      thread: threadId ?? undefined,
      controller: new AbortController(),
      stopRequested: false,
      cancelSent: false,
    };
    running.current = run;
    setRunningKey(run.key);
    setError(null);
    setStopping(false);
    const now = Date.now();
    let user: AgentMessage = {
      id: `pending:${now}-user`,
      presentationId: `pending:${now}-user`,
      role: "user",
      content: request.message,
      createdAt: now,
      view: request.metadata?.view,
      attachments: originalDraft.attachments.map((file) => file.attachment!),
    };
    let assistant: AgentMessage = {
      id: `pending:${now}-assistant`,
      presentationId: `pending:${now}-assistant`,
      role: "assistant",
      content: "",
      createdAt: now + 1,
      activity: [],
    };
    setLive((prev) => ({
      ...prev,
      [run.key]: [...(prev[run.key] ?? []), user, assistant],
    }));
    updateDraftAt(run.key, (value) => ({
      ...value,
      input: "",
      attachments: [],
    }));
    // Publish accumulated text at a bounded cadence without replaying tokens.
    const publish = () => {
      if (!mounted.current) return;
      const snapshot = assistant;
      setLive((prev) => ({
        ...prev,
        [run.key]: [...(prev[run.key] ?? []).slice(0, -2), user, snapshot],
      }));
    };
    const publisher = createStreamPublisher(publish);
    let terminal = false;
    let rejected = false;
    let interrupted = false;
    let streamStarted = false;
    let creditsInvalidated = false;
    try {
      const body = await startChatStream(
        business,
        request,
        run.controller.signal,
      );
      streamStarted = true;
      for await (const event of parseAgentStream(body)) {
        if (running.current !== run) break;
        const previous = assistant;
        const previousUser = user;
        if (event.type === "thread_meta") {
          run.thread = event.thread_id;
          run.turn = event.turn_id;
          user = {
            ...user,
            turnId: event.turn_id,
            id: `${event.turn_id}-user`,
          };
          if (run.key !== event.thread_id) {
            const oldKey = run.key;
            run.key = event.thread_id;
            setPresentationKeys((prev) => ({
              ...prev,
              [run.key]: prev[oldKey] ?? oldKey,
            }));
            setLive((prev) => {
              const next = { ...prev, [run.key]: prev[oldKey] ?? [] };
              delete next[oldKey];
              return next;
            });
            updateDraftAt(
              run.key,
              () => draftsRef.current[oldKey] ?? emptyDraft(),
            );
            if (activeRef.current === oldKey) {
              activeRef.current = run.key;
              changeThread(run.key, oldKey);
            }
            setRunningKey(run.key);
          }
          setLocalThreads((prev) => ({
            ...prev,
            [run.key]: {
              id: run.key,
              title:
                event.title ??
                (event.is_new
                  ? request.message.slice(0, 80)
                  : conversation?.title) ??
                "New chat",
              updatedAt: now,
            },
          }));
          if (run.stopRequested)
            void requestStop(run).catch((e) => {
              if (mounted.current) {
                setError(errorMessage(e));
                setStopping(false);
              }
            });
        }
        if (event.type === "thread_title")
          setLocalThreads((prev) => ({
            ...prev,
            [event.thread_id]: {
              ...prev[event.thread_id],
              id: event.thread_id,
              title: event.title,
              updatedAt: now,
            },
          }));
        if (event.type === "error" && (event.depth ?? 0) === 0) {
          rejected = !run.turn;
          const friendly = streamErrorMessage(event.code, event.message);
          assistant = reduceAgentEvent(assistant, {
            ...event,
            message: friendly,
          });
          setError(friendly);
        } else {
          assistant = reduceAgentEvent(assistant, event);
        }
        if (event.type === "turn_end" && (event.depth ?? 0) === 0) {
          terminal = true;
          setCreditWarning(event.credit_warning === true);
          const balance = event.credit_balance;
          if (typeof balance === "number" && Number.isFinite(balance)) {
            queryClient.setQueryData<AgentCreditsResponse>(
              agentKeys.credits(business),
              (current) =>
                current ? { ...current, balance_usd: balance } : current,
            );
          }
          creditsInvalidated = true;
          void queryClient.invalidateQueries({
            queryKey: agentKeys.credits(business),
          });
          optionsRef.current.onTurnEnd?.(assistant, run.key);
        }
        if (assistant !== previous || user !== previousUser) {
          publisher.schedule(
            (!previous.content && !!assistant.content) ||
              ["message_complete", "cancelled", "error", "turn_end"].includes(
                event.type,
              ),
          );
        }
      }
      if (!terminal && !rejected) {
        throw new Error(
          "The connection ended before the response finished. Your partial response is saved; reload this chat before retrying.",
        );
      }
    } catch (e) {
      if (!mounted.current) return;
      rejected = e instanceof AgentAPIError;
      interrupted = !rejected;
      const detail = errorMessage(e);
      assistant = {
        ...assistant,
        status: "error",
        partial: !!assistant.content,
        error: detail,
      };
      setError(detail);
      if (run.thread && run.turn) await requestStop(run).catch(() => {});
    } finally {
      publisher.schedule(true);
      publisher.cancel();
      run.controller.abort();
      if (streamStarted && !creditsInvalidated)
        void queryClient.invalidateQueries({
          queryKey: agentKeys.credits(business),
        });
      if (mounted.current) {
        if (rejected) {
          setLive((prev) => ({
            ...prev,
            [run.key]: (prev[run.key] ?? []).filter(
              (item) => item.id !== user.id && item.id !== assistant.id,
            ),
          }));
          updateDraftAt(run.key, (value) => ({
            ...value,
            input: value.input || originalDraft.input || request.message,
            attachments: originalDraft.attachments,
          }));
        }
        if (interrupted)
          setRecovery({
            key: run.key,
            thread: run.thread,
            turn: run.turn,
            message: request.message,
            fileIds: request.attachments ?? [],
            startedAt: now,
          });
        void queryClient.invalidateQueries({
          queryKey: agentKeys.threads(business, [optionsRef.current.tag]),
        });
        if (run.thread)
          void queryClient.invalidateQueries({
            queryKey: agentKeys.messages(business, run.thread),
          });
        try {
          await optionsRef.current.onSettled?.();
        } catch (error) {
          if (mounted.current)
            setError(`Refreshing failed. ${errorMessage(error)}`);
        }
        if (mounted.current) {
          setRunningKey(null);
          setStopping(false);
        }
      }
      if (running.current === run) running.current = null;
    }
  };
  const reconcile = async () => {
    if (!recovery || reconciling) return;
    setReconciling(true);
    try {
      const thread =
        recovery.thread ??
        (await getLatestThread(business, options.tag))?.thread_id;
      if (!thread) {
        setError(
          "The server has not confirmed whether your message was accepted. Check again or reload before retrying.",
        );
        return;
      }
      const page = await getMessages(business, thread);
      if (!mounted.current) return;
      const turn =
        recovery.turn ??
        findAcceptedTurn(
          page.items,
          recovery.message,
          recovery.fileIds,
          recovery.startedAt,
        );
      const assistant = page.items.find(
        (item) =>
          "turn_id" in item &&
          item.turn_id === turn &&
          item.role === "assistant",
      );
      if (
        !assistant ||
        !("status" in assistant) ||
        !["complete", "cancelled", "error"].includes(assistant.status)
      ) {
        setError(
          "The server has not confirmed this response finished. Check again before continuing.",
        );
        return;
      }
      if (!recovery.thread) {
        setLocalThreads((prev) => ({
          ...prev,
          [thread]: {
            id: thread,
            title: recovery.message.slice(0, 80),
            updatedAt: recovery.startedAt,
          },
        }));
        updateDraftAt(
          thread,
          () => draftsRef.current[recovery.key] ?? emptyDraft(),
        );
        changeThread(thread, recovery.key);
      }
      await queryClient.invalidateQueries({
        queryKey: agentKeys.messages(business, thread),
      });
      await optionsRef.current.onSettled?.();
      if (mounted.current) {
        setLive((prev) => ({ ...prev, [recovery.key]: [] }));
        setRecovery(null);
        setError(null);
      }
    } catch (error) {
      if (mounted.current) setError(errorMessage(error));
    } finally {
      if (mounted.current) setReconciling(false);
    }
  };

  return {
    activeKey,
    presentationKey,
    conversation,
    conversations,
    draft,
    messages,
    history,
    runningKey,
    hasPendingUploads: Object.values(drafts).some((draft) =>
      draft.attachments.some(
        (file) => file.status === "uploading" || file.status === "finalizing",
      ),
    ),
    stopping,
    error,
    creditWarning,
    knownThread,
    setError,
    updateDraft,
    newChat,
    selectChat,
    send,
    stop,
    addFiles,
    removeFile,
    retryFile,
    recovery,
    reconciling,
    reconcile,
    updateTitle: (id: string, title: string) =>
      setLocalThreads((prev) => ({
        ...prev,
        [id]: { ...conversations.find((c) => c.id === id)!, title },
      })),
  };
}
