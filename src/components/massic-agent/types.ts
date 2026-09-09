export type Surface = "global" | "webpages" | "social_channels";
export type ResourceType = "webpage_plan" | "social_channels_plan";
export type ResourceRef = { type: ResourceType; id: number | string };
export type IntentKind = `${"create" | "refine" | "activate"}_${"webpages" | "social_channels"}_plan`;
export type PlanIntent = { kind: IntentKind; payload?: { plan_id?: number | string; timeframe?: number } };
export type ChatMetadata = {
  view?: { resource: ResourceRef; selected_item_ids: string[] };
  intent?: PlanIntent;
};
export type ChatRequest = { thread_id?: string; surface?: Surface; message?: string; metadata?: ChatMetadata };
export type WidgetPart = {
  kind: "widget"; widget: "resource_table"; schema_version: 1;
  resource: ResourceRef; source?: { tool_call_id?: string; tool_name?: string };
};
export type CitationSource = { source_id: string; label?: string; source_type?: string; tool_name?: string; url?: string };
export type CitationReference = { ref_id: number; label?: string; detail?: string; source_ids?: string[] };
export type CitationSegment = { agent_scope: string; sources: CitationSource[]; references: CitationReference[] };
export type CitationDocument = { thread_id: string; turn_id: string; version: number; segments: CitationSegment[] };
export type TurnStatus = "complete" | "cancelled" | "error";
export type ActivityStep = { id: string; label: string; detail?: string; scope: string; depth: number; status: "running" | "done" | "error" | "cancelled" };
export type AgentMessage = {
  id: string; turnId?: string; role: "user" | "assistant"; content: string; createdAt: number;
  status?: TurnStatus; partial?: boolean; error?: string; activity?: ActivityStep[];
  citations?: CitationDocument; widgetParts?: WidgetPart[]; intent?: PlanIntent; view?: ChatMetadata["view"];
};
export type AgentThread = { thread_id: string; surface: Surface; title: string | null; created_at: string; updated_at: string };
export type AgentConversation = { id: string; title: string; surface: Surface; updatedAt: number };
export type ThreadMessage = { turn_id: string; role: "user" | "assistant"; content: string; status: TurnStatus; metadata?: Record<string, unknown>; created_at: string };
export type MessagesPage = { turns: ThreadMessage[]; next_cursor: string | null; has_more: boolean };
export type ThreadsPage = { threads: AgentThread[]; total: number; limit: number; offset: number };
export type PlanItem = {
  page_id?: string; campaign_cluster_id?: string; cluster_name?: string | null; title?: string | null;
  rationale?: string | null; page_type?: string | null; status?: string | null; valid?: boolean;
  business_relevance_score?: number | null; search_volume?: number | null; coverage?: number | null;
  channel_name?: string | null; campaign_name?: string | null; cluster_relevance?: number | null; content_type?: string | null;
};
export type AgentPlan = {
  id: number | string;
  plan_type?: Exclude<Surface, "global"> | string;
  status: string;
  valid?: boolean;
  timeframe?: number;
  parent_plan_id?: number | string | null;
  plan_json?: PlanItem[] | null;
};
type Envelope = { agent?: string; path?: string; depth?: number; thread_id?: string; turn_id?: string };
export type AgentEvent = Envelope & (
  | { type: "thread_meta"; thread_id: string; turn_id: string; is_new: boolean; title?: string }
  | { type: "thread_title"; thread_id: string; title: string }
  | { type: "turn_start" | "heartbeat" | "summarising_history" }
  | { type: "token"; text: string; iteration?: number }
  | { type: "iteration_start"; iteration: number }
  | { type: "iteration_end"; iteration: number; phase: "thinking" | "final" }
  | { type: "message_complete"; content: string; partial?: boolean }
  | { type: "dispatch_start"; child: string; task?: string }
  | { type: "dispatch_end"; child: string; summary?: string }
  | { type: "tool_call_start"; call_id: string; tool_name: string }
  | { type: "tool_call_end"; call_id: string; tool_name: string; success?: boolean }
  | { type: "citations"; document: CitationDocument }
  | { type: "cancelled"; reason?: string }
  | { type: "error"; code: string; message: string }
  | { type: "turn_end"; status: TurnStatus; widget_parts?: WidgetPart[]; credit_warning?: boolean; credit_balance?: number }
);
