"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useAuthStore } from "@/store/auth-store";

export type ContentUsageFeature = "blogs_pages" | "social_posts";
export interface ContentUsageAllowance {
  state:
    "available" | "exhausted" | "unsupported" | "unavailable" | "unlimited";
  current_usage: number | null;
  limit: number | null;
  remaining: number | null;
  credit_funded_executions: number | null;
}
export interface BusinessContentUsage {
  business_id: string;
  plan_type?: string | null;
  billing_period: { start: string; end: string } | null;
  features: Record<ContentUsageFeature, ContentUsageAllowance>;
}
interface ContentUsageResponse {
  success: boolean;
  data: { businesses: BusinessContentUsage[] };
}

export function useContentUsage(businessIds: string[]) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const ids = [...new Set(businessIds.map((id) => id.toLowerCase()))].sort();
  const idsKey = ids.join(",");
  const query = useQuery({
    queryKey: [
      "content-usage",
      user?.accountUniqueId || user?.uniqueId || user?.UniqueId,
      idsKey,
    ],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const businesses: BusinessContentUsage[] = [];
      for (let offset = 0; offset < ids.length; offset += 100) {
        const selected = ids.slice(offset, offset + 100).join(",");
        const response = await api.get<ContentUsageResponse>(
          `/subscription/content-usage?businessIds=${encodeURIComponent(selected)}`,
          "node",
        );
        if (!response.success) throw new Error("Unable to load content usage");
        businesses.push(...response.data.businesses);
      }
      return Object.fromEntries(businesses.map((b) => [b.business_id, b]));
    },
    staleTime: 15_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    retry: 1,
    refetchInterval: (query) => {
      const ends = Object.values(query.state.data || {}).flatMap((b) =>
        b.billing_period ? [Date.parse(b.billing_period.end)] : [],
      );
      const next = Math.min(...ends.filter((end) => end > Date.now()));
      return Math.min(60_000, Math.max(1_000, next - Date.now() + 250));
    },
  });

  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== "updated" || event.action.type !== "success") return;
        const key = event.query.queryKey;
        const businessId =
          key[0] === "web-action-content"
            ? key[2]
            : key[0] === "social-action-content"
              ? key[2]
              : null;
        const status = (
          event.query.state.data as { status?: string } | undefined
        )?.status;
        if (
          typeof businessId === "string" &&
          idsKey.split(",").includes(businessId.toLowerCase()) &&
          (status === "success" || status === "error")
        ) {
          void queryClient.invalidateQueries({ queryKey: ["content-usage"] });
        }
      }),
    [queryClient, idsKey],
  );

  return query;
}
