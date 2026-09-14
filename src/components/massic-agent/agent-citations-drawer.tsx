"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Ellipsis, ExternalLink, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { getMessages, getCitations } from "./agent-api";
import { hydrateMessage } from "./agent-model";
import { citationEntries, citationMessages, readableLabel, responseExcerpt, sourceLabel, sourceUrl } from "./agent-citations";
import type { AgentMessage, CitationSource } from "./types";
import styles from "./agent.module.css";

export function CitationSources({ sources }: { sources: CitationSource[] }) {
  return <ul className="space-y-2">{sources.map(source => {
    const url = sourceUrl(source);
    return <li key={source.source_id} className="min-w-0 text-xs text-muted-foreground">{url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-start gap-1.5 rounded text-general-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30"><span className="min-w-0 break-words [overflow-wrap:anywhere]">{sourceLabel(source)}</span><ExternalLink className="mt-0.5 size-3 shrink-0" /></a> : <span className="break-words">{sourceLabel(source)}</span>}</li>;
  })}</ul>;
}
export function AgentCitationsDrawer({ business, thread, title, messages, streaming }: { business: string; thread: string; title: string; messages: AgentMessage[]; streaming: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const history = useInfiniteQuery({
    queryKey: ["massic-agent", business, "all-citations", thread],
    enabled: open && !thread.startsWith("draft:"),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const page = await getMessages(business, thread, pageParam, signal);
      if (page.has_more && (!page.next_cursor || page.next_cursor === pageParam)) throw new Error("Citation history could not be fully loaded.");
      const turns = page.turns.filter(turn => turn.role === "assistant");
      const documents = await getCitations(business, thread, turns.map(turn => turn.turn_id), signal);
      return { ...page, messages: turns.map(turn => ({ ...hydrateMessage(turn), citations: documents[turn.turn_id] ?? undefined })) };
    },
    getNextPageParam: (page, pages, cursor, cursors) => page.has_more && page.next_cursor && page.next_cursor !== cursor && !cursors.includes(page.next_cursor) ? page.next_cursor : undefined,
    retry: false,
  });
  useEffect(() => {
    if (open && history.hasNextPage && !history.isFetching && !history.isError) void history.fetchNextPage();
  }, [open, history.hasNextPage, history.isFetching, history.isError, history.fetchNextPage]);
  const entries = useMemo(() => open ? citationMessages([...(history.data?.pages.flatMap(page => page.messages) ?? []), ...messages]) : [], [open, history.data, messages]);
  const loading = !thread.startsWith("draft:") && (history.isFetching || (!history.isError && (history.isPending || history.hasNextPage)));
  const count = entries.reduce((sum, message) => sum + citationEntries(message.citations!).references.length, 0);
  return <>
    <DropdownMenu><DropdownMenuTrigger asChild><Button ref={trigger} variant="ghost" size="icon-sm" aria-label="Chat options" className="absolute right-3 top-2 z-10 bg-background/90"><Ellipsis className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" onCloseAutoFocus={event => { if (open) event.preventDefault(); }}><DropdownMenuItem className="gap-2" onSelect={() => setOpen(true)}><BookOpen className="size-4 shrink-0" /><span>View citations</span></DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent className={styles.citationsDrawer} overlayClassName={styles.citationsOverlay} onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}>
      <SheetHeader className="shrink-0 border-b pr-12"><SheetTitle className="font-medium">Citations</SheetTitle><SheetDescription className="break-words">{title}</SheetDescription>{!loading && !history.isError && entries.length > 0 && <p className="text-xs text-muted-foreground">{count} {count === 1 ? "citation" : "citations"}</p>}</SheetHeader>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-6">
        {entries.map(message => { const document = message.citations!; const { references, additional } = citationEntries(document); return <section key={document.turn_id} className="space-y-4 border-b pb-5 last:border-0">
          <h3 className="text-sm font-medium leading-5">{responseExcerpt(message.content)}</h3>
          {references.map(({ key, reference, sources }) => <div key={key} className="space-y-2 text-sm"><h4 className="font-medium">{reference.ref_id}. {readableLabel(reference.label, "Citation")}</h4><p className="whitespace-pre-wrap break-words text-muted-foreground">{readableLabel(reference.detail, "Citation details unavailable")}</p><CitationSources sources={sources} /></div>)}
          {additional.length > 0 && <div className="space-y-2"><h4 className="text-xs font-medium">Additional sources</h4><CitationSources sources={additional} /></div>}
        </section>; })}
        {loading && <p role="status" className="text-sm text-muted-foreground">Loading remaining citations…</p>}
        {history.isError && <div role="alert" className="space-y-2 text-sm"><p>Some citations could not be loaded.</p><Button variant="outline" size="sm" onClick={() => history.isFetchNextPageError ? history.fetchNextPage() : history.refetch()}>Retry</Button></div>}
        {!entries.length && !loading && !history.isError && <p className="text-sm text-muted-foreground">{streaming ? "Citations will appear here if this response includes sources." : "No citations in this chat yet."}</p>}
      </div>
    </SheetContent></Sheet>
  </>;
}
