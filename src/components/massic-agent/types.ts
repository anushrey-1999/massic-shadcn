export type AgentRole = "user" | "assistant";

export type AgentActionStatus = "running" | "done";

export type AgentAction = {
  id: string;
  label: string;
  status: AgentActionStatus;
};

export type AgentMessage = {
  id: string;
  role: AgentRole;
  content: string;
  thinking?: string;
  actions?: AgentAction[];
  createdAt: number;
};

export type AgentConversation = {
  id: string;
  title: string;
  messages: AgentMessage[];
  updatedAt: number;
};

export type StreamPhase = "thinking" | "searching" | "responding" | null;
