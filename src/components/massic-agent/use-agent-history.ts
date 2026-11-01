"use client";
import { useMemo } from "react";
import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import {
  agentKeys,
  getCitations,
  getMessages,
  getThreads,
  getTurnTrace,
} from "./agent-api";
import { hydrateThreadItem } from "./agent-model";
import { activityFromTrace } from "./agent-stream-state";

export function useAgentHistory(
  business: string,
  thread: string | null,
  tag = "chat",
  enabled = true,
  confirmedThread?: string,
) {
  const threads = useInfiniteQuery({
    queryKey: agentKeys.threads(business, [tag]),
    enabled: !!business && enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      getThreads(business, pageParam, signal, [tag]),
    getNextPageParam: (last, pages) => {
      const offset = pages.reduce((n, page) => n + page.threads.length, 0);
      return last.threads.length && offset < last.total ? offset : undefined;
    },
    retry: false,
  });
  const threadAllowed =
    !!thread &&
    (confirmedThread === thread ||
      !!threads.data?.pages.some((page) =>
        page.threads.some(
          (item) => item.thread_id === thread && item.tag === tag,
        ),
      ));
  const messages = useInfiniteQuery({
    queryKey: agentKeys.messages(business, thread ?? ""),
    enabled:
      !!business && enabled && threadAllowed && !thread!.startsWith("draft:"),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      getMessages(business, thread!, pageParam, signal),
    getNextPageParam: (last) =>
      last.has_more && last.next_cursor ? last.next_cursor : undefined,
    retry: false,
  });
  const hydrated = useMemo(
    () =>
      threadAllowed
        ? [...(messages.data?.pages ?? []).flatMap((p) => p.items ?? [])]
            .reverse()
            .map(hydrateThreadItem)
        : [],
    [messages.data, threadAllowed],
  );
  const ids = [
    ...new Set(
      hydrated.flatMap((entry) =>
        entry.kind === "message" &&
        entry.message.role === "assistant" &&
        entry.message.turnId
          ? [entry.message.turnId]
          : [],
      ),
    ),
  ].sort();
  const citations = useQuery({
    queryKey: agentKeys.citations(business, thread ?? "", ids),
    enabled: enabled && threadAllowed && ids.length > 0,
    queryFn: ({ signal }) => getCitations(business, thread!, ids, signal),
    retry: false,
    staleTime: Infinity,
  });
  const traceTurns = hydrated.flatMap((entry) =>
    entry.kind === "message" &&
    entry.message.role === "assistant" &&
    entry.message.turnId &&
    entry.message.trace?.available
      ? [
          {
            turnId: entry.message.turnId,
            status: entry.message.status ?? "complete",
          },
        ]
      : [],
  );
  const traces = useQueries({
    queries: traceTurns.map((turn) => ({
      queryKey: agentKeys.trace(business, turn.turnId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getTurnTrace(business, turn.turnId, signal),
      retry: false,
      staleTime: Infinity,
      enabled: enabled && threadAllowed,
    })),
  });
  const activityByTurn = new Map(
    traceTurns.flatMap((turn, index) =>
      traces[index]?.data
        ? [
            [
              turn.turnId,
              activityFromTrace(traces[index].data.events ?? [], turn.status),
            ] as const,
          ]
        : [],
    ),
  );
  const withCitations = hydrated.map((entry) => {
    if (entry.kind !== "message") return entry;
    return {
      ...entry,
      message: {
        ...entry.message,
        citations: citations.data?.[entry.message.turnId!] ?? undefined,
        activity:
          activityByTurn.get(entry.message.turnId!) ?? entry.message.activity,
      },
    };
  });
  return {
    threads,
    messages,
    citations,
    hydrated: withCitations,
    threadAllowed,
  };
}
