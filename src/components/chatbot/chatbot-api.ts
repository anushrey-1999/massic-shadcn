import type { ChatMessage, ConversationListResponse, ChatHistoryResponse } from "./types";

export type ChatbotResponse = {
  conversation_id: string;
  message: string;
  callout?: {
    ctaLabel?: string;
    panel: { type: "text" | "table"; title: string; data: any };
  };
};

type ApiResponse = {
  conversation_id?: string;
  answer?: string;
  message?: string;
  response?: string;
  references?: Array<{ text?: string } & Record<string, unknown>>;
};

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
    // Handle both formats: { text: "..." } and { filename: "..." }
    const referenceData = refs
      .map((r: any) => {
        const text = r.text || r.filename || "";
        return String(text).trim();
      })
      .filter(Boolean)
      .join("\n");

    console.log("Reference data:", referenceData);

    if (referenceData) {
      callout = {
        ctaLabel: "View sources",
        panel: { type: "text", title: "References", data: referenceData },
      };
      console.log("Created callout:", callout);
    }
  } else {
    console.log("No references found or refs is not an array");
  }

  return {
    conversation_id: data.conversation_id || conversationId || `conv-${Date.now()}`,
    message: data.answer || data.message || data.response || "No response received",
    callout,
  };
}

export function simulateStreamingResponse(
  response: ChatbotResponse,
  onDelta: (delta: string) => void,
  onFinish: (finalMessage: ChatMessage) => void
): () => void {
  const text = response.message || "";
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
    `${baseUrl}/chatbot/chat-history?business_id=${encodeURIComponent(businessId)}`,
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
    `${baseUrl}/chatbot/chat-history?${params.toString()}`,
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
