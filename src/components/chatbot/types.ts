export type Role = "user" | "assistant";

export type PanelPayload =
  | { type: "text"; title: string; data: string }
  | {
    type: "table";
    title: string;
    data: { columns: string[]; rows: Array<Array<string>> };
  };

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  callout?: { ctaLabel?: string; panel: PanelPayload };
};

export type ConversationPreview = {
  conv_id: string;
  title: string;
};

export type ChatHistoryResponse = {
  messages: ChatMessage[];
  next_id?: string;
};

export type ConversationListResponse = {
  conversations: ConversationPreview[];
};
