import type { AgentMessage, ChatRequest, IntentKind, PlanIntent, PlanItem, ResourceRef, ResourceType, Surface, ThreadMessage, WidgetPart } from "./types";

export const SURFACES: Record<Surface, { label: string; resource: ResourceType | null }> = {
  global: { label: "Global", resource: null }, webpages: { label: "Web", resource: "webpage_plan" }, social_channels: { label: "Social", resource: "social_channels_plan" },
};
export const resourceSurface = (type: ResourceType): Exclude<Surface, "global"> => type === "webpage_plan" ? "webpages" : "social_channels";
export const resourceKey = (resource: ResourceRef) => `${resource.type}:${resource.id}`;
export const planItemId = (item: PlanItem, type: ResourceType) => String((type === "webpage_plan" ? item.page_id : item.campaign_cluster_id) ?? "");
export const allPlanIds = (items: PlanItem[], type: ResourceType) => [...new Set(items.map(item => planItemId(item, type)).filter(Boolean))];
export function intentFor(action: "create" | "refine" | "activate", surface: Exclude<Surface, "global">): IntentKind {
  return `${action}_${surface}_plan`;
}
export function intentLabel(kind: IntentKind): string {
  const action = kind.startsWith("create") ? "Create" : kind.startsWith("refine") ? "Refine" : "Activate";
  return `${action} ${kind.includes("social_channels") ? "social" : "web"} plan`;
}
export function buildChatRequest(args: { threadId?: string | null; surface: Surface; message?: string; resource?: ResourceRef | null; selectedIds?: string[]; intent?: PlanIntent }): ChatRequest {
  const { threadId, surface, resource, intent } = args;
  const message = args.message?.trim();
  if (!message && !intent) throw new Error("Write a message or choose an action.");
  if (resource && SURFACES[surface].resource !== resource.type) throw new Error("Open this plan in its matching conversation.");
  if (args.selectedIds?.length && !resource) throw new Error("Open a plan before selecting items.");
  if (intent && surface !== "global" && !intent.kind.includes(`_${surface}_`)) throw new Error("This action belongs to a different plan type.");
  if (intent?.kind.startsWith("refine") && !resource) throw new Error("Open a plan to refine it.");
  const metadata: NonNullable<ChatRequest["metadata"]> = {};
  if (resource) metadata.view = { resource, selected_item_ids: [...new Set(args.selectedIds ?? [])] };
  if (intent) {
    metadata.intent = { kind: intent.kind, payload: {} };
    if (intent.kind.startsWith("activate")) {
      const id = Number(intent.payload?.plan_id ?? resource?.id);
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Open a valid plan to activate it.");
      metadata.intent.payload = { plan_id: id };
    }
    // v1 deliberately uses the server's default 20-item create size.
  }
  return { ...(threadId ? { thread_id: threadId } : { surface }), ...(message ? { message } : {}), ...(Object.keys(metadata).length ? { metadata } : {}) };
}
export function widgetParts(raw: unknown): WidgetPart[] {
  if (!Array.isArray(raw)) return [];
  const result = new Map<string, WidgetPart>();
  for (const value of raw) {
    if (!value || value.kind !== "widget" || value.widget !== "resource_table" || value.schema_version !== 1) continue;
    const r = value.resource;
    if (!r || !["webpage_plan", "social_channels_plan"].includes(r.type) || !["number", "string"].includes(typeof r.id)) continue;
    result.set(resourceKey(r), value as WidgetPart);
  }
  return [...result.values()];
}
export function lastMatchingPlan(parts: WidgetPart[], surface: Surface): ResourceRef | null {
  return [...parts].reverse().find(p => surface === "global" || p.resource.type === SURFACES[surface].resource)?.resource ?? null;
}
export function cleanContent(content: string, role: "user" | "assistant"): string {
  // Server annotations have a reserved syntax; preserve ordinary brackets and code.
  const blocks = content.split(/(```[\s\S]*?(?:```|$))/g);
  return blocks.map((block, i) => i % 2 ? block : role === "user"
    ? block.replace(/\n\[(?:viewing|intent|view\.scope)\][^\n]*/g, "")
    : block.replace(/\n?[ \t]*\[(?:shown:\s*resource_table\s+(?:webpage_plan|social_channels_plan):[^\]\n]+|action:\s*(?:create|refine|activate)_(?:webpages|social_channels)_plan)\][ \t]*/g, "")
  ).join("").trim();
}
export function hydrateMessage(turn: ThreadMessage): AgentMessage {
  const metadata = turn.metadata ?? {};
  return { id: `${turn.turn_id}-${turn.role}`, turnId: turn.turn_id, role: turn.role,
    content: cleanContent(turn.content, turn.role), createdAt: Date.parse(turn.created_at), status: turn.status,
    partial: turn.status === "cancelled", widgetParts: widgetParts(metadata.parts),
    intent: (metadata.intent ?? (metadata.synthetic && typeof metadata.action === "string" ? { kind: metadata.action } : undefined)) as PlanIntent | undefined,
    view: metadata.view as AgentMessage["view"],
  };
}
export function mergeMessages(history: AgentMessage[], live: AgentMessage[]): AgentMessage[] {
  const byId = new Map(history.map(m => [m.id, m]));
  for (const message of live) byId.set(message.id, { ...byId.get(message.id), ...message });
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt || (a.role === "user" ? -1 : 1));
}
