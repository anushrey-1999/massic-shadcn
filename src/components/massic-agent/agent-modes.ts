import type { AgentChatMode, AgentId, AgentThreadTag } from "./types";

export const AGENT_CHAT_MODES: Record<
  AgentChatMode,
  { label: string; agentId: AgentId; tag: AgentThreadTag; supportsPlans: boolean }
> = {
  planner: {
    label: "Planner",
    agentId: "planner",
    tag: "chat",
    supportsPlans: true,
  },
  analytics: {
    label: "Analytics",
    agentId: "analytics",
    tag: "analytics",
    supportsPlans: false,
  },
  general: {
    label: "General",
    agentId: "main",
    tag: "main",
    supportsPlans: true,
  },
};

export function isAgentChatMode(value: string | null): value is AgentChatMode {
  return value === "planner" || value === "analytics" || value === "general";
}
