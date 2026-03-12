import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/hooks/use-api";
import type {
  AuditIssue,
  CategoryKey,
  Impact,
} from "@/components/organisms/TechinicalAudit/types";

type TechAuditStatus = "in_progress" | "finished" | (string & {});

type TechAuditPostResponse = {
  task_id?: string;
  taskId?: string;
  data?: { task_id?: string; taskId?: string };
  [key: string]: any;
};

type TechAuditGetResponse = {
  status?: TechAuditStatus;
  site?: {
    domain?: string;
    cms?: string;
    health_score?: number;
    pages_crawled?: number;
    last_crawled?: string;
    score_delta?: { delta?: number; direction?: "up" | "down" | string };
    [key: string]: any;
  };
  categories?: Record<
    string,
    {
      error?: number;
      warning?: number;
      notice?: number;
      total?: number;
      [key: string]: any;
    }
  >;
  result?: {
    site?: {
      domain?: string;
      cms?: string;
      health_score?: number;
      pages_crawled?: number;
      last_crawled?: string;
      score_delta?: { delta?: number; direction?: "up" | "down" | string };
      [key: string]: any;
    };
    categories?: Record<
      string,
      {
        error?: number;
        warning?: number;
        notice?: number;
        total?: number;
        [key: string]: any;
      }
    >;
    issues?: any[];
    domain_health?: any[];
    [key: string]: any;
  };
  data?: any;
  issues?: any[];
  [key: string]: any;
};

export type TechAuditDomainHealthItem = {
  key: string;
  label: string;
  passing: boolean;
  severity: "error" | "warning" | "notice" | (string & {});
  meta?: Record<string, any> | null;
};

export type TechAuditViewModel = {
  status: TechAuditStatus | null;
  raw: TechAuditGetResponse | null;
  healthScore: number | null;
  scoreDeltaLabel: string | null;
  pagesCrawled: number | null;
  lastUpdatedAt: Date | null;
  domainHealth: TechAuditDomainHealthItem[];
  categoryKeys: CategoryKey[];
  categoryCounts: Record<
    CategoryKey,
    { total: number; critical: number; warning: number; notice: number }
  >;
  issues: AuditIssue[];
};

const TECH_AUDIT_KEY = "techAudit";

function normalizeDomain(input: string): string | null {
  const raw = String(input || "").trim();
  if (!raw) return null;

  // Handle Google Search Console style properties like:
  // - sc-domain:example.com
  // - domain:example.com
  // and other common prefixes.
  let pre = raw.trim();
  pre = pre.replace(/^sc-domain\s*:\s*/i, "");
  pre = pre.replace(/^domain\s*:\s*/i, "");
  pre = pre.replace(/^url\s*:\s*/i, "");
  pre = pre.replace(/^site\s*:\s*/i, "");
  // Only keep the first token if someone pasted "example.com something".
  pre = pre.split(/\s|,/)[0] ?? "";
  // Remove protocol + www early; URL parsing below also handles it.
  pre = pre.replace(/^https?:\/\//i, "");
  pre = pre.replace(/^www\./i, "");
  // Remove any path/query/hash if still present.
  pre = pre.split(/[/?#]/)[0] ?? "";
  pre = pre.trim();
  if (!pre) return null;

  const toRegistrableDomain = (host: string): string | null => {
    const normalized = host
      .trim()
      .toLowerCase()
      .replace(/\.+$/g, "")
      .replace(/^\.+/g, "")
      .replace(/^www\./, "");

    if (!normalized) return null;

    // Drop port if present (fallback path branch may include it).
    const noPort = normalized.split(":")[0]?.trim() || "";
    const parts = noPort.split(".").filter(Boolean);
    if (parts.length <= 1) return noPort || null;
    if (parts.length === 2) return parts.join(".");

    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];

    // Heuristic for common 2-part public suffixes like co.uk, com.au, etc.
    const commonSecondLevelTlds = new Set([
      "ac",
      "co",
      "com",
      "edu",
      "gov",
      "net",
      "org",
    ]);
    const isLikelyTwoPartSuffix = tld.length === 2 && commonSecondLevelTlds.has(sld);
    if (isLikelyTwoPartSuffix && parts.length >= 3) {
      return parts.slice(-3).join(".");
    }

    return parts.slice(-2).join(".");
  };

  try {
    const withProto = pre.includes("://") ? pre : `https://${pre}`;
    const url = new URL(withProto);
    return toRegistrableDomain(url.hostname);
  } catch {
    return toRegistrableDomain(pre);
  }
}

function toCategoryKey(value: unknown): CategoryKey {
  const v = String(value || "").toLowerCase().trim();
  if (v.includes("perf") || v.includes("speed") || v.includes("core web vitals")) return "performance";
  if (v.includes("access")) return "accessibility";
  if (v.includes("sec") || v.includes("tls") || v.includes("ssl")) return "security";
  if (v.includes("link") || v.includes("broken")) return "links";
  if (v.includes("content") || v.includes("meta") || v.includes("title") || v.includes("heading"))
    return "content";
  if (v) return "technical";
  return "technical";
}

function toImpact(value: unknown): Impact {
  const v = String(value || "").toLowerCase().trim();
  if (v === "high" || v === "critical" || v === "severe" || v === "p0") return "high";
  if (v === "error") return "high";
  if (v === "medium" || v === "moderate" || v === "p1") return "medium";
  if (v === "warning") return "medium";
  if (v === "low" || v === "minor" || v === "p2" || v === "p3") return "low";
  if (v === "notice") return "low";
  const n = typeof value === "number" ? value : Number.isFinite(Number(v)) ? Number(v) : null;
  if (n != null) {
    if (n >= 0.67) return "high";
    if (n >= 0.34) return "medium";
    return "low";
  }
  return "low";
}

function slugifyId(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function coerceStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value === "string") return value ? [value] : [];
  return [];
}

function mapIssuesFromResponse(res: TechAuditGetResponse | null): AuditIssue[] {
  if (!res) return [];
  const issuesRaw = (Array.isArray(res.result?.issues) ? res.result?.issues : null) ??
    (Array.isArray(res.issues) ? res.issues : null) ??
    (Array.isArray(res.data?.issues) ? res.data.issues : null) ??
    (Array.isArray(res.data?.data?.issues) ? res.data.data.issues : null);

  if (!Array.isArray(issuesRaw)) return [];

  return issuesRaw
    .map((i: any): AuditIssue | null => {
      const title =
        (typeof i?.title === "string" && i.title) ||
        (typeof i?.name === "string" && i.name) ||
        (typeof i?.issue === "string" && i.issue) ||
        "Untitled issue";

      const category = toCategoryKey(i?.category ?? i?.type ?? i?.group ?? i?.section);
      const description =
        (typeof i?.description === "string" && i.description) ||
        (typeof i?.details === "string" && i.details) ||
        (typeof i?.summary === "string" && i.summary) ||
        "";

      const impact = toImpact(i?.impact ?? i?.severity ?? i?.priority ?? i?.score);
      const affectedPages =
        Array.isArray(i?.affected_pages)
          ? i.affected_pages
              .map((p: any) => p?.url)
              .filter((u: any) => typeof u === "string" && u.length > 0)
          : coerceStringArray(
              i?.affectedPages ?? i?.affected_pages ?? i?.pages ?? i?.urls ?? i?.affected_urls
            );
      const solutionSteps = coerceStringArray(
        i?.solutionSteps ?? i?.solution_steps ?? i?.steps ?? i?.recommendations ?? i?.solution
      );

      const providedId =
        (typeof i?.id === "string" && i.id) ||
        (typeof i?.issue_id === "string" && i.issue_id) ||
        (typeof i?.key === "string" && i.key) ||
        null;
      const id = providedId || `${category}-${slugifyId(title) || "issue"}`;

      return {
        id,
        title,
        category,
        description,
        impact,
        affectedPages,
        solutionSteps,
      };
    })
    .filter((x): x is AuditIssue => Boolean(x));
}

function mapMetaFromResponse(res: TechAuditGetResponse | null): Pick<
  TechAuditViewModel,
  "healthScore" | "pagesCrawled" | "lastUpdatedAt" | "status" | "scoreDeltaLabel"
> {
  if (!res) {
    return {
      healthScore: null,
      scoreDeltaLabel: null,
      pagesCrawled: null,
      lastUpdatedAt: null,
      status: null,
    };
  }

  const status = (res.status ?? res.data?.status ?? res.data?.data?.status ?? null) as
    | TechAuditStatus
    | null;

  const healthScoreRaw =
    res.result?.site?.health_score ??
    res.site?.health_score ??
    res.health_score ??
    res.healthScore ??
    res.data?.site?.health_score ??
    res.data?.health_score ??
    res.data?.healthScore ??
    res.data?.score ??
    res.score ??
    null;
  const healthScore =
    typeof healthScoreRaw === "number"
      ? healthScoreRaw
      : Number.isFinite(Number(healthScoreRaw))
        ? Number(healthScoreRaw)
        : null;

  const pagesCrawledRaw =
    res.result?.site?.pages_crawled ??
    res.site?.pages_crawled ??
    res.pages_crawled ??
    res.pagesCrawled ??
    res.data?.site?.pages_crawled ??
    res.data?.pages_crawled ??
    res.data?.pagesCrawled ??
    res.data?.pages ??
    res.pages ??
    null;
  const pagesCrawled =
    typeof pagesCrawledRaw === "number"
      ? pagesCrawledRaw
      : Number.isFinite(Number(pagesCrawledRaw))
        ? Number(pagesCrawledRaw)
        : null;

  const lastUpdatedRaw =
    res.result?.site?.last_crawled ??
    res.site?.last_crawled ??
    res.last_crawled ??
    res.last_updated ??
    res.lastUpdated ??
    res.updated_at ??
    res.updatedAt ??
    res.data?.site?.last_crawled ??
    res.data?.last_crawled ??
    res.data?.last_updated ??
    res.data?.updated_at ??
    res.data?.lastUpdated ??
    res.data?.updatedAt ??
    null;

  const parseTimestamp = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const raw = String(value).trim();
    if (!raw) return null;

    // API returns: "2026-03-09 11:16:48 +00:00" (not consistently parseable by Date()).
    // Normalize to ISO-ish: "2026-03-09T11:16:48+00:00"
    const normalized = raw
      .replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+([+-]\d{2}:\d{2})$/, "$1T$2$3")
      .replace(" +", "+");

    const d = new Date(normalized);
    if (!Number.isNaN(d.getTime())) return d;

    const d2 = new Date(raw);
    return Number.isNaN(d2.getTime()) ? null : d2;
  };

  const lastUpdatedAt = parseTimestamp(lastUpdatedRaw);

  const scoreDelta =
    res.result?.site?.score_delta ??
    res.site?.score_delta ??
    res.score_delta ??
    res.data?.site?.score_delta ??
    res.data?.score_delta ??
    null;
  const delta = typeof scoreDelta?.delta === "number" ? scoreDelta.delta : null;
  const direction =
    typeof scoreDelta?.direction === "string" ? scoreDelta.direction.toLowerCase() : null;
  const scoreDeltaLabel =
    delta == null
      ? null
      : direction === "down"
        ? `-${delta}`
        : `+${delta}`;

  return {
    status,
    healthScore,
    scoreDeltaLabel,
    pagesCrawled,
    lastUpdatedAt,
  };
}

function emptyCategoryCounts(): Record<
  CategoryKey,
  { total: number; critical: number; warning: number; notice: number }
> {
  return {
    technical: { total: 0, critical: 0, warning: 0, notice: 0 },
    links: { total: 0, critical: 0, warning: 0, notice: 0 },
    content: { total: 0, critical: 0, warning: 0, notice: 0 },
    performance: { total: 0, critical: 0, warning: 0, notice: 0 },
    security: { total: 0, critical: 0, warning: 0, notice: 0 },
    accessibility: { total: 0, critical: 0, warning: 0, notice: 0 },
  };
}

function mapCategoryCountsFromResponse(
  res: TechAuditGetResponse | null
): Record<CategoryKey, { total: number; critical: number; warning: number; notice: number }> {
  const base = emptyCategoryCounts();
  if (!res) return base;

  const categories =
    (res.result?.categories && typeof res.result.categories === "object"
      ? res.result.categories
      : null) ??
    (res.categories && typeof res.categories === "object" ? res.categories : null) ??
    (res.data?.categories && typeof res.data.categories === "object" ? res.data.categories : null) ??
    (res.data?.data?.categories && typeof res.data.data.categories === "object"
      ? res.data.data.categories
      : null);

  if (!categories) return base;

  for (const [label, stats] of Object.entries(categories)) {
    const key = toCategoryKey(label);
    const totalRaw = (stats as any)?.total;
    const errorRaw = (stats as any)?.error;
    const warningRaw = (stats as any)?.warning;
    const noticeRaw = (stats as any)?.notice;

    const total =
      typeof totalRaw === "number"
        ? totalRaw
        : Number.isFinite(Number(totalRaw))
          ? Number(totalRaw)
          : 0;
    const critical =
      typeof errorRaw === "number"
        ? errorRaw
        : Number.isFinite(Number(errorRaw))
          ? Number(errorRaw)
          : 0;
    const warning =
      typeof warningRaw === "number"
        ? warningRaw
        : Number.isFinite(Number(warningRaw))
          ? Number(warningRaw)
          : 0;
    const notice =
      typeof noticeRaw === "number"
        ? noticeRaw
        : Number.isFinite(Number(noticeRaw))
          ? Number(noticeRaw)
          : 0;

    base[key] = { total, critical, warning, notice };
  }

  return base;
}

function mapCategoryKeysFromResponse(res: TechAuditGetResponse | null): CategoryKey[] {
  if (!res) return [];

  const categories =
    (res.result?.categories && typeof res.result.categories === "object"
      ? res.result.categories
      : null) ??
    (res.categories && typeof res.categories === "object" ? res.categories : null) ??
    (res.data?.categories && typeof res.data.categories === "object" ? res.data.categories : null) ??
    (res.data?.data?.categories && typeof res.data.data.categories === "object"
      ? res.data.data.categories
      : null);

  if (!categories) return [];

  const present = new Set<CategoryKey>();
  for (const label of Object.keys(categories)) {
    present.add(toCategoryKey(label));
  }

  const order: CategoryKey[] = [
    "technical",
    "links",
    "content",
    "performance",
    "security",
    "accessibility",
  ];
  return order.filter((k) => present.has(k));
}

function mapDomainHealthFromResponse(res: TechAuditGetResponse | null): TechAuditDomainHealthItem[] {
  if (!res) return [];

  const raw =
    (Array.isArray(res.result?.domain_health) ? res.result?.domain_health : null) ??
    (Array.isArray((res as any).domain_health) ? (res as any).domain_health : null) ??
    (Array.isArray(res.data?.domain_health) ? res.data.domain_health : null) ??
    (Array.isArray(res.data?.result?.domain_health) ? res.data.result.domain_health : null) ??
    null;

  if (!raw) return [];

  return raw
    .map((i: any): TechAuditDomainHealthItem | null => {
      const key = typeof i?.key === "string" ? i.key : null;
      const label = typeof i?.label === "string" ? i.label : null;
      const passing = Boolean(i?.passing);
      const severity = (typeof i?.severity === "string" ? i.severity : "notice") as
        | "error"
        | "warning"
        | "notice"
        | (string & {});
      const meta =
        i?.meta && typeof i.meta === "object" && !Array.isArray(i.meta) ? (i.meta as any) : null;

      if (!key || !label) return null;
      return { key, label, passing, severity, meta };
    })
    .filter((x: TechAuditDomainHealthItem | null): x is TechAuditDomainHealthItem => Boolean(x));
}

export function useTechAudit(params: {
  businessId: string | null;
  website: string | null;
  autoCreateOnMissing?: boolean;
}) {
  const businessId = params.businessId;
  const autoCreateOnMissing = params.autoCreateOnMissing ?? true;
  const queryClient = useQueryClient();
  const domain = useMemo(
    () => (params.website ? normalizeDomain(params.website) : null),
    [params.website]
  );

  const [notFound, setNotFound] = useState(false);
  const autoCreateAttemptedDomainRef = useRef<string | null>(null);
  const forcePollingRef = useRef(false);
  const seenInProgressRef = useRef(false);

  useEffect(() => {
    setNotFound(false);
    autoCreateAttemptedDomainRef.current = null;
    forcePollingRef.current = false;
    seenInProgressRef.current = false;
  }, [businessId, domain]);

  const createMutation = useMutation<TechAuditPostResponse, Error, { domain: string }>({
    mutationFn: async ({ domain }) => {
      const response = await api.post<TechAuditPostResponse>("/tech-audit", "python", {
        domain,
      });
      return response;
    },
    onSuccess: (_data, variables) => {
      // POST creates/refreshes the audit; GET is always keyed by domain now.
      if (!businessId) return;
      const createdDomain = variables.domain;
      autoCreateAttemptedDomainRef.current = createdDomain;
      void queryClient.invalidateQueries({
        queryKey: [TECH_AUDIT_KEY, "detail", businessId, createdDomain],
      });
    },
  });

  const createAuditMutation = createMutation.mutate;
  const createAuditMutationAsync = createMutation.mutateAsync;
  const resetCreateAudit = createMutation.reset;
  const isCreatePending = createMutation.isPending;

  const getQuery = useQuery<TechAuditGetResponse | null>({
    queryKey: [TECH_AUDIT_KEY, "detail", businessId, domain],
    queryFn: async () => {
      if (!domain) return null;
      try {
        const response = await api.get<TechAuditGetResponse>(
          `/tech-audit?domain=${encodeURIComponent(domain)}`,
          "python"
        );
        return response ?? null;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) return null;
        throw err;
      }
    },
    enabled: Boolean(domain) && Boolean(businessId),
    staleTime: 0,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (forcePollingRef.current) return 10000;
      const data = query.state.data;
      const status = (data?.status ?? data?.data?.status ?? null) as TechAuditStatus | null;
      if (status === "finished") return false;
      return 10000;
    },
    retry: 2,
  });

  useEffect(() => {
    const data = getQuery.data ?? null;
    const status = (data?.status ?? data?.data?.status ?? null) as TechAuditStatus | null;
    if (status === "in_progress") {
      seenInProgressRef.current = true;
    }
    if (forcePollingRef.current && seenInProgressRef.current && status === "finished" && !isCreatePending) {
      forcePollingRef.current = false;
    }
  }, [getQuery.data, isCreatePending]);

  useEffect(() => {
    if (!businessId || !domain) return;
    if (!getQuery.isFetched) return;
    if (getQuery.isError) {
      setNotFound(false);
      return;
    }

    const isMissing = getQuery.data == null;
    setNotFound(isMissing);

    if (!autoCreateOnMissing) return;
    if (!isMissing) return;
    if (isCreatePending) return;

    // If GET returns 404/null, auto-create once per domain.
    if (autoCreateAttemptedDomainRef.current === domain) return;
    autoCreateAttemptedDomainRef.current = domain;
    forcePollingRef.current = true;
    seenInProgressRef.current = false;
    resetCreateAudit();
    createAuditMutation({ domain });
  }, [
    businessId,
    domain,
    autoCreateOnMissing,
    getQuery.data,
    getQuery.isError,
    getQuery.isFetched,
    isCreatePending,
    resetCreateAudit,
    createAuditMutation,
  ]);

  const viewModel: TechAuditViewModel = useMemo(() => {
    const raw = getQuery.data ?? null;
    const meta = mapMetaFromResponse(raw);
    const issues = mapIssuesFromResponse(raw);
    const domainHealth = mapDomainHealthFromResponse(raw);
    const categoryKeys = mapCategoryKeysFromResponse(raw);
    const categoryCounts = mapCategoryCountsFromResponse(raw);

    return {
      status: meta.status,
      raw,
      healthScore: meta.healthScore,
      scoreDeltaLabel: meta.scoreDeltaLabel,
      pagesCrawled: meta.pagesCrawled,
      lastUpdatedAt: meta.lastUpdatedAt,
      domainHealth,
      categoryKeys,
      categoryCounts,
      issues,
    };
  }, [getQuery.data]);

  const createAudit = useCallback(async () => {
    if (!businessId || !domain) return null;

    autoCreateAttemptedDomainRef.current = domain;
    forcePollingRef.current = true;
    seenInProgressRef.current = false;
    resetCreateAudit();

    return createAuditMutationAsync({ domain });
  }, [businessId, domain, resetCreateAudit, createAuditMutationAsync]);

  return {
    domain,
    notFound,
    hasFetched: getQuery.isFetched,
    isCreating: createMutation.isPending,
    createError: createMutation.error ?? null,
    isLoading: getQuery.isLoading,
    isFetching: getQuery.isFetching,
    fetchError: (getQuery.error as Error | null) ?? null,
    data: viewModel,
    refetch: getQuery.refetch,
    createAudit,
  };
}

