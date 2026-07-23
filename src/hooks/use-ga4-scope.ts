import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";

export type Ga4IngestionStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped"
  | null;

export interface Ga4ScopeSettings {
  desiredPagePathScope: string | null;
  currentPagePathScope: string | null;
  desiredRevision: number;
  currentRevision: number;
  status: Ga4IngestionStatus;
  stage: string | null;
  progress: number | null;
  error: string | null;
}

export interface UpdateGa4ScopeInput {
  businessUniqueId: string;
  pagePathScope: string | null;
}

interface RawGa4ScopeSettings {
  desiredPagePathScope?: unknown;
  currentPagePathScope?: unknown;
  desiredScope?: unknown;
  currentScope?: unknown;
  pagePathScope?: unknown;
  revision?: unknown;
  desiredRevision?: unknown;
  currentRevision?: unknown;
  status?: unknown;
  stage?: unknown;
  progress?: unknown;
  error?: unknown;
  Ga4IngestionStatus?: unknown;
  Ga4IngestionStage?: unknown;
  Ga4IngestionProgress?: unknown;
  Ga4IngestionError?: unknown;
}

interface Ga4ScopeEnvelope {
  data?: RawGa4ScopeSettings;
  err?: boolean;
  success?: boolean;
  message?: string;
}

export const GA4_SCOPE_QUERY_KEY = "ga4-scope";
const ACTIVE_STATUSES: Ga4IngestionStatus[] = ["queued", "in_progress"];
const ACTIVE_STAGES = new Set([
  "queued",
  "validating",
  "deleting",
  "ingesting",
  "refreshing",
]);

function normalizePathScope(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStatus(value: unknown): Ga4IngestionStatus {
  return value === "queued" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "failed" ||
    value === "skipped"
    ? value
    : null;
}

function normalizeProgress(value: unknown): number | null {
  let candidate = value;
  if (value && typeof value === "object") {
    const progress = value as Record<string, unknown>;
    candidate =
      progress.percentage ??
      progress.percent ??
      progress.progress ??
      progress.value;

    if (candidate === undefined) {
      const completed = Number(progress.completed ?? progress.completedJobs);
      const total = Number(progress.total ?? progress.totalJobs);
      candidate =
        Number.isFinite(completed) && Number.isFinite(total) && total > 0
          ? (completed / total) * 100
          : undefined;
    }
  }

  const numeric = typeof candidate === "number" ? candidate : Number(candidate);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(100, Math.max(0, numeric));
}

function unwrapResponse(response: RawGa4ScopeSettings | Ga4ScopeEnvelope): RawGa4ScopeSettings {
  const envelope = response as Ga4ScopeEnvelope;
  if (envelope.err === true || envelope.success === false) {
    throw new Error(envelope.message || "Failed to load GA4 data scope");
  }
  return envelope.data ?? (response as RawGa4ScopeSettings);
}

function normalizeResponse(response: RawGa4ScopeSettings | Ga4ScopeEnvelope): Ga4ScopeSettings {
  const data = unwrapResponse(response);
  const desiredPagePathScope = normalizePathScope(
    data.desiredPagePathScope ?? data.desiredScope ?? data.pagePathScope
  );
  const currentPagePathScope = normalizePathScope(
    data.currentPagePathScope ?? data.currentScope ?? data.pagePathScope
  );
  const desiredRevision = Number(data.desiredRevision ?? data.revision ?? 0);
  const currentRevision = Number(data.currentRevision ?? data.revision ?? 0);
  const stage = data.stage ?? data.Ga4IngestionStage;
  const error = data.error ?? data.Ga4IngestionError;

  return {
    desiredPagePathScope,
    currentPagePathScope,
    desiredRevision: Number.isFinite(desiredRevision) ? desiredRevision : 0,
    currentRevision: Number.isFinite(currentRevision) ? currentRevision : 0,
    status: normalizeStatus(data.status ?? data.Ga4IngestionStatus),
    stage:
      typeof stage === "string" && stage.trim()
        ? stage.trim()
        : null,
    progress: normalizeProgress(data.progress ?? data.Ga4IngestionProgress),
    error:
      typeof error === "string" && error.trim()
        ? error.trim()
        : error &&
            typeof error === "object" &&
            typeof (error as { message?: unknown }).message === "string"
          ? String((error as { message: string }).message).trim() || null
          : null,
  };
}

function invalidateGa4Consumers(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const rootKey = query.queryKey[0];
      return (
        typeof rootKey === "string" &&
        /(ga4|analytics|conversion|driver|health|anomal|report)/i.test(rootKey)
      );
    },
  });
  void queryClient.invalidateQueries({ queryKey: ["businessProfiles"] });
  void queryClient.invalidateQueries({ queryKey: ["linkedBusinesses"] });
}

export function isGa4IngestionActive(status: Ga4IngestionStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function isGa4ScopeReplacementPending(
  settings: Ga4ScopeSettings | null | undefined
): boolean {
  return Boolean(
    settings &&
      (settings.desiredRevision !== settings.currentRevision ||
        settings.desiredPagePathScope !== settings.currentPagePathScope)
  );
}

export function isGa4ScopeReplacementActive(
  settings: Ga4ScopeSettings | null | undefined
): boolean {
  if (!isGa4ScopeReplacementPending(settings)) return false;
  return (
    isGa4IngestionActive(settings?.status ?? null) ||
    ACTIVE_STAGES.has(String(settings?.stage || "").toLowerCase())
  );
}

export function useGa4Scope(
  businessUniqueId: string | null | undefined,
  options: { enabled?: boolean } = {}
) {
  const queryClient = useQueryClient();
  const previousActiveRef = useRef<boolean | undefined>(undefined);
  const queryKey = [GA4_SCOPE_QUERY_KEY, businessUniqueId] as const;

  const query = useQuery<Ga4ScopeSettings, Error>({
    queryKey,
    queryFn: async () => {
      if (!businessUniqueId) {
        throw new Error("Business ID is required");
      }
      const response = await api.get<RawGa4ScopeSettings | Ga4ScopeEnvelope>(
        `/profile/ga4-page-path-settings?businessUniqueId=${encodeURIComponent(businessUniqueId)}`,
        "node"
      );
      return normalizeResponse(response);
    },
    enabled: options.enabled !== false && Boolean(businessUniqueId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: (activeQuery) => {
      const settings = activeQuery.state.data;
      return isGa4ScopeReplacementActive(settings) ||
        isGa4ScopeReplacementPending(settings)
        ? 3_000
        : false;
    },
  });

  const updateMutation = useMutation<Ga4ScopeSettings, Error, UpdateGa4ScopeInput>({
    mutationFn: async (input) => {
      const response = await api.put<RawGa4ScopeSettings | Ga4ScopeEnvelope>(
        "/profile/ga4-page-path-settings",
        "node",
        input
      );
      return normalizeResponse(response);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData([GA4_SCOPE_QUERY_KEY, variables.businessUniqueId], data);
      invalidateGa4Consumers(queryClient);
    },
  });

  useEffect(() => {
    const nextActive =
      isGa4ScopeReplacementActive(query.data) ||
      isGa4ScopeReplacementPending(query.data);
    const previousActive = previousActiveRef.current;
    previousActiveRef.current = nextActive;

    if (
      previousActive !== undefined &&
      previousActive &&
      !nextActive
    ) {
      invalidateGa4Consumers(queryClient);
    }
  }, [query.data, queryClient]);

  return {
    ...query,
    updateScope: updateMutation.mutateAsync,
    isSaving: updateMutation.isPending,
    saveError: updateMutation.error,
    resetSaveError: updateMutation.reset,
  };
}
