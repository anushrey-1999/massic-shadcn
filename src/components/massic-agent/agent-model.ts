import type {
  AgentId,
  AgentMessage,
  ChatEntry,
  ChatRequest,
  PlanItem,
  PlanSurface,
  ResourceRef,
  ResourceType,
  SummaryMarker,
  ThreadItem,
  ThreadMessage,
  TraceMetadata,
  WidgetPart,
} from "./types";
import type { AgentAttachment } from "./agent-uploads";

export const PLAN_SURFACES: Record<
  PlanSurface,
  { label: string; resource: ResourceType }
> = {
  webpages: { label: "Web", resource: "webpage_plan" },
  social_channels: { label: "Social", resource: "social_channels_plan" },
};
export const resourcePlanSurface = (type: ResourceType): PlanSurface =>
  type === "webpage_plan" ? "webpages" : "social_channels";
export const resourceKey = (resource: ResourceRef) =>
  `${resource.type}:${resource.id}`;
export const planItemId = (item: PlanItem, type: ResourceType) =>
  String(
    (type === "webpage_plan" ? item.page_id : item.campaign_cluster_id) ?? "",
  );
export const allPlanIds = (items: PlanItem[], type: ResourceType) => [
  ...new Set(items.map((item) => planItemId(item, type)).filter(Boolean)),
];
export function planActionMessage(
  action: "create" | "refine" | "activate",
  type: ResourceType,
): string {
  if (action === "refine") return "Refine this plan";
  if (action === "activate") return "Activate this plan";
  return type === "webpage_plan"
    ? "Create a webpage plan"
    : "Create a social channels plan";
}
export function buildChatRequest(args: {
  agentId?: AgentId;
  attachments?: string[];
  threadId?: string | null;
  message: string;
  resource?: ResourceRef | null;
  selectedIds?: string[];
  omitView?: boolean;
}): ChatRequest {
  const message = args.message.trim();
  if (!message) throw new Error("Write a message to send.");
  if (args.selectedIds?.length && !args.resource && !args.omitView)
    throw new Error("Open a plan before selecting items.");
  const metadata: NonNullable<ChatRequest["metadata"]> = {};
  if (args.resource && !args.omitView)
    metadata.view = {
      resource: args.resource,
      selected_item_ids: [...new Set(args.selectedIds ?? [])],
    };
  return {
    agent_id: args.agentId ?? "planner",
    ...(args.threadId ? { thread_id: args.threadId } : {}),
    message,
    ...(args.attachments?.length ? { attachments: args.attachments } : {}),
    ...(Object.keys(metadata).length && args.agentId !== "profile"
      ? { metadata }
      : {}),
  };
}
export function widgetParts(raw: unknown): WidgetPart[] {
  if (!Array.isArray(raw)) return [];
  const result = new Map<string, WidgetPart>();
  for (const value of raw) {
    if (
      !value ||
      value.kind !== "widget" ||
      value.widget !== "resource_table" ||
      value.schema_version !== 1
    )
      continue;
    const r = value.resource;
    if (
      !r ||
      !["webpage_plan", "social_channels_plan"].includes(r.type) ||
      !["number", "string"].includes(typeof r.id)
    )
      continue;
    result.set(resourceKey(r), value as WidgetPart);
  }
  return [...result.values()];
}
export function lastMatchingPlan(parts: WidgetPart[]): ResourceRef | null {
  return [...parts].reverse().find((part) => part.resource)?.resource ?? null;
}
export function isSummaryMarker(item: ThreadItem): item is SummaryMarker {
  return (item as SummaryMarker).type === "summary";
}
export function cleanContent(
  content: string,
  role: "user" | "assistant",
  hasAttachments = false,
): string {
  // Server annotations have a reserved syntax; preserve ordinary brackets and code.
  const blocks = content.split(/(```[\s\S]*?(?:```|$))/g);
  return blocks
    .map((block, i) =>
      i % 2
        ? block
        : role === "user"
          ? (hasAttachments
              ? block.replace(/(?:^|\n)[ \t]*\[attachments\][\s\S]*$/g, "")
              : block
            ).replace(/(?:\s*\[(?:viewing|intent|view\.scope)\][^\n]*)+$/g, "")
          : block.replace(
              /\n?[ \t]*\[(?:shown:\s*resource_table\s+(?:webpage_plan|social_channels_plan):[^\]\n]+|action:\s*(?:create|refine|activate)_(?:webpages|social_channels)_plan)\][ \t]*/g,
              "",
            ),
    )
    .join("")
    .trim();
}
export function hydrateMessage(turn: ThreadMessage): AgentMessage {
  const metadata = turn.metadata ?? {};
  return {
    id: `${turn.turn_id}-${turn.role}`,
    turnId: turn.turn_id,
    role: turn.role,
    content: cleanContent(
      turn.content,
      turn.role,
      Array.isArray(metadata.attachments) && metadata.attachments.length > 0,
    ),
    createdAt: Date.parse(turn.created_at),
    status: turn.status,
    partial: turn.status === "cancelled",
    widgetParts: widgetParts(metadata.parts),
    view: metadata.view as AgentMessage["view"],
    trace: metadata.trace as TraceMetadata | undefined,
    attachments: metadata.attachments as AgentAttachment[] | undefined,
  };
}
export function hydrateThreadItem(item: ThreadItem): ChatEntry {
  if (isSummaryMarker(item)) {
    return {
      kind: "summary",
      id: `summary:${item.event_id}`,
      eventId: item.event_id,
      summaryText: item.summary_text,
    };
  }
  return { kind: "message", message: hydrateMessage(item) };
}

/** Recover a request whose connection ended before thread_meta reached the client. */
export function findAcceptedTurn(
  items: ThreadItem[],
  message: string,
  fileIds: string[],
  startedAt: number,
): string | undefined {
  return items.find((item): item is ThreadMessage => {
    if (
      isSummaryMarker(item) ||
      item.role !== "user" ||
      Date.parse(item.created_at) < startedAt - 5_000
    )
      return false;
    const attachments = item.metadata?.attachments as
      AgentAttachment[] | undefined;
    const storedIds = (attachments ?? []).map((file) => file.file_id).sort();
    return (
      cleanContent(item.content, "user", !!attachments?.length) === message &&
      JSON.stringify(storedIds) === JSON.stringify([...fileIds].sort())
    );
  })?.turn_id;
}
const mergedMessageCache = new WeakMap<AgentMessage, AgentMessage>();
export function mergeMessages(
  history: ChatEntry[],
  live: AgentMessage[],
): ChatEntry[] {
  const liveById = new Map(live.map((message) => [message.id, message]));
  const used = new Set<string>();
  const result: ChatEntry[] = [];
  for (const entry of history) {
    if (entry.kind === "summary") {
      result.push(entry);
      continue;
    }
    const incoming = liveById.get(entry.message.id);
    if (!incoming) {
      result.push(entry);
      continue;
    }
    used.add(incoming.id);
    const citations = incoming.citations ?? entry.message.citations;
    if (incoming.citations || !citations)
      result.push({ kind: "message", message: incoming });
    else {
      let merged = mergedMessageCache.get(incoming);
      if (!merged || merged.citations !== citations) {
        merged = { ...incoming, citations };
        mergedMessageCache.set(incoming, merged);
      }
      result.push({ kind: "message", message: merged });
    }
  }
  for (const message of live) {
    if (used.has(message.id)) continue;
    result.push({ kind: "message", message });
  }
  return result;
}
