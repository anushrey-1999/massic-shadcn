import Cookies from "js-cookie";
import { api, getBaseURLByPlatform } from "@/hooks/use-api";
import { isTokenExpired } from "@/utils/jwt";
import { useSessionStore } from "@/store/session-store";
import type { AgentPlan, AgentThread, ChatRequest, CitationDocument, MessagesPage, ResourceType, ThreadsPage } from "./types";

export class AgentAPIError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "AgentAPIError"; }
}
export function errorMessage(error: unknown): string {
  if (error instanceof AgentAPIError) return error.message;
  const response = (error as { response?: { status?: number; data?: { detail?: unknown; message?: string } } })?.response;
  if (response?.status === 401 || response?.status === 403) return "Your session or business access has changed. Sign in again or choose an accessible business.";
  if (response?.status === 404) return "This conversation, plan, or agent service is unavailable.";
  if (response?.status === 422) return "The agent could not use this chat or plan context. Open the matching mode and try again.";
  if (response?.status === 503) return "The agent service is temporarily unavailable. Please try again.";
  return response?.data?.message ?? (error instanceof Error ? error.message : "Something went wrong. Please try again.");
}
export function streamErrorMessage(code: string, fallback: string): string {
  if (code === "credit_exhausted") return "This business has run out of Agent credits. Add credits before trying again.";
  if (code === "thread_not_found") return "This conversation is no longer available. Start a new chat to continue.";
  if (code === "business_not_found") return "This business is no longer available to the Agent.";
  if (code === "invalid_input") return fallback || "The selected mode, plan, or action is incompatible with this conversation.";
  if (code === "redis_unavailable" || code === "storage_unavailable") return "The Agent service is temporarily unavailable. Your draft has been preserved.";
  if (code === "tool_error") return fallback || "The Agent could not complete that plan action.";
  return fallback || "The Agent could not complete this response. Please try again.";
}
export const agentKeys = {
  threads: (business: string) => ["massic-agent", business, "threads"] as const,
  messages: (business: string, thread: string) => ["massic-agent", business, "messages", thread] as const,
  citations: (business: string, thread: string, ids: string[]) => ["massic-agent", business, "citations", thread, ids] as const,
  plans: (business: string, type?: ResourceType) => type
    ? ["massic-agent", business, "plans", type] as const
    : ["massic-agent", business, "plans"] as const,
  plan: (business: string, id: string | number) => ["massic-agent", business, "plan", String(id)] as const,
};
const tenant = (business: string) => ({ business_id: business });
export const getThreads = (business: string, offset = 0, signal?: AbortSignal) => api.get<ThreadsPage>("/agent/threads", "python", { params: { ...tenant(business), limit: 20, offset }, signal });
export const getMessages = (business: string, thread: string, before?: string, signal?: AbortSignal) => api.get<MessagesPage>(`/agent/threads/${encodeURIComponent(thread)}/messages`, "python", { params: { ...tenant(business), limit: 50, ...(before ? { before } : {}) }, signal });
export const renameThread = (business: string, thread: string, title: string) => api.patch<AgentThread>(`/agent/threads/${encodeURIComponent(thread)}`, "python", { title: title.trim() }, { params: tenant(business) });
const normalizePlan = (plan: AgentPlan): AgentPlan => {
  const rawType = String(plan.plan_type ?? "").toLowerCase();
  const normalized = rawType === "pages" ? "webpages" : rawType === "posts" ? "social_channels" : rawType;
  return { ...plan, plan_type: normalized };
};
export const getPlan = async (business: string, id: number | string, signal?: AbortSignal) => normalizePlan(await api.get<AgentPlan>(`/actions/plans/${encodeURIComponent(id)}`, "python", { params: tenant(business), signal }));
export async function getPlans(business: string, type?: ResourceType, signal?: AbortSignal) {
  const planType = type === "webpage_plan" ? "webpages" : type === "social_channels_plan" ? "social_channels" : undefined;
  const response = await api.get<{ plans?: AgentPlan[]; items?: AgentPlan[] }>("/actions/plans", "python", { params: { ...tenant(business), ...(planType ? { plan_type: planType } : {}) }, signal });
  return (response.plans ?? response.items ?? []).map(normalizePlan);
}
export async function getCitations(business: string, thread: string, ids: string[], signal?: AbortSignal): Promise<Record<string, CitationDocument | null>> {
  const batches: Record<string, CitationDocument | null> = {};
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 50) {
    const result = await api.post<{ items: Record<string, CitationDocument | null> }>(`/agent/threads/${encodeURIComponent(thread)}/citations`, "python", { turn_ids: unique.slice(i, i + 50) }, { params: tenant(business), signal });
    Object.assign(batches, result.items);
  }
  return batches;
}
export async function cancelTurn(business: string, thread: string, turn: string) {
  const response = await api.post<{ accepted: boolean }>("/agent/cancel", "python", { thread_id: thread, turn_id: turn }, { params: tenant(business) });
  if (!response.accepted) throw new Error("The server could not stop this response. It is still running.");
}
export async function startChatStream(business: string, request: ChatRequest, signal: AbortSignal) {
  const token = Cookies.get("token");
  if (!token || isTokenExpired(token)) throw new AgentAPIError(401, "Your session has expired. Sign in again to continue.");
  const base = getBaseURLByPlatform("python").replace(/\/$/, "");
  const response = await fetch(`${base}/agent/chat?${new URLSearchParams(tenant(business))}`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "text/event-stream", Token: token }, body: JSON.stringify(request), signal,
  });
  if (!response.ok || !response.body) {
    let detail = "";
    try { const body = await response.json(); detail = typeof body.detail === "string" ? body.detail : body.message ?? ""; } catch { /* HTTP fallback below */ }
    if (response.status === 401) useSessionStore.getState().setShowSessionExpiredDialog(true);
    throw new AgentAPIError(response.status, detail || (response.status === 404 ? "The agent API is not available in this environment." : response.status === 401 ? "Your session has expired. Sign in again." : `Could not start the response (${response.status}). Please try again.`));
  }
  return response.body;
}
