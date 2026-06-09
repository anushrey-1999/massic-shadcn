export type AgentRole = "user" | "assistant";

export type AgentActionStatus = "running" | "done";

export type AgentAction = {
  id: string;
  label: string;
  status: AgentActionStatus;
};

export type AgentMessageStatus = "complete" | "cancelled" | "error";

export type AgentMessage = {
  id: string;
  turnId?: string;
  role: AgentRole;
  content: string;
  thinking?: string;
  actions?: AgentAction[];
  citations?: CitationSegment[];
  widgetParts?: WidgetPart[];
  createdAt: number;
  status?: AgentMessageStatus;
  partial?: boolean;
};

export type AgentConversation = {
  id: string;
  title: string;
  messages: AgentMessage[];
  updatedAt: number;
};

export type StreamPhase = "thinking" | "tool" | "responding" | null;

export type SpecialistState = string | null;

export type ResourceRef = {
  type: string;
  id: number | string;
};

export type WidgetPart = {
  kind: "widget";
  widget: string;
  schema_version: number;
  source: {
    tool_call_id: string;
    tool_name: string;
  };
  resource: ResourceRef;
};

// ── API response types ──────────────────────────────────────────────────────

export type AgentThread = {
  thread_id: string;
  title: string | null;
  summary?: string | null;
  created_at: string;
  updated_at: string;
};

export type ThreadMessage = {
  turn_id: string;
  role: AgentRole;
  content: string;
  status: AgentMessageStatus;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type ThreadMessagesResponse = {
  messages: ThreadMessage[];
  next_cursor: string | null;
  has_more: boolean;
};

export type ThreadsResponse = {
  threads: AgentThread[];
  total: number;
};

export type CitationRefType =
  | "tool_result"
  | "learning"
  | "history"
  | "context"
  | "summary"
  | "general_knowledge"
  | "assumption"
  | "reasoning";

export type CitationReference = {
  ref?: number;
  ref_id?: number;
  index?: number;
  id?: string | number;
  ref_type?: CitationRefType | string;
  label?: string | null;
  detail?: string | null;
  source_ids?: Array<string | number>;
  [key: string]: unknown;
};

export type CitationReasoning = {
  text?: string | null;
  tool_name?: string | null;
  [key: string]: unknown;
};

export type CitationSource = {
  id?: string | number;
  source_id?: string | number;
  source_type?: string | null;
  title?: string | null;
  label?: string | null;
  detail?: string | null;
  content?: string | null;
  url?: string | null;
  [key: string]: unknown;
};

export type CitationSegment = {
  agent?: string | null;
  label?: string | null;
  reasoning?: CitationReasoning[];
  sources?: CitationSource[];
  references?: CitationReference[];
  [key: string]: unknown;
};

export type ThreadCitationsResponse = {
  items: Record<string, { segments?: CitationSegment[] } | CitationSegment[] | null>;
};

// ── SSE event types ─────────────────────────────────────────────────────────

type SseBase = { type: string };

export type SseThreadMeta = SseBase & {
  type: "thread_meta";
  thread_id: string;
  turn_id: string;
  is_new: boolean;
  title?: string;
};

export type SseThreadTitle = SseBase & {
  type: "thread_title";
  thread_id: string;
  title: string;
  provisional: boolean;
};

export type SseTurnStart = SseBase & {
  type: "turn_start";
  turn_id: string;
  thread_id: string;
};

export type SseIterationStart = SseBase & {
  type: "iteration_start";
  agent: string;
  iteration: number;
};

export type SseIterationEnd = SseBase & {
  type: "iteration_end";
  agent: string;
  iteration: number;
  phase: "thinking" | "final";
  tool_calls_pending: boolean;
};

export type SseToken = SseBase & {
  type: "token";
  agent: string;
  text: string;
  iteration: number;
};

export type SseHeartbeat = SseBase & {
  type: "heartbeat";
  agent: string;
};

export type SseToolCallStart = SseBase & {
  type: "tool_call_start";
  agent: string;
  tool_name: string;
  call_id: string;
  input?: unknown;
  input_truncated: boolean;
  input_total_chars: number;
};

export type SseToolCallEnd = SseBase & {
  type: "tool_call_end";
  agent: string;
  tool_name: string;
  call_id: string;
  success: boolean;
  output?: unknown;
  input?: Record<string, unknown>;
  output_truncated: boolean;
  output_total_chars: number;
  latency_ms: number;
  widget?: string;
  widget_version?: number;
};

export type SseAgentHandoff = SseBase & {
  type: "agent_handoff";
  from: string;
  to: string;
  reason?: string;
};

export type SseSummarisingHistory = SseBase & {
  type: "summarising_history";
};

export type SseMemoryEvent = SseBase & {
  type: "memory_event";
  action: "write" | "forget";
  memory_type: string;
};

export type SseMessageComplete = SseBase & {
  type: "message_complete";
  turn_id: string;
  thread_id: string;
  role: AgentRole;
  content: string;
  partial: boolean;
};

export type SseCitations = SseBase & {
  type: "citations";
  agent: string;
  turn_id: string;
  thread_id: string;
  segments: CitationSegment[];
};

export type SseTurnEnd = SseBase & {
  type: "turn_end";
  turn_id?: string;
  thread_id?: string;
  status: string;
  agent?: string;
  active_agent?: string | null;
  token_usage?: unknown;
  cost_breakdown?: unknown;
  cache_metrics?: unknown;
  credit_balance?: number;
  percentage_used?: number;
  budget_warning?: boolean | string;
  widget_parts?: WidgetPart[];
};

export type SseThinkingSummary = SseBase & {
  type: "thinking_summary";
  level: string;
  iterations_used: number;
  iterations_max: number;
  discovery_used: number;
  discovery_max: number;
  total_tool_calls_used: number;
  forced_finalised: boolean;
};

export type SseCancelled = SseBase & {
  type: "cancelled";
  turn_id: string;
  thread_id: string;
  reason?: string;
};

export type SseError = SseBase & {
  type: "error";
  code: string;
  message: string;
};

export type SseEvent =
  | SseThreadMeta
  | SseThreadTitle
  | SseTurnStart
  | SseIterationStart
  | SseIterationEnd
  | SseToken
  | SseHeartbeat
  | SseToolCallStart
  | SseToolCallEnd
  | SseAgentHandoff
  | SseSummarisingHistory
  | SseMemoryEvent
  | SseMessageComplete
  | SseCitations
  | SseTurnEnd
  | SseThinkingSummary
  | SseCancelled
  | SseError;

export type PlanPageRef = {
  page_id: string;
  rationale?: string | null;
};

export type AgentPlan = {
  id: number | string;
  plan_type?: string;
  status: string;
  timeframe?: number;
  plan_json?: PlanPageRef[] | null;
  created_at?: string;
  updated_at?: string;
};

export type PlansListResponse = {
  plans?: AgentPlan[];
  items?: AgentPlan[];
};

export type WebpageItem = {
  page_id: string | null;
  cluster_name: string;
  slug: string | null;
  page_type: string | null;
  status: string | null;
  search_intent: string | null;
  business_relevance_score: number | null;
  business_relevance_level: string | null;
  page_opportunity_score: number | null;
  coverage: number | null;
  search_volume: number | null;
  supporting_keyword_count: number | null;
  offerings: string[];
};

export type WebpagesCatalogResponse = {
  output_data?: {
    items?: WebpageItem[];
    pagination?: {
      page: number;
      page_size: number;
      total_items: number;
      total_pages: number;
    };
  };
};
