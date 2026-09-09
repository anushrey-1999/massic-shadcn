"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { agentKeys, getCitations, getMessages, getThreads } from "./agent-api";
import { hydrateMessage } from "./agent-model";

export function useAgentHistory(business: string, thread: string | null) {
  const threads = useInfiniteQuery({
    queryKey: agentKeys.threads(business), enabled: !!business, initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => getThreads(business, pageParam, signal),
    getNextPageParam: (last, pages) => last.threads.length === 20 ? pages.reduce((n, p) => n + p.threads.length, 0) : undefined,
    retry: false,
  });
  const messages = useInfiniteQuery({
    queryKey: agentKeys.messages(business, thread ?? ""), enabled: !!business && !!thread && !thread.startsWith("draft:"),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => getMessages(business, thread!, pageParam, signal),
    getNextPageParam: last => last.has_more && last.next_cursor ? last.next_cursor : undefined,
    retry: false,
  });
  const hydrated = (messages.data?.pages ?? []).flatMap(p => p.turns).map(hydrateMessage);
  const ids = [...new Set(hydrated.filter(m => m.role === "assistant").map(m => m.turnId!))].sort();
  const citations = useQuery({
    queryKey: agentKeys.citations(business, thread ?? "", ids), enabled: !!thread && ids.length > 0,
    queryFn: ({ signal }) => getCitations(business, thread!, ids, signal), retry: false, staleTime: Infinity,
  });
  return { threads, messages, citations, hydrated: hydrated.map(m => ({ ...m, citations: citations.data?.[m.turnId!] ?? undefined })) };
}
