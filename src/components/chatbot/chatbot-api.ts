import type {
  ChatMessage,
  ConversationListResponse,
  ChatHistoryResponse,
  ChatReference,
} from "./types";

export type ChatbotResponse = {
  conversation_id: string;
  message: string;
  callout?: {
    ctaLabel?: string;
    panel: { type: "text" | "table" | "references"; title: string; data: any };
  };
};

type ApiResponse = {
  conversation_id?: string;
  answer?: unknown;
  message?: string;
  response?: string;
  references?: ChatReference[];
};

function normalizeReferences(references: ChatReference[]): ChatReference[] {
  return (references || [])
    .map((r) => {
      if (!r || typeof r !== "object") return undefined;
      const filename = typeof r.filename === "string" ? r.filename : undefined;
      const text = typeof r.text === "string" ? r.text : undefined;
      const metadata = r.metadata && typeof r.metadata === "object" ? (r.metadata as Record<string, unknown>) : undefined;
      return { filename, text, metadata } as ChatReference;
    })
    .filter(
      (r): r is ChatReference =>
        r !== undefined && (r.filename !== undefined || r.text !== undefined || r.metadata !== undefined)
    );
}

export async function sendChatbotMessage(
  message: string,
  businessId: string,
  conversationId?: string
): Promise<ChatbotResponse> {
  const response = await fetch(
    `/api/chatbot/talk?business_id=${encodeURIComponent(businessId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: message,
        ...(conversationId ? { conversation_id: conversationId } : {}),
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Chatbot request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as ApiResponse;

  console.log("API Response:", data);
  console.log("References in response:", data.references);

  let callout: ChatbotResponse["callout"] | undefined;
  const refs = data.references;
  if (Array.isArray(refs) && refs.length > 0) {
    const normalized = normalizeReferences(refs);
    const hasMetadata = normalized.some((r) => r.metadata && Object.keys(r.metadata).length > 0);

    if (hasMetadata) {
      callout = {
        ctaLabel: "View sources",
        panel: { type: "references", title: "Sources", data: normalized },
      };
    } else {
      const referenceData = normalized
        .map((r) => String(r.text || r.filename || "").trim())
        .filter(Boolean)
        .join("\n");

      if (referenceData) {
        callout = {
          ctaLabel: "View sources",
          panel: { type: "text", title: "References", data: referenceData },
        };
      }
    }
  } else {
    console.log("No references found or refs is not an array");
  }

  return {
    conversation_id: data.conversation_id || conversationId || `conv-${Date.now()}`,
    message:
      typeof data.answer === "string"
        ? data.answer
        : typeof data.message === "string"
        ? data.message
        : typeof data.response === "string"
        ? data.response
        : "No response received",
    callout,
  };
}

export async function sendPlannerMessage(
  message: string,
  businessId: string,
  conversationId?: string
): Promise<ChatbotResponse> {
  const response = await fetch(
    `/api/chatbot/planner?business_id=${encodeURIComponent(businessId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: message,
        ...(conversationId ? { conversation_id: conversationId } : {}),
        calendar_events: [],
        plan_type: "weekly",
        page_ideas_required: 5,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Planner request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as ApiResponse;

  const formatPlannerAnswer = (answer: unknown): string => {
    const parseJsonString = (value: string): unknown => {
      const trimmed = value.trim();
      const fenced = trimmed.startsWith("```")
        ? trimmed.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim()
        : trimmed;
      try {
        return JSON.parse(fenced);
      } catch {
        return value;
      }
    };

    if (typeof answer === "string") {
      const parsed = parseJsonString(answer);
      if (parsed !== answer) return formatPlannerAnswer(parsed);
      return answer;
    }
    if (!answer || typeof answer !== "object") {
      return "No response received";
    }

    const asAny = answer as {
      plan_meta?: { focus_summary?: string };
      assumptions?: string[];
      page_ideas?: Array<{
        slot?: number;
        title?: string;
        page_type?: string;
        primary_intent?: string;
        brief?: string;
        why_now?: string;
        success_metric?: string;
        target_keywords_or_cluster?: string[];
      }>;
    };

    const lines: string[] = [];
    const focusSummary = asAny.plan_meta?.focus_summary;
    if (focusSummary) {
      lines.push("**Focus Summary:**");
      lines.push("");
      lines.push(focusSummary);
      lines.push("");
    }
    const assumptions = Array.isArray(asAny.assumptions) ? asAny.assumptions : [];
    const ideas = Array.isArray(asAny.page_ideas) ? asAny.page_ideas : [];

    if (assumptions.length > 0) {
      if (lines.length > 0 && lines[lines.length - 1] !== "") lines.push("");
      lines.push("**Assumptions:**");
      lines.push("");
      assumptions.forEach((item) => {
        if (item) lines.push(`- ${item}`);
      });
      lines.push("");
    }

    if (ideas.length > 0) {
      if (lines.length > 0 && lines[lines.length - 1] !== "") lines.push("");
      lines.push("**Page Ideas:**");
      lines.push("");
      ideas.forEach((idea, idx) => {
        const title = idea?.title || "Untitled";
        lines.push(`${idx + 1}. ${title}`);
        if (idea?.brief) lines.push(`${idea.brief}`);
        if (idea?.why_now) {
          lines.push("");
          lines.push("**Why now:**");
          lines.push("");
          lines.push(`${idea.why_now}`);
        }
        const keywords = Array.isArray(idea?.target_keywords_or_cluster)
          ? idea?.target_keywords_or_cluster.filter(Boolean).join(", ")
          : "";
        if (keywords) {
          lines.push("");
          lines.push("**Keywords:**");
          lines.push("");
          lines.push(`${keywords}`);
        }
        lines.push("");
      });
    }

    return lines.join("\n").trim() || "No response received";
  };

  let callout: ChatbotResponse["callout"] | undefined;
  const refs = data.references;
  if (Array.isArray(refs) && refs.length > 0) {
    const normalized = normalizeReferences(refs);
    const hasMetadata = normalized.some((r) => r.metadata && Object.keys(r.metadata).length > 0);

    if (hasMetadata) {
      callout = {
        ctaLabel: "View sources",
        panel: { type: "references", title: "Sources", data: normalized },
      };
    } else {
      const referenceData = normalized
        .map((r) => String(r.text || r.filename || "").trim())
        .filter(Boolean)
        .join("\n");

      if (referenceData) {
        callout = {
          ctaLabel: "View sources",
          panel: { type: "text", title: "References", data: referenceData },
        };
      }
    }
  }

  return {
    conversation_id: data.conversation_id || conversationId || `conv-${Date.now()}`,
    message: formatPlannerAnswer(data.answer ?? data.message ?? data.response),
    callout,
  };
}

export function simulateStreamingResponse(
  response: ChatbotResponse,
  onDelta: (delta: string) => void,
  onFinish: (finalMessage: ChatMessage) => void
): () => void {
  const text =
    typeof response.message === "string"
      ? response.message
      : JSON.stringify(response.message || "");
  let offset = 0;

  // Faster, smoother streaming:
  // - update roughly once per frame
  // - emit bigger chunks so long responses finish quickly
  const intervalMs = 16;
  const targetCharsPerSecond = 1400;
  const chunkSize = Math.max(
    8,
    Math.min(48, Math.ceil((targetCharsPerSecond * intervalMs) / 1000))
  );

  const finish = () => {
    onFinish({
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: text,
      callout: response.callout,
    });
  };

  if (!text) {
    finish();
    return () => { };
  }

  const streamInterval = setInterval(() => {
    if (offset >= text.length) {
      clearInterval(streamInterval);
      finish();
      return;
    }

    const next = text.slice(offset, offset + chunkSize);
    offset += chunkSize;
    onDelta(next);
  }, intervalMs);

  return () => clearInterval(streamInterval);
}

export async function getConversationList(
  businessId: string
): Promise<ConversationListResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL;
  const response = await fetch(
    `${baseUrl}/chatbot/conversation-history?business_id=${encodeURIComponent(businessId)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    // 404 means no conversations exist yet, return empty list
    if (response.status === 404) {
      return { conversations: [] };
    }
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch conversation list (${response.status}): ${text}`);
  }

  return await response.json();
}

export async function getPlannerConversationList(
  businessId: string
): Promise<ConversationListResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL;
  const response = await fetch(
    `${baseUrl}/chatbot/planner-history?business_id=${encodeURIComponent(businessId)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return { conversations: [] };
    }
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch planner conversation list (${response.status}): ${text}`);
  }

  return await response.json();
}

export async function getChatHistory(
  businessId: string,
  conversationId: string,
  nextId?: string
): Promise<ChatHistoryResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL;
  const params = new URLSearchParams({
    business_id: businessId,
    conversation_id: conversationId,
    ...(nextId ? { next_id: nextId } : {}),
  });

  const response = await fetch(
    `${baseUrl}/chatbot/conversation-history?${params.toString()}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    // 404 means conversation not found or no history, return empty
    if (response.status === 404) {
      return { messages: [] };
    }
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch chat history (${response.status}): ${text}`);
  }

  return await response.json();
}

export async function getPlannerHistory(
  businessId: string,
  conversationId: string,
  nextId?: string
): Promise<ChatHistoryResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL;
  const params = new URLSearchParams({
    business_id: businessId,
    conversation_id: conversationId,
    ...(nextId ? { next_id: nextId } : {}),
  });

  const response = await fetch(
    `${baseUrl}/chatbot/planner-history?${params.toString()}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return { messages: [] };
    }
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch planner history (${response.status}): ${text}`);
  }

  return await response.json();
}
