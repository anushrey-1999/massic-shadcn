import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/hooks/use-api";
import { cleanEscapedContent } from "@/utils/content-cleaner";

function toStringOrJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
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

function extractReportText(payload: unknown): string {
  if (payload == null) return "";
  if (typeof payload === "string") return payload;

  const snapshotMarkdown = extractSnapshotSectionsMarkdown(payload);
  if (snapshotMarkdown) return snapshotMarkdown;

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

export function useStartQuickyReport() {
  return useMutation<ReportStatusResponse, Error, { businessId: string }>({
    mutationFn: async ({ businessId }) => {
      if (!businessId) {
        throw new Error("Business ID is required");
      }

      return api.post<ReportStatusResponse>("/client/quicky", "python", undefined, {
        params: { business_id: businessId },
      });
    },
    onError: (error) => {
      toast.error("Failed to start snapshot", {
        description: error.message || "Please try again.",
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
      return api.get<ReportStatusResponse>("/client/quicky", "python", {
        params: { business_id: businessId },
      });
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
  return useMutation<string, Error, { downloadUrl: string }>({
    mutationFn: async ({ downloadUrl }) => {
      if (!downloadUrl) {
        throw new Error("download_url is required");
      }

      const response = await api.get(downloadUrl, "python");
      return cleanEscapedContent(extractReportText(response));
    },
    onError: (error) => {
      toast.error("Failed to fetch report", {
        description: error.message || "Please try again.",
      });
    },
  });
}

export function useGenerateQuickyReport() {
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
    onError: (error) => {
      toast.error("Failed to generate snapshot", {
        description: error.message || "Please try again.",
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
      toast.error("Failed to generate detailed pitch", {
        description: error.message || "Please try again.",
      });
    },
  });
}
