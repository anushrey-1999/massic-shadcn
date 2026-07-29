import Cookies from "js-cookie";
import type {
  AgentThread,
  AgentPlan,
  CitationSegment,
  ThreadMessagesResponse,
  ThreadCitationsResponse,
  ThreadsResponse,
  WebpageItem,
  WebpagesCatalogResponse,
} from "./types";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_PYTHON_API_URL || "https://infer.seedinternaldev.xyz/v2";
}

function getAuthHeaders(): Record<string, string> {
  const token = Cookies.get("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Token"] = token;
  }
  return headers;
}

const CATALOG_PAGE_SIZE = 500;

export async function getThreads(
  businessId: string,
  limit = 20,
  offset = 0
): Promise<ThreadsResponse> {
  const params = new URLSearchParams({
    business_id: businessId,
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(
    `${getBaseUrl()}/agent/threads?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[agent] getThreads ${res.status}:`, body);
    if (res.status === 503) throw new Error("service_unavailable");
    throw new Error(`threads_fetch_failed:${res.status}`);
  }
  const json = await res.json();
  // Normalise response — backend may return array directly or wrap in a key
  const threads = Array.isArray(json)
    ? json
    : json.threads ?? json.data ?? json.items ?? [];
  return {
    threads,
    total: json.total ?? threads.length,
  };
}

export async function getThreadMessages(
  businessId: string,
  threadId: string,
  before?: string
): Promise<ThreadMessagesResponse> {
  const params = new URLSearchParams({ business_id: businessId });
  if (before) params.set("before", before);
  const res = await fetch(
    `${getBaseUrl()}/agent/threads/${threadId}/messages?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[agent] getThreadMessages ${res.status}:`, body);
    if (res.status === 404) throw new Error("thread_not_found");
    if (res.status === 400) throw new Error("invalid_cursor");
    if (res.status === 503) throw new Error("service_unavailable");
    throw new Error(`messages_fetch_failed:${res.status}`);
  }
  const json = await res.json();
  // Normalise response shape — backend returns "turns"; also guard other wrapping patterns
  const raw = json.turns ?? json.messages ?? json.data ?? json.items ?? (Array.isArray(json) ? json : []);
  const messages = Array.isArray(raw) ? raw : [];
  return {
    messages,
    next_cursor: json.next_cursor ?? json.nextCursor ?? null,
    has_more: json.has_more ?? json.hasMore ?? false,
  };
}

export async function getThreadCitations(
  businessId: string,
  threadId: string,
  turnIds: string[]
): Promise<Record<string, CitationSegment[] | null>> {
  if (turnIds.length === 0) return {};

  const res = await fetch(
    `${getBaseUrl()}/agent/threads/${threadId}/citations?business_id=${encodeURIComponent(businessId)}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ turn_ids: turnIds.slice(0, 50) }),
    }
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error("thread_not_found");
    if (res.status === 503) throw new Error("service_unavailable");
    throw new Error(`citations_fetch_failed:${res.status}`);
  }

  const json = (await res.json()) as ThreadCitationsResponse;
  const items = json.items ?? {};
  return Object.fromEntries(
    Object.entries(items).map(([turnId, value]) => [
      turnId,
      Array.isArray(value) ? value : value?.segments ?? null,
    ])
  );
}

export async function renameThread(
  businessId: string,
  threadId: string,
  title: string
): Promise<AgentThread> {
  const res = await fetch(
    `${getBaseUrl()}/agent/threads/${threadId}?business_id=${encodeURIComponent(businessId)}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ title }),
    }
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error("thread_not_found");
    if (res.status === 422) throw new Error("invalid_title");
    if (res.status === 503) throw new Error("service_unavailable");
    throw new Error(`rename_failed:${res.status}`);
  }
  return res.json();
}

export async function cancelTurn(
  businessId: string,
  threadId: string,
  turnId: string
): Promise<{ accepted: boolean }> {
  const res = await fetch(
    `${getBaseUrl()}/agent/cancel?business_id=${encodeURIComponent(businessId)}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ thread_id: threadId, turn_id: turnId }),
    }
  );
  if (!res.ok) {
    return { accepted: false };
  }
  return res.json();
}

export async function getPlan(
  businessId: string,
  planId: number | string
): Promise<AgentPlan> {
  const res = await fetch(
    `${getBaseUrl()}/actions/plans/${planId}?business_id=${encodeURIComponent(businessId)}`,
    { headers: getAuthHeaders() }
  );
  if (!res.ok) {
    throw new Error(`plan_fetch_failed:${res.status}`);
  }
  return res.json();
}

async function getWebpageCatalogPage(
  businessId: string,
  page: number
): Promise<{ items: WebpageItem[]; totalPages: number }> {
  const params = new URLSearchParams({
    business_id: businessId,
    page: String(page),
    page_size: String(CATALOG_PAGE_SIZE),
  });
  const res = await fetch(
    `${getBaseUrl()}/strategies/webpages?${params.toString()}`,
    { headers: getAuthHeaders() }
  );
  if (!res.ok) {
    throw new Error(`webpages_fetch_failed:${res.status}`);
  }
  const json = (await res.json()) as WebpagesCatalogResponse;
  return {
    items: json.output_data?.items ?? [],
    totalPages: json.output_data?.pagination?.total_pages ?? 1,
  };
}

export async function getWebpageCatalog(
  businessId: string
): Promise<Map<string, WebpageItem>> {
  const first = await getWebpageCatalogPage(businessId, 1);
  const allItems = [...first.items];

  if (first.totalPages > 1) {
    const remaining = Array.from({ length: first.totalPages - 1 }, (_, i) => i + 2);
    const pages = await Promise.all(
      remaining.map((page) => getWebpageCatalogPage(businessId, page))
    );
    pages.forEach(({ items }) => allItems.push(...items));
  }

  const catalog = new Map<string, WebpageItem>();
  allItems.forEach((item) => {
    if (item.page_id) catalog.set(item.page_id, item);
  });
  return catalog;
}

export type ChatRequestMetadata = {
  view?: {
    resource?: { type: string; id: number | string };
    selected_item_ids?: string[];
  };
  intent?: { kind: string; payload?: Record<string, unknown> };
  calendar_events?: string[];
  budget?: "low" | "medium" | "high";
};

export async function startChatStream(
  businessId: string,
  message: string | null,
  threadId: string | null,
  metadata?: ChatRequestMetadata
): Promise<Response> {
  const body: Record<string, unknown> = {
    thread_id: threadId,
  };
  if (message) body.message = message;
  if (metadata) body.metadata = metadata;

  const res = await fetch(
    `${getBaseUrl()}/agent/chat?business_id=${encodeURIComponent(businessId)}`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    throw new Error(`chat_failed:${res.status}`);
  }
  return res;
}
