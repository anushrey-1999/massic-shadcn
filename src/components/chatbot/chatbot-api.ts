import type { ChatMessage } from "./types";

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

  let callout: ChatbotResponse["callout"] | undefined;
  const refs = data.references;
  if (Array.isArray(refs) && refs.length > 0) {
    const referenceData = refs
      .map((r) => String((r as any).text ?? ""))
      .filter(Boolean)
      .join("\n\n");

    if (referenceData) {
      callout = {
        ctaLabel: "View sources",
        panel: { type: "text", title: "References", data: referenceData },
      };
    }
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
