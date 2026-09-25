"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, ChevronDown, ChevronRight, CircleAlert, CircleCheckBig, ClockFading, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { citationEntries, readableLabel } from "./agent-citations";
import { CitationSources } from "./agent-citations-drawer";
import styles from "./agent.module.css";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { renderLightMarkdown } from "@/components/chatbot/markdown";
import { SourceFavicon } from "@/components/molecules/analytics/SourceFavicon";
import { cn } from "@/lib/utils";
import { cleanContent, resourceSurface, SURFACES } from "./agent-model";
import type { AgentMessage, CitationDocument, ResourceRef } from "./types";

function CitationChip({ number, document }: { number: number; document?: CitationDocument }) {
  const entry = document ? citationEntries(document).references.find(entry => entry.reference.ref_id === number) : undefined;
  return <Popover><PopoverTrigger asChild><button className="mx-0.5 inline-flex size-4 cursor-pointer items-center justify-center rounded bg-secondary align-super font-mono text-[10px] text-general-muted-foreground transition-colors hover:bg-general-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30" aria-label={`Open reference ${number}`}>{number}</button></PopoverTrigger>
    <PopoverContent className="max-h-80 w-80 space-y-2 overflow-y-auto break-words text-sm"><p className="font-medium">{readableLabel(entry?.reference.label, `Reference ${number}`)}</p><p className="whitespace-pre-wrap text-muted-foreground">{readableLabel(entry?.reference.detail, "Citation details unavailable")}</p>{entry && <CitationSources sources={entry.sources} />}</PopoverContent>
  </Popover>;
}

function AgentExternalLink({ href, label }: { href: string; label: string }) {
  return <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded px-0.5 text-general-primary underline decoration-general-primary/40 underline-offset-2 transition-colors hover:bg-general-primary/5 hover:decoration-general-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30"><SourceFavicon sourceName={href} className="size-3" />{label}</a>;
}
export const AgentMessageView = memo(function AgentMessageView({ message, streaming, activeResource, onOpenPlan }: { message: AgentMessage; streaming: boolean; activeResource: ResourceRef | null; onOpenPlan: (resource: ResourceRef) => void }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const content = cleanContent(message.content, message.role);
  const markdown = useMemo(() => message.role === "user" ? null : renderLightMarkdown(content, [
    { re: /\[ref:(\d+)\]/, wrap: m => <CitationChip number={Number(m[1])} document={message.citations} /> },
    { re: /\[(.+?)\]\((https?:[^\s)]+)\)/, wrap: m => <AgentExternalLink href={m[2]} label={m[1]} /> },
    { re: /https?:\/\/[^\s<>()]+/, wrap: m => <AgentExternalLink href={m[0]} label={m[0]} /> },
  ]), [content, message.citations, message.role]);
  useEffect(() => () => {
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
  }, []);
  const copy = async () => { try {
    await navigator.clipboard.writeText(content);
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    setCopied(true);
    setCopyError(false);
    copyResetTimer.current = setTimeout(() => {
      setCopied(false);
      copyResetTimer.current = null;
    }, 1500);
  } catch { setCopyError(true); } };
  if (message.role === "user") return <div className="flex justify-end pl-16"><div className="max-w-[78%] rounded-2xl bg-secondary px-4 py-2.5 text-left text-sm leading-[1.5] tracking-[0.18px] text-general-foreground">
    <p className="whitespace-pre-wrap break-words">{content}</p>
    {message.view?.resource && <p className="mt-2 text-[10px] text-general-muted-foreground">Plan #{message.view.resource.id} · {message.view.selected_item_ids?.length ?? 0} selected</p>}
  </div></div>;
  const activity = (message.activity ?? []).filter(step => step.label.trim());
  const latest = activity.findLast(s => s.status === "running");
  const visibleActivity = showAllActivity ? activity : activity.slice(0, 3);
  const hasHiddenActivity = activity.length > visibleActivity.length;
  return <article className="flex min-w-0 flex-col gap-3">
    {(activity.length > 0 || streaming) && <Collapsible className="group w-full"><CollapsibleTrigger disabled={!activity.length} className="flex h-6 w-fit max-w-full cursor-pointer list-none items-center gap-2.5 text-xs leading-[1.5] tracking-[0.18px] text-general-muted-foreground transition-colors hover:text-general-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30 disabled:cursor-default disabled:hover:text-general-muted-foreground">{streaming && <MassicAmoebaLoader size={18} label={null} className="-translate-y-px" />}<span className={cn("truncate", streaming && styles.thinkingShimmer)} role="status">{streaming ? latest?.label ?? "Thinking…" : "Show thought process"}</span>{activity.length > 0 && <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" aria-hidden="true" />}</CollapsibleTrigger><CollapsibleContent className={styles.thinkingContent}>
      <div className="mt-2 flex flex-col gap-0.5">
        <ol>
          {visibleActivity.map(step => <li key={step.id} className="flex items-stretch gap-2 text-[10px] leading-[1.5] tracking-[0.15px] text-general-muted-foreground">
            <span className="flex w-[23px] shrink-0 flex-col items-center">
              {step.status === "error" ? <CircleAlert className="size-3.5 shrink-0 text-destructive" /> : <ClockFading className={cn("size-3.5 shrink-0", step.status === "running" && streaming && "animate-pulse motion-reduce:animate-none")} />}
              <span className="min-h-3 w-px flex-1 bg-general-border" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 pb-2">
              <span className="block break-words">{step.label}</span>
              {step.detail && <span className="mt-0.5 block whitespace-pre-wrap break-words">{step.detail}</span>}
            </span>
          </li>)}
        </ol>
        {hasHiddenActivity && <button type="button" className="w-fit cursor-pointer text-[10px] font-medium leading-[1.5] tracking-[0.15px] text-general-muted-foreground transition-colors hover:text-general-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30" onClick={() => setShowAllActivity(true)}>Show more</button>}
        {showAllActivity && activity.length > 3 && <button type="button" className="w-fit cursor-pointer text-[10px] font-medium leading-[1.5] tracking-[0.15px] text-general-muted-foreground transition-colors hover:text-general-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30" onClick={() => setShowAllActivity(false)}>Show less</button>}
        {!streaming && <div className="flex items-end gap-2 text-[10px] leading-[1.5] tracking-[0.15px] text-general-muted-foreground"><span className="flex w-[23px] shrink-0 flex-col items-center"><span className="h-[17px] w-px bg-general-border" aria-hidden="true" /><CircleCheckBig className="size-3.5 shrink-0" /></span><span>Done</span></div>}
      </div>
    </CollapsibleContent></Collapsible>}
    {content && <div className={cn("break-words text-sm leading-[1.5] tracking-[0.18px] text-general-foreground", styles.markdown)}>
      {markdown}
    </div>}
    {message.partial && <p className="text-xs text-muted-foreground">{message.status === "cancelled" ? "Response stopped" : "Partial response"}</p>}
    {message.status === "error" && <p role="alert" className="rounded-md bg-destructive/5 p-3 text-sm text-destructive">{message.error ?? "This response could not be completed. Try again when the service is available."}</p>}
    {message.widgetParts?.map(part => {
      const isOpen = activeResource?.type === part.resource.type && String(activeResource.id) === String(part.resource.id);
      return <button key={`${part.resource.type}:${part.resource.id}`} type="button" aria-pressed={isOpen} data-state={isOpen ? "open" : "closed"} onClick={() => onOpenPlan(part.resource)} className={cn("group/plan flex w-full cursor-pointer items-center gap-2.5 rounded-lg border bg-general-primary-foreground p-2 text-left shadow-sm transition-[background-color,border-color,box-shadow] [transition-duration:160ms] ease-out hover:border-general-primary/25 hover:bg-general-primary/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30 motion-reduce:transition-none", isOpen ? "border-general-primary/30 bg-general-primary/5 shadow-sm" : "border-general-border")}><Map className={cn("size-6 shrink-0 text-general-border-three transition-colors [transition-duration:160ms] motion-reduce:transition-none", isOpen && "text-general-primary")} aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium leading-[1.5] tracking-[0.18px] text-general-secondary-foreground">{SURFACES[resourceSurface(part.resource.type)].label} plan #{part.resource.id}</span></span><span className={cn("flex size-6 shrink-0 items-center justify-center rounded border border-general-border-three bg-background transition-[background-color,border-color,color,transform] [transition-duration:160ms] ease-out motion-reduce:transition-none", isOpen ? "border-general-primary/30 bg-general-primary text-primary-foreground" : "text-general-foreground group-hover/plan:translate-x-0.5 group-hover/plan:border-general-primary/30 group-hover/plan:bg-general-primary group-hover/plan:text-primary-foreground")} aria-hidden="true"><ChevronRight className="size-[13.25px]" /></span></button>;
    })}
    {!streaming && content && <div className={styles.softReveal}><Button variant="ghost" size="icon-sm" className="size-6 text-general-muted-foreground hover:text-general-foreground" onClick={copy} aria-label={copied ? "Copied" : "Copy response"}>{copied ? <Check className="size-3" /> : <Copy className="size-3" />}</Button>{copyError && <span role="status" className="text-xs text-destructive">Could not copy. Select the text to copy it.</span>}</div>}
  </article>;
});
