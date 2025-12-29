"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import type {
  GetSocialSchema,
  SocialApiResponse,
  SocialRow,
  SocialCounts,
  SocialItem,
  GetTacticsSchema,
  TacticApiResponse,
  TacticRow,
  TacticItem,
} from "@/types/social-types";

function parseDownloadPayload(text: string): unknown {
  const trimmed = (text || "").replace(/^\uFEFF/, "").trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Some download URLs return NDJSON (one JSON object per line)
    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

      if (lines.length <= 1) return { rawText: trimmed };


    try {
      return lines.map((line) => JSON.parse(line));
    } catch {
      return { rawText: trimmed };
    }
  }

}
export function useSocial(businessId: string) {
  const platform: ApiPlatform = "python";

  const socialApi = useApi<SocialApiResponse>({
    platform,
  });

  const countsApi = useApi<SocialCounts>({
    platform,
  });

  const tacticsApi = useApi<TacticApiResponse>({
    platform,
  });

  const downloadApi = useApi<any>({
    platform,
  });

  const transformToTableRows = useCallback((items: SocialItem[]): SocialRow[] => {
    return items.map((item, index) => ({
      id: item.id || `social-${index}`,
      channel_name: item.channel_name || "",
      campaign_name: item.campaign_name || "",
      campaign_relevance: item.campaign_relevance || 0,
      tactics: item.tactics || [],
      offerings: item.offerings || [],
      total_clusters:
        typeof item.total_clusters === "number"
          ? item.total_clusters
          : Array.isArray(item.tactics)
            ? item.tactics.length
            : 0,
      ...item,
    }));
  }, []);

  const transformToTacticRows = useCallback((items: TacticItem[]): TacticRow[] => {
    return items.map((item, index) => ({
      id: item.id || `tactic-${index}`,
      tactic: item.tactic || "",
      cluster_name: item.cluster_name || "",
      title: item.title || "",
      description: item.description || "",
      campaign_relevance: item.campaign_relevance || 0,
      related_keywords: item.related_keywords || [],
      status: item.status || "",
      url: item.url || "",
      ...item,
    }));
  }, []);

  const fetchSocial = useCallback(
    async (params: GetSocialSchema) => {
      const getField = (filter: GetSocialSchema["filters"][number]) => {
        if ("field" in filter && typeof (filter as { field?: string }).field === "string") {
          return (filter as { field?: string }).field;
        }
        return undefined;
      };

      const queryParams = new URLSearchParams({
        business_id: params.business_id,
        page: params.page.toString(),
        page_size: params.perPage.toString(),
      });

      if (params.search) {
        queryParams.append("search", params.search);
      }

      if (params.sort && params.sort.length > 0) {
        queryParams.append("sort", JSON.stringify(params.sort));
      }

      if (params.filters && params.filters.length > 0) {
        const modifiedFilters = params.filters
          .map((filter) => {
            const field = getField(filter);
            const isOfferingFilter =
              filter.id === "offerings" ||
              filter.filterId === "offerings" ||
              field === "offerings" ||
              filter.id === "channel_offerings" ||
              field === "channel_offerings";

            if (isOfferingFilter) {
              return {
                field: "channel_offerings",
                value: filter.value,
                operator: filter.operator,
              };
            }

            const fallbackField = field ?? filter.id ?? filter.filterId ?? "";
            if (!fallbackField) return null;

            return {
              field: fallbackField,
              value: filter.value,
              operator: filter.operator,
            };
          })
          .filter((filter): filter is { field: string; value: typeof params.filters[number]["value"]; operator: typeof params.filters[number]["operator"] } => Boolean(filter));

        if (modifiedFilters.length > 0) {
          queryParams.append("filters", JSON.stringify(modifiedFilters));
        }
      }

      if (params.filters && params.filters.length > 0 && params.joinOperator) {
        queryParams.append("joinOperator", params.joinOperator);
      }

      if (params.channel_name) {
        queryParams.append("channel_name", params.channel_name);
      }

      const endpoint = `/client/channel-analyzer?${queryParams.toString()}`;

      try {
        const response = await socialApi.execute(endpoint, {
          method: "GET",
        });

        const items = response?.output_data?.items || [];
        const flatRows = transformToTableRows(items);

        const pagination = response?.output_data?.pagination;

        let pageCount = 0;
        if (pagination?.total_pages) {
          pageCount = pagination.total_pages;
        } else if (pagination?.total_count) {
          pageCount = Math.ceil(pagination.total_count / params.perPage);
        } else {
          pageCount = Math.ceil(flatRows.length / params.perPage);
        }

        return {
          data: flatRows,
          pageCount,
          pagination: pagination || {
            page: params.page,
            page_size: params.perPage,
            fetched: flatRows.length,
            total_count: flatRows.length,
            status: "success" as const,
          },
          metadata: response?.metadata,
        };
      } catch (error) {
        throw error;
      }
    },
    [socialApi, transformToTableRows]
  );

  const fetchSocialCounts = useCallback(async () => {
    try {
      const endpoint = `/client/channel-analyzer?business_id=${businessId}&page=1&page_size=1000`;
      const response = await socialApi.execute(endpoint, {
        method: "GET",
      });

      const items = response?.output_data?.items || [];

      const offeringCounts: Record<string, number> = {};
      items.forEach((item: any) => {
        if (item.offerings && Array.isArray(item.offerings)) {
          item.offerings.forEach((offering: string) => {
            if (!offering) return;
            offeringCounts[offering] = (offeringCounts[offering] || 0) + 1;
          });
        }
      });

      return {
        offeringCounts,
      };
    } catch (error) {
      return {
        offeringCounts: {},
      };
    }
  }, [businessId, socialApi]);

  const fetchChannels = useCallback(async () => {
    try {
      const endpoint = `/client/channel-analyzer?business_id=${businessId}&page=1&page_size=1000`;
      const response = await socialApi.execute(endpoint, {
        method: "GET",
      });

      const items = response?.output_data?.items || [];
      const uniqueChannels = Array.from(
        new Set(items.map((item: SocialItem) => item.channel_name).filter(Boolean))
      ).sort() as string[];

      return uniqueChannels;
    } catch (error) {
      return [];
    }
  }, [businessId, socialApi]);


  const fetchChannelAnalyzerDownloadUrl = useCallback(
    async (businessId: string) => {
      const endpoint = `/client/channel-analyzer?business_id=${businessId}&page=1&page_size=100`;
      const response = await socialApi.execute(endpoint, { method: "GET" });
      return (response?.output_data as any)?.download_url as string | undefined;
    },
    [socialApi]
  );

  const fetchDownloadPayloadFromUrl = useCallback(async (downloadUrl: string) => {
    const downloadResponse = await fetch(downloadUrl);
    if (!downloadResponse.ok) {
      throw new Error(
        `Failed to fetch from download URL: ${downloadResponse.statusText}`
      );
    }

    const contentType = downloadResponse.headers.get("content-type") || "";
    const downloadText = await downloadResponse.text();
    const parsed = parseDownloadPayload(downloadText);

    return {
      data: parsed,
      rawText:
        parsed && typeof parsed === "object" && "rawText" in (parsed as any)
          ? (parsed as any).rawText
          : undefined,
      metadata: (parsed as any)?.metadata,
    };
  }, []);

  const fetchFullDataFromDownloadUrl = useCallback(
    async (businessId: string) => {
      try {
        const downloadUrl = await fetchChannelAnalyzerDownloadUrl(businessId);
        if (!downloadUrl) {
          return null;
        }

        const payload = await fetchDownloadPayloadFromUrl(downloadUrl);
        return payload;
      } catch (error) {
        throw error;
      }
    },
    [fetchChannelAnalyzerDownloadUrl, fetchDownloadPayloadFromUrl]
  );

  const fetchTactics = useCallback(
    async (params: GetTacticsSchema) => {
      const getField = (filter: GetTacticsSchema["filters"][number]) => {
        if ("field" in filter && typeof (filter as { field?: string }).field === "string") {
          return (filter as { field?: string }).field;
        }
        return undefined;
      };

      const queryParams = new URLSearchParams({
        business_id: params.business_id,
        page: params.page.toString(),
        page_size: params.perPage.toString(),
      });

      if (params.search) {
        queryParams.append("search", params.search);
      }

      if (params.sort && params.sort.length > 0) {
        queryParams.append("sort", JSON.stringify(params.sort));
      }

      if (params.filters && params.filters.length > 0) {
        const modifiedFilters = params.filters
          .map((filter) => {
            const field = getField(filter);
            const isOfferingFilter =
              filter.id === "offerings" ||
              filter.filterId === "offerings" ||
              field === "offerings" ||
              filter.id === "channel_offerings" ||
              field === "channel_offerings";

            if (isOfferingFilter) {
              return {
                field: "channel_offerings",
                value: filter.value,
                operator: filter.operator,
              };
            }

            const fallbackField = field ?? filter.id ?? filter.filterId ?? "";
            if (!fallbackField) return null;

            return {
              field: fallbackField,
              value: filter.value,
              operator: filter.operator,
            };
          })
          .filter((filter): filter is { field: string; value: typeof params.filters[number]["value"]; operator: typeof params.filters[number]["operator"] } => Boolean(filter));

        if (modifiedFilters.length > 0) {
          queryParams.append("filters", JSON.stringify(modifiedFilters));
        }
      }

      if (params.filters && params.filters.length > 0 && params.joinOperator) {
        queryParams.append("joinOperator", params.joinOperator);
      }

      if (params.channel_name) {
        queryParams.append("channel_name", params.channel_name);
      }

      if (params.campaign_name) {
        queryParams.append("campaign_name", params.campaign_name);
      }

      const endpoint = `/client/channel-analyzer?${queryParams.toString()}`;

      try {
        const response = await tacticsApi.execute(endpoint, {
          method: "GET",
        });

        const items = response?.output_data?.items || [];
        const flatRows = transformToTacticRows(items);

        const pagination = response?.output_data?.pagination;

        let pageCount = 0;
        if (pagination?.total_pages) {
          pageCount = pagination.total_pages;
        } else if (pagination?.total_count) {
          pageCount = Math.ceil(pagination.total_count / params.perPage);
        } else {
          pageCount = Math.ceil(flatRows.length / params.perPage);
        }

        return {
          data: flatRows,
          pageCount,
          pagination: pagination || {
            page: params.page,
            page_size: params.perPage,
            fetched: flatRows.length,
            total_count: flatRows.length,
            status: "success" as const,
          },
          metadata: response?.metadata,
        };
      } catch (error) {
        throw error;
      }
    },
    [tacticsApi, transformToTacticRows]
  );

  return {
    fetchSocial,
    fetchSocialCounts,
    fetchChannels,
    fetchTactics,
    fetchChannelAnalyzerDownloadUrl,
    fetchDownloadPayloadFromUrl,
    fetchFullDataFromDownloadUrl,
    loading:
      socialApi.loading ||
      countsApi.loading ||
      tacticsApi.loading ||
      downloadApi.loading,
    error:
      socialApi.error || countsApi.error || tacticsApi.error || downloadApi.error,
    reset: () => {
      socialApi.reset();
      countsApi.reset();
      tacticsApi.reset();
      downloadApi.reset();
    },
  };
}
