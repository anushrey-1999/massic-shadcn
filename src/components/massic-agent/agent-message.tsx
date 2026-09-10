"use client";
import { useState } from "react";
import { Check, Copy, Loader2, ChevronDown, ChevronRight, CircleAlert, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { MassicLoader } from "@/components/ui/massic-loader";
import { renderLightMarkdown } from "@/components/chatbot/markdown";
import { SourceFavicon } from "@/components/molecules/analytics/SourceFavicon";
import { cleanContent, intentLabel, resourceSurface, SURFACES } from "./agent-model";
import { SurfaceIcon } from "./agent-icons";
import type { AgentMessage, CitationDocument, ResourceRef } from "./types";

function CitationChip({ number, document }: { number: number; document?: CitationDocument }) {
  const segment = document?.segments.find(s => s.references?.some(r => r.ref_id === number));
  const reference = segment?.references.find(r => r.ref_id === number);
  if (!reference) return <sup className="px-0.5 text-muted-foreground" title="Source detail unavailable">{number}</sup>;
  const sources = segment?.sources.filter(s => reference.source_ids?.includes(s.source_id)) ?? [];
  return <Popover><PopoverTrigger asChild><button className="mx-0.5 inline-flex h-5 min-w-5 cursor-pointer items-center justify-center rounded bg-general-primary/10 px-1 align-super text-[10px] text-general-primary transition-[background-color,box-shadow] hover:bg-general-primary/15 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30" aria-label={`Open reference ${number}`}>{number}</button></PopoverTrigger>
    <PopoverContent className="max-h-80 w-80 overflow-y-auto break-words text-sm"><p className="font-medium">{reference.label ?? `Reference ${number}`}</p><p className="mt-2 whitespace-pre-wrap text-muted-foreground">{reference.detail}</p>{sources.length > 0 && <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">{sources.map(s => <li key={s.source_id}>{s.url && /^https?:\/\//.test(s.url) ? <a href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md p-1.5 text-general-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30"><SourceFavicon sourceName={s.url} /><span className="min-w-0 flex-1 truncate">{s.label ?? s.source_type ?? s.url}</span><ExternalLink className="size-3 shrink-0" aria-hidden="true" /></a> : <span className="flex items-center gap-2 rounded-md p-1.5"><SourceFavicon sourceName={s.label ?? s.source_type ?? ""} /><span>{s.label ?? s.source_type}</span></span>}</li>)}</ul>}</PopoverContent>
  </Popover>;
}

function AgentExternalLink({ href, label }: { href: string; label: string }) {
  return <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded px-0.5 text-general-primary underline decoration-general-primary/40 underline-offset-2 transition-colors hover:bg-general-primary/5 hover:decoration-general-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30"><SourceFavicon sourceName={href} className="size-3" />{label}</a>;
}
export function AgentMessageView({ message, streaming, onOpenPlan }: { message: AgentMessage; streaming: boolean; onOpenPlan: (resource: ResourceRef) => void }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const content = cleanContent(message.content, message.role);
  const copy = async () => { try { await navigator.clipboard.writeText(content); setCopied(true); setCopyError(false); } catch { setCopyError(true); } };
  if (message.role === "user") return <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-sm leading-relaxed">
    {message.intent && <p className="mb-1 text-xs text-muted-foreground">{intentLabel(message.intent.kind)}</p>}
    <p className="whitespace-pre-wrap break-words">{content}</p>
    {message.view?.resource && <p className="mt-2 text-xs text-muted-foreground">Plan #{message.view.resource.id} · {message.view.selected_item_ids?.length ?? 0} selected</p>}
  </div></div>;
  const activity = message.activity ?? [];
  const latest = activity.findLast(s => s.status === "running");
  return <article className="flex min-w-0 flex-col gap-3">
    {(activity.length > 0 || streaming) && <details className="group w-fit max-w-full text-sm"><summary className="flex w-fit max-w-full cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-[background-color,box-shadow,color] hover:bg-muted hover:text-foreground hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30">{streaming ? <MassicLoader size={18} animate /> : <Check className="h-3.5 w-3.5" />}<span className="truncate" role="status">{streaming ? latest?.label ?? "Thinking…" : "Thinking"}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" /></summary>
      <ol className="mt-2 space-y-3 rounded-lg border border-border bg-muted/20 p-3 shadow-sm">{activity.map(step => <li key={step.id} className="text-xs" style={{ marginLeft: Math.min(step.depth, 2) * 12 }}><div className="flex items-center gap-2">{step.status === "running" && streaming ? <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" /> : step.status === "error" ? <CircleAlert className="h-3 w-3 text-destructive" /> : <Check className="h-3 w-3 text-muted-foreground" />}<span>{step.label}</span></div>{step.detail && <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{step.detail}</p>}</li>)}</ol>
    </details>}
    {message.intent?.kind.startsWith("activate") && <p className="text-xs text-muted-foreground">{intentLabel(message.intent.kind)}</p>}
    {content && <div className="break-words text-[15px] leading-6 [&_p]:my-2 [&_p:first-child]:mt-0 [&_h1]:mt-4 [&_h1]:text-xl [&_h2]:mt-4 [&_h2]:text-lg [&_h3]:mt-3 [&_h3]:font-medium [&_strong]:font-medium [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-general-primary [&_a]:underline [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_code]:text-sm [&_blockquote]:border-l-2 [&_blockquote]:pl-4">
      {renderLightMarkdown(content, [
        { re: /\[ref:(\d+)\]/, wrap: m => <CitationChip number={Number(m[1])} document={message.citations} /> },
        { re: /\[(.+?)\]\((https?:[^\s)]+)\)/, wrap: m => <AgentExternalLink href={m[2]} label={m[1]} /> },
        { re: /https?:\/\/[^\s<>()]+/, wrap: m => <AgentExternalLink href={m[0]} label={m[0]} /> },
      ])}
    </div>}
    {message.partial && <p className="text-xs text-muted-foreground">{message.status === "cancelled" ? "Response stopped" : "Partial response"}</p>}
    {message.status === "error" && <p role="alert" className="rounded-md bg-destructive/5 p-3 text-sm text-destructive">{message.error ?? "This response could not be completed. Try again when the service is available."}</p>}
    {message.widgetParts?.map(part => <button key={`${part.resource.type}:${part.resource.id}`} onClick={() => onOpenPlan(part.resource)} className="group/plan flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-[background-color,border-color,box-shadow] hover:border-general-primary/25 hover:bg-general-primary/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary/30"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-general-primary/10 text-general-primary"><SurfaceIcon surface={resourceSurface(part.resource.type)} className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{SURFACES[resourceSurface(part.resource.type)].label} plan #{part.resource.id}</span><span className="text-xs text-muted-foreground">View plan and select items to refine</span></span><span className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] group-hover/plan:translate-x-0.5 group-hover/plan:bg-general-primary/10 group-hover/plan:text-general-primary"><ChevronRight className="size-4" aria-hidden="true" /></span></button>)}
    {!streaming && content && <div><Button variant="ghost" size="icon-sm" onClick={copy} aria-label={copied ? "Copied" : "Copy response"}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</Button>{copyError && <span role="status" className="text-xs text-destructive">Could not copy. Select the text to copy it.</span>}</div>}
  </article>;
}
