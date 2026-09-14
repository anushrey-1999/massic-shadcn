import type { AgentMessage, CitationDocument, CitationSource } from "./types";

export function sourceUrl(source: CitationSource): string | undefined {
  try { const url = new URL(source.url ?? ""); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
const labels: Record<string, string> = {
  search_knowledge: "Strategy search", get_pages_details: "Page details", get_clusters_details: "Social campaign details",
  save_webpages_plan: "Content plan", save_social_channels_plan: "Social plan", tool_result: "Source", reasoning: "Supporting context",
};
export function readableLabel(value: string | undefined, fallback: string): string {
  if (!value?.trim() || /^(?:[\w-]+_src_\d+|[0-9a-f]{8}-[0-9a-f-]{27,})$/i.test(value.trim()) || /^[{[]/.test(value.trim())) return fallback;
  return labels[value] ?? value.replace(/_/g, " ");
}
export function sourceLabel(source: CitationSource): string {
  const url = sourceUrl(source);
  return readableLabel(source.label, url ? new URL(url).hostname : labels[source.tool_name ?? ""] ?? labels[source.source_type ?? ""] ?? "Source");
}
export function citationEntries(document: CitationDocument) {
  const sources = new Map<string, CitationSource>();
  for (const segment of document.segments ?? []) for (const source of segment.sources ?? []) sources.set(source.source_id, source);
  const used = new Set<string>();
  const seen = new Set<string>();
  const references = (document.segments ?? []).flatMap(segment => (segment.references ?? []).flatMap(reference => {
    const key = `${segment.agent_scope}:${reference.ref_id}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const resolved = [...new Set(reference.source_ids ?? [])].flatMap(id => { used.add(id); return [sources.get(id) ?? { source_id: id, label: "Source unavailable" }]; });
    return [{ key, reference, sources: resolved }];
  }));
  return { references, additional: [...sources.values()].filter(source => !used.has(source.source_id)) };
}
export function citationMessages(messages: AgentMessage[]) {
  const byTurn = new Map<string, AgentMessage>();
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const numbers = [...new Set([...message.content.matchAll(/\[ref:(\d+)\]/g)].map(match => Number(match[1])))];
    const document = message.citations ?? (numbers.length ? { thread_id: "", turn_id: message.turnId ?? message.id, version: -1, segments: [{ agent_scope: "unavailable", sources: [], references: numbers.map(ref_id => ({ ref_id })) }] } : undefined);
    if (!document) continue;
    const candidate = message.citations ? message : { ...message, citations: document };
    const key = document.turn_id;
    const previous = byTurn.get(key);
    if (!previous || (document.version ?? 0) >= (previous.citations?.version ?? 0)) byTurn.set(key, candidate);
  }
  return [...byTurn.values()].filter(message => { const entries = citationEntries(message.citations!); return entries.references.length || entries.additional.length; }).sort((a, b) => b.createdAt - a.createdAt);
}
export function responseExcerpt(content: string) {
  const plain = content.replace(/\[ref:\d+\]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*#`_>]/g, "").replace(/\s+/g, " ").trim();
  return plain.length > 140 ? `${plain.slice(0, 137).trimEnd()}…` : plain || "Assistant response";
}
