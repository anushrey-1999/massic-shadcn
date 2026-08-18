import type { AgentConversation } from "./types";

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

export const seedConversations: AgentConversation[] = [
  {
    id: "c-1",
    title: "Plan SEO strategy for Q1",
    updatedAt: now - 30 * 60 * 1000,
    messages: [
      {
        id: "m-1-1",
        role: "user",
        content: "Help me plan an SEO strategy for Q1.",
        createdAt: now - 31 * 60 * 1000,
      },
      {
        id: "m-1-2",
        role: "assistant",
        content:
          "Here's a focused Q1 SEO plan:\n\n1. **Audit** existing top pages and identify decaying content.\n2. **Cluster keywords** around 3 pillar topics.\n3. **Publish 2 cornerstone pieces** per month with internal links.\n4. **Technical fixes**: Core Web Vitals, schema, internal linking.\n\nWant me to draft a content calendar next?",
        thinking:
          "User wants Q1 SEO plan. Cover audit, keywords, content cadence, and technical wins. Keep it actionable.",
        createdAt: now - 30 * 60 * 1000,
      },
    ],
  },
  {
    id: "c-2",
    title: "Draft a product launch email",
    updatedAt: now - 26 * 60 * 60 * 1000,
    messages: [
      {
        id: "m-2-1",
        role: "user",
        content: "Draft an email announcing our new analytics dashboard.",
        createdAt: now - 26 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: "c-3",
    title: "Compare competitor pricing pages",
    updatedAt: now - 4 * day,
    messages: [],
  },
  {
    id: "c-4",
    title: "Summarize last quarter performance",
    updatedAt: now - 9 * day,
    messages: [],
  },
];

export function deriveTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 48) return trimmed || "New chat";
  return trimmed.slice(0, 48) + "…";
}
