import type { AgentAction, AgentConversation, StreamPhase } from "./types";

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

const mockReplies = [
  "Here's a roundup of your best options:\n\n## Resources\n\n1. **Anthropic UI Kit (Community)** There's a community-made Figma file that's a from-scratch recreation of Anthropic's designs, intended for research/prototyping. It's free, licensed under CC BY 4.0, and has no affiliation with Anthropic officially.\n\n2. **Massic Design (Official, Research Preview)** A tool that generates designs, website prototypes, and UI kits. It can export to HTML/PDF/PPTX and hand off to Massic Code.\n\n## For Adapting to Your Own Design System\n\n3. **awesome-claude-design (GitHub)** This repo provides ready-to-use `DESIGN.md` files for dozens of brands. A `DESIGN.md` is a single plain-text file describing a brand's visual language that AI agents can act on.\n\n4. **Figma + Code Plugin** Bridges design and development — you can extract design tokens, map Figma components to your codebase, and translate frames into production-ready code.\n\n## Quick Recommendation\n\nIf you want a **Figma reference file** → start with the community Anthropic UI Kit.\n\nIf you want to **build the chat UI in code** matching your design system → use the `DESIGN.md` approach to describe your tokens, then use Massic Code to scaffold the components.\n\nWant me to help you build out the chat interface components directly — message bubbles, input bar, sidebar, etc. — as a React or HTML artifact you can adapt?",
  "Great question! Let me break this down step by step.\n\n**Step 1** — Define what success looks like. Are you optimizing for traffic, conversions, or brand awareness?\n\n**Step 2** — Identify your audience. Who are you trying to reach and what do they care about?\n\n**Step 3** — Pick 2-3 high-leverage tactics rather than spreading thin.\n\nWant me to expand on any of these?",
  "Here's what I'd recommend:\n\n- Start small and iterate quickly\n- Measure what actually matters (not vanity metrics)\n- Document decisions so you can learn from them later\n\nLet me know which direction you want to go and I'll dig in deeper.",
  "Good thinking. A few angles to consider:\n\n1. **Short-term wins** — what can you ship this week?\n2. **Medium-term bets** — what compounds over the next quarter?\n3. **Long-term moats** — what's defensible 12 months out?\n\nWhich horizon matters most right now?",
  "I'd approach it like this:\n\n```\nphase 1: research (1 week)\nphase 2: prototype (2 weeks)\nphase 3: validate with users\nphase 4: scale what works\n```\n\nThe key is keeping each phase tight so you don't drift.",
];

const mockThinking = [
  "Considering the user's question. They want a clear, actionable answer. I'll structure it with concrete steps and offer follow-ups.",
  "Breaking the problem into smaller pieces. The user benefits most from a prioritized list rather than a long essay.",
  "Thinking about trade-offs. There are multiple valid approaches — I'll present the most common one and flag alternatives.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type StreamHandle = { cancel: () => void };

const searchActionLabels = [
  "Searched the web",
  "Browsed references",
  "Looked up your data",
];

export function simulateAgentStream(
  _prompt: string,
  callbacks: {
    onPhase: (phase: StreamPhase) => void;
    onThinking: (delta: string) => void;
    onAction: (action: AgentAction) => void;
    onActionDone: (id: string) => void;
    onDelta: (delta: string) => void;
    onDone: () => void;
  }
): StreamHandle {
  const thinkingText = pick(mockThinking);
  const responseText = pick(mockReplies);
  const timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;
  const useSearch = Math.random() < 0.6;

  const schedule = (fn: () => void, delay: number) => {
    const t = setTimeout(() => {
      if (!cancelled) fn();
    }, delay);
    timers.push(t);
  };

  callbacks.onPhase("thinking");

  const thinkingChars = thinkingText.split("");
  thinkingChars.forEach((ch, i) => {
    schedule(() => callbacks.onThinking(ch), 15 * i + 200);
  });

  let cursor = 15 * thinkingChars.length + 600;

  if (useSearch) {
    const actionId = `act-${Date.now()}`;
    const runningLabel = pick(searchActionLabels).replace(/ed\b/, "ing");
    const finalLabel = pick(searchActionLabels);

    schedule(() => {
      callbacks.onPhase("searching");
      callbacks.onAction({ id: actionId, label: runningLabel, status: "running" });
    }, cursor);
    cursor += 1400;

    schedule(() => {
      callbacks.onActionDone(actionId);
      callbacks.onAction({ id: actionId, label: finalLabel, status: "done" });
    }, cursor);
    cursor += 200;
  }

  schedule(() => {
    callbacks.onPhase("responding");
    const chars = responseText.split("");
    chars.forEach((ch, i) => {
      schedule(() => callbacks.onDelta(ch), 12 * i);
    });
    schedule(() => {
      callbacks.onPhase(null);
      callbacks.onDone();
    }, 12 * chars.length + 200);
  }, cursor);

  return {
    cancel: () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    },
  };
}

export function deriveTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 48) return trimmed || "New chat";
  return trimmed.slice(0, 48) + "…";
}
