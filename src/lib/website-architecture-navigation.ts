import type { WebsiteArchitecturePage } from "@/types/website-architecture-types";

export const ARCHITECTURE_QUERY_KEYS = {
  page: "architecturePage",
  perPage: "architecturePerPage",
  search: "architectureSearch",
  sort: "architectureSort",
  filters: "architectureFilters",
  joinOperator: "architectureJoinOperator",
};

export function getArchitectureAction(page: WebsiteArchitecturePage) {
  return page.current_url?.trim() ? "Optimize" : "Generate";
}

function tableParams(search: Pick<URLSearchParams, "get">) {
  const params = new URLSearchParams();
  for (const key of Object.values(ARCHITECTURE_QUERY_KEYS)) {
    const value = search.get(key);
    if (value) params.set(key, value);
  }
  return params;
}

export function architecturePreviewHref(
  businessId: string,
  page: WebsiteArchitecturePage,
  search: Pick<URLSearchParams, "get">,
  inFlight = false,
) {
  const params = tableParams(search);
  const title = page.title?.trim() || page.name?.trim();
  if (title) params.set("title", title.slice(0, 200));
  if (inFlight) params.set("run", getArchitectureAction(page).toLowerCase());
  const path = `/business/${encodeURIComponent(businessId)}/web/architecture/${encodeURIComponent(page.page_id)}/view`;
  return params.size ? `${path}?${params}` : path;
}

export function architectureListHref(businessId: string, search: Pick<URLSearchParams, "get">) {
  const params = tableParams(search);
  params.set("tab", "web-architecture");
  return `/business/${encodeURIComponent(businessId)}/web?${params}`;
}
