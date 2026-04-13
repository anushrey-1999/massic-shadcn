import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/hooks/use-api";
import { cleanEscapedContent } from "@/utils/content-cleaner";

export type ExpressPitchTactic = {
  priority: number;
  tactic: string;
  context: string;
};

export type ExpressPitch = {
  url?: string;
  segment?: number;
  tier?: number;
  tier_label?: string;
  why?: string;
  tactics?: ExpressPitchTactic[];
  [key: string]: any;
};

function toStringOrJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isNonNullObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function coerceExpressPitch(value: unknown): ExpressPitch | null {
  if (!isNonNullObject(value)) return null;

  const tacticsRaw = (value as any).tactics;
  const tactics: ExpressPitchTactic[] | undefined = Array.isArray(tacticsRaw)
    ? (tacticsRaw
        .map((t: unknown) => {
          if (!isNonNullObject(t)) return null;
          const priority = Number((t as any).priority);
          const tactic = String((t as any).tactic || "");
          const context = String((t as any).context || "");
          if (!Number.isFinite(priority) || !tactic.trim() || !context.trim()) return null;
          return { priority, tactic, context };
        })
        .filter(Boolean) as ExpressPitchTactic[])
    : undefined;

  const result: ExpressPitch = {
    ...(value as any),
    url: (value as any).url != null ? String((value as any).url) : undefined,
    segment: (value as any).segment != null ? Number((value as any).segment) : undefined,
    tier: (value as any).tier != null ? Number((value as any).tier) : undefined,
    tier_label:
      (value as any).tier_label != null ? String((value as any).tier_label) : undefined,
    why: (value as any).why != null ? String((value as any).why) : undefined,
    tactics,
  };

  const hasAnyUsefulField =
    Boolean(result.url?.trim()) ||
    Boolean(result.tier_label?.trim()) ||
    Boolean(result.why?.trim()) ||
    Boolean(result.tactics?.length) ||
    Number.isFinite(result.tier) ||
    Number.isFinite(result.segment);

  return hasAnyUsefulField ? result : null;
}

export function extractExpressPitch(payload: unknown): ExpressPitch | null {
  const asAny = payload as any;

  const candidates: unknown[] = [
    asAny?.express_pitch,
    asAny?.output_data?.quicky?.express_pitch,
    asAny?.output_data?.express_pitch,
    asAny?.output_data?.output_data?.quicky?.express_pitch,
  ];

  for (const candidate of candidates) {
    const coerced = coerceExpressPitch(candidate);
    if (coerced) return coerced;
  }

  return null;
}

function getSnapshotSections(payload: any): Record<string, unknown> | null {
  const direct = payload?.express_pitch?.sections;
  if (direct && typeof direct === "object") return direct;

  const nested = payload?.output_data?.quicky?.express_pitch?.sections;
  if (nested && typeof nested === "object") return nested;

  return null;
}

function formatSectionTitle(key: string): string {
  if (key === "executive_summary") return "Executive Summary";
  if (key === "segment_direction") return "Segment Direction";
  if (key === "top_opportunities") return "Top Opportunities";
  if (key === "top_strengths") return "Top Strengths";
  if (key === "roadmap_30_60_90") return "30 / 60 / 90 Day Roadmap";

  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function extractSnapshotSectionsMarkdown(payload: unknown): string | null {
  const sections = getSnapshotSections(payload as any);
  if (!sections) return null;

  const preferredOrder = [
    "executive_summary",
    "segment_direction",
    "top_opportunities",
    "top_strengths",
    "roadmap_30_60_90",
  ];

  const entries = Object.entries(sections);
  if (entries.length === 0) return null;

  const orderedKeys = [
    ...preferredOrder.filter((k) => Object.prototype.hasOwnProperty.call(sections, k)),
    ...entries
      .map(([k]) => k)
      .filter((k) => !preferredOrder.includes(k))
      .sort((a, b) => a.localeCompare(b)),
  ];

  const parts: string[] = [];

  for (const key of orderedKeys) {
    const raw = (sections as any)[key];
    const content = cleanEscapedContent(toStringOrJson(raw)).trim();
    if (!content) continue;
    parts.push(`## ${formatSectionTitle(key)}\n\n${content}`);
  }

  const result = parts.join("\n\n").trim();
  return result.length > 0 ? result : null;
}

export function extractDetailedSectionsMarkdown(payload: unknown): string | null {
  const sections = getDetailedSections(payload as any);
  if (!sections) return null;

  const order = [
    "executive_summary",
    "business_snapshot",
    "current_snapshot",
    "topics_and_audiences",
    "uncovered_opportunities",
    "landscape_and_channels",
    "conclusion",
  ];

  const parts: string[] = [];

  for (const key of order) {
    const raw = (sections as any)[key];
    if (!raw) continue;
    
    const content = cleanEscapedContent(toStringOrJson(raw)).trim();
    if (!content) continue;
    
    // For detailed pitch, the sections often come with their own headers or formatting.
    // We append them directly.
    parts.push(content);
  }

  const result = parts.join("\n\n").trim();
  return result.length > 0 ? result : null;
}

function getDetailedSections(payload: any): Record<string, unknown> | null {
  const direct = payload?.pitches?.sections;
  if (direct && typeof direct === "object") return direct;

  const nested = payload?.output_data?.pitches?.sections;
  if (nested && typeof nested === "object") return nested;
  
  // Fallback: check if payload itself is the sections object (unlikely for detailed but possible)
  if (payload?.executive_summary && payload?.business_snapshot) {
      return payload;
  }

  return null;
}

function extractReportText(payload: unknown): string {
  if (payload == null) return "";
  if (typeof payload === "string") return payload;

  const snapshotMarkdown = extractSnapshotSectionsMarkdown(payload);
  if (snapshotMarkdown) return snapshotMarkdown;

  const detailedMarkdown = extractDetailedSectionsMarkdown(payload);
  if (detailedMarkdown) return detailedMarkdown;

  const asAny = payload as any;

  const candidates: unknown[] = [
    asAny?.report,
    asAny?.content,
    asAny?.text,
    asAny?.result,
    asAny?.output,
    asAny?.data,
    asAny?.output_data?.report,
    asAny?.output_data?.content,
    asAny?.output_data?.pitch,
    asAny?.output_data?.quicky,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }

  return toStringOrJson(payload);
}

type ReportStatus = "pending" | "processing" | "success" | "error" | string;

export type ReportStatusResponse = {
  status?: ReportStatus;
  output_data?: {
    output_path?: string;
    download_url?: string;
    [key: string]: any;
  };
  [key: string]: any;
};

function normalizeStatus(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function extractSubscriptionError(error: any): string | null {
  if (!error) return null;

  const response = error?.response;
  if (!response) return null;

  const status = response.status;
  if (status !== 403) return null;

  const data = response.data;
  if (!data) return null;

  const detail = data.detail;
  if (!detail) return null;

  // Handle string detail
  if (typeof detail === "string") return detail;

  // Handle object detail
  if (typeof detail === "object") {
    // Try to get message property
    const message = detail.message;
    if (typeof message === "string" && message) return message;

    // Try to stringify the detail object to show it
    try {
      const jsonStr = JSON.stringify(detail);
      if (jsonStr && jsonStr !== '{}') return jsonStr;
    } catch {
      // Ignore stringify errors
    }
  }

  return null;
}

function is403Error(error: any): boolean {
  return error?.response?.status === 403;
}

export function useStartQuickyReport() {
  const queryClient = useQueryClient();
  return useMutation<ReportStatusResponse, Error, { businessId: string }>({
    mutationFn: async ({ businessId }) => {
      if (!businessId) {
        throw new Error("Business ID is required");
      }

      return api.post<ReportStatusResponse>("/client/quicky", "python", undefined, {
        params: { business_id: businessId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pitches"] });
    },
    onError: (error) => {
      if (is403Error(error)) {
        const subscriptionError = extractSubscriptionError(error);
        if (subscriptionError) {
          toast.error("Subscription Required", {
            description: subscriptionError,
          });
          return;
        }
      }

      const errorMessage = error.message || "Please try again.";
      toast.error("Failed to start snapshot", {
        description: errorMessage,
      });
    },
  });
}

export function useQuickyReportStatus(params: {
  businessId: string | null;
  enabled: boolean;
}) {
  const { businessId, enabled } = params;

  return useQuery<ReportStatusResponse | null>({
    queryKey: ["quicky", "status", businessId],
    queryFn: async () => {
      if (!businessId) return null;
      try {
        return await api.get<ReportStatusResponse>("/client/quicky", "python", {
          params: { business_id: businessId },
        });
      } catch (error: any) {
        if (error?.response?.status === 403) return null;
        throw error;
      }
    },
    enabled: enabled && !!businessId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchInterval: (query) => {
      const data = query.state.data as ReportStatusResponse | null;
      const status = normalizeStatus(data?.status);
      return status === "pending" || status === "processing" ? 4000 : false;
    },
  });
}

export function useFetchReportFromDownloadUrl() {
  return useMutation<
    { content: string; expressPitch: ExpressPitch | null; payload: unknown },
    Error,
    { downloadUrl: string }
  >({
    mutationFn: async ({ downloadUrl }) => {
      if (!downloadUrl) {
        throw new Error("download_url is required");
      }

      const response = await api.get(downloadUrl, "python");
      return {
        content: cleanEscapedContent(extractReportText(response)),
        expressPitch: extractExpressPitch(response),
        payload: response,
      };
    },
    onError: (error) => {
      toast.error("Failed to fetch report", {
        description: error.message || "Please try again.",
      });
    },
  });
}

export function useGenerateQuickyReport() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, { businessId: string }>({
    mutationFn: async ({ businessId }) => {
      if (!businessId) {
        throw new Error("Business ID is required");
      }

      const response = await api.post("/client/quicky", "python", undefined, {
        params: { business_id: businessId },
      });
      return cleanEscapedContent(extractReportText(response));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pitches"] });
    },
    onError: (error) => {
      if (is403Error(error)) {
        const subscriptionError = extractSubscriptionError(error);
        if (subscriptionError) {
          toast.error("Subscription Required", {
            description: subscriptionError,
          });
          return;
        }
      }

      const errorMessage = error.message || "Please try again.";
      toast.error("Failed to generate snapshot", {
        description: errorMessage,
      });
    },
  });
}

export function useGenerateDetailedPitch() {
  return useMutation<string, Error, { businessId: string }>({
    mutationFn: async ({ businessId }) => {
      if (!businessId) {
        throw new Error("Business ID is required");
      }

      const response = await api.post("/client/pitches", "python", undefined, {
        params: { business_id: businessId },
      });
      return cleanEscapedContent(extractReportText(response));
    },
    onError: (error) => {
      if (is403Error(error)) {
        const subscriptionError = extractSubscriptionError(error);
        if (subscriptionError) {
          toast.error("Subscription Required", {
            description: subscriptionError,
          });
          return;
        }
      }

      const errorMessage = error.message || "Please try again.";
      toast.error("Failed to generate detailed pitch", {
        description: errorMessage,
      });
    },
  });
}

export function usePitchSummary(
  businessId: string | null,
  options?: { requestKey?: string }
) {
  return useQuery<{ content: string; status: string } | null, Error>({
    queryKey: ["pitch-summary", businessId, options?.requestKey ?? "default"],
    queryFn: async () => {
      if (!businessId) return null;

      try {
        const response = await api.get<ReportStatusResponse>("/client/quicky", "python", {
          params: { business_id: businessId },
        });

        const status = normalizeStatus(response?.status);

        let content = "";
        const snapshotMarkdown = extractSnapshotSectionsMarkdown(response);

        if (snapshotMarkdown) {
          content = snapshotMarkdown;
        } else {
          const downloadUrl = response?.output_data?.download_url;
          if (downloadUrl) {
            const reportResponse = await api.get(downloadUrl, "python");
            content = cleanEscapedContent(extractReportText(reportResponse));
          }
        }

        return {
          content: content || "",
          status,
        };
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!businessId,
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data as { content: string; status: string } | null;
      const status = normalizeStatus(data?.status);
      return status === "pending" || status === "processing" ? 4000 : false;
    },
  });
}
