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
  const text = response.message;
  const chunks = text.match(/.{1,3}/g) || [text];
  let index = 0;

  const streamInterval = setInterval(() => {
    if (index >= chunks.length) {
      clearInterval(streamInterval);
      onFinish({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: text,
        callout: response.callout,
      });
      return;
    }

    onDelta(chunks[index]);
    index++;
  }, 25);

  return () => clearInterval(streamInterval);
}
