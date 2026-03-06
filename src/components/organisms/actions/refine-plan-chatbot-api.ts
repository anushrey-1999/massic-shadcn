import type { RefinePlanSource } from "./refine-plan-overlay-provider"

export type RefinePlanChatResponse = {
  conversationId: string
  message: string
}

export async function sendRefinePlanMessage(args: {
  message: string
  businessId: string
  source: RefinePlanSource
  conversationId?: string
}): Promise<RefinePlanChatResponse> {
  try {
    const response = await fetch(
      `/api/refine-plan/talk?business_id=${encodeURIComponent(args.businessId)}&source=${encodeURIComponent(args.source)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: args.message,
          ...(args.conversationId ? { conversation_id: args.conversationId } : {}),
        }),
      }
    )

    if (!response.ok) {
      throw new Error(await response.text().catch(() => "Request failed"))
    }

    const data = (await response.json()) as { conversation_id?: string; message?: string; answer?: string }
    return {
      conversationId: data.conversation_id || args.conversationId || `conv-${Date.now()}`,
      message: data.message || data.answer || "No response received",
    }
  } catch {
    return {
      conversationId: args.conversationId || `conv-${Date.now()}`,
      message: "Got it. What would you like to adjust in this plan?",
    }
  }
}

