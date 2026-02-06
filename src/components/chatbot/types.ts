export type Role = "user" | "assistant";

export type ChatReferenceMetadata = Record<string, unknown>;

export type ChatReference = {
  filename?: string;
  metadata?: ChatReferenceMetadata;
  text?: string;
};

export type PanelPayload =
  | { type: "text"; title: string; data: string }
  | {
    type: "table";
    title: string;
    data: { columns: string[]; rows: Array<Array<string>> };
  }
  | { type: "references"; title: string; data: ChatReference[] };

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  callout?: { ctaLabel?: string; panel: PanelPayload };
};

export type ConversationPreview = {
  conv_id: string;
  title: string;
  kind?: "chat" | "planner";
};

export type ChatHistoryResponse = {
  messages: ChatMessage[];
  next_id?: string;
};

export type ConversationListResponse = {
  conversations: ConversationPreview[];
};
