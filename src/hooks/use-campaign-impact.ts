"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import type { CampaignApiResponse, CampaignEvent, CampaignImpactReport, CampaignInput, CampaignPreview } from "@/types/campaign-impact";

const keys = {
  all: (businessId: string) => ["campaign-impact", businessId] as const,
  list: (businessId: string, filters: Record<string, string>) => ["campaign-impact", businessId, "list", filters] as const,
  detail: (businessId: string, id: string) => ["campaign-impact", businessId, "detail", id] as const,
  impact: (businessId: string, id: string) => ["campaign-impact", businessId, "impact", id] as const,
};

function queryString(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params.toString();
}

export function useCampaignEvents(businessId: string, filters: Record<string, string> = {}, enabled = true) {
  return useQuery({
    queryKey: keys.list(businessId, filters),
    queryFn: async () => (await api.get<CampaignApiResponse<CampaignEvent[]>>(`/analytics/campaign-events?${queryString({ businessId, ...filters })}`, "node")).data,
    enabled: Boolean(businessId && enabled), staleTime: 30_000, refetchOnMount: "always",
  });
}

export function useCampaignEvent(businessId: string, id: string) {
  return useQuery({ queryKey: keys.detail(businessId, id), queryFn: async () => (await api.get<CampaignApiResponse<CampaignEvent>>(`/analytics/campaign-events/${encodeURIComponent(id)}`, "node")).data, enabled: Boolean(businessId && id) });
}

export function useCampaignImpactReport(businessId: string, id: string) {
  return useQuery({ queryKey: keys.impact(businessId, id), queryFn: async () => (await api.get<CampaignApiResponse<CampaignImpactReport>>(`/analytics/campaign-events/${encodeURIComponent(id)}/impact`, "node", { timeout: 300_000 })).data, enabled: Boolean(businessId && id), staleTime: 60_000, retry: 1 });
}

export function useCampaignMutations(businessId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: keys.all(businessId) });
  const preview = useMutation({ mutationFn: async (input: CampaignInput) => (await api.post<CampaignApiResponse<CampaignPreview>>("/analytics/campaign-events/preview", "node", input)).data });
  const create = useMutation({ mutationFn: async ({ input, idempotencyKey }: { input: CampaignInput; idempotencyKey: string }) => (await api.post<CampaignApiResponse<CampaignEvent>>("/analytics/campaign-events", "node", { ...input, idempotencyKey }, { headers: { "Idempotency-Key": idempotencyKey } })).data, onSuccess: invalidate });
  const update = useMutation({ mutationFn: async ({ id, input, expectedVersion }: { id: string; input: Partial<CampaignInput>; expectedVersion: number }) => (await api.patch<CampaignApiResponse<CampaignEvent>>(`/analytics/campaign-events/${encodeURIComponent(id)}`, "node", { ...input, expectedVersion })).data, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/analytics/campaign-events/${encodeURIComponent(id)}`, "node"), onSuccess: invalidate });
  const share = useMutation({ mutationFn: async ({ id, emails, idempotencyKey }: { id: string; emails: string[]; idempotencyKey: string }) => (await api.post<CampaignApiResponse<{ snapshotId: string }>>(`/analytics/campaign-events/${encodeURIComponent(id)}/share`, "node", { emails, idempotencyKey }, { headers: { "Idempotency-Key": idempotencyKey }, timeout: 300_000 })).data, onSuccess: invalidate });
  return { preview, create, update, remove, share };
}

export async function downloadCampaignImpactPdf(id: string, snapshotId?: string) {
  const path = snapshotId
    ? `/analytics/campaign-events/${encodeURIComponent(id)}/snapshots/${encodeURIComponent(snapshotId)}/pdf`
    : `/analytics/campaign-events/${encodeURIComponent(id)}/pdf`;
  return api.get<Blob>(path, "node", { responseType: "blob", timeout: 300_000 });
}
