"use client";

import { useCallback } from "react";
import { useApi, api, type ApiPlatform } from "./use-api";
import type {
  GetStrategySchema,
  StrategyApiResponse,
  StrategyRow,
  StrategyCounts,
  StrategyMetrics,
} from "@/types/strategy-types";

/**
 * Custom hook for Strategy API calls
 * Wraps the use-api hook to provide strategy-specific functionality
 */
export function useStrategy(businessId: string) {
  const platform: ApiPlatform = "python"; // Strategy API uses node platform

  // Hook for fetching strategy data
  const strategyApi = useApi<StrategyApiResponse>({
    platform,
  });

  // Hook for fetching counts/metadata
  const countsApi = useApi<StrategyCounts>({
    platform,
  });


  /**
   * Transform nested API response to table rows
   * One row per topic with all clusters and keywords
   */
  const transformToTableRows = useCallback((topics: any[]): StrategyRow[] => {
    const rows: StrategyRow[] = [];

    topics.forEach((topic) => {
      const clusters = topic.clusters || [];

      // Calculate total keywords and search volume across all clusters
      const totalKeywords = clusters.reduce(
        (sum: number, cluster: any) => sum + (cluster.keywords?.length || 0),
        0
      );
      const totalSearchVolume = clusters.reduce(
        (sum: number, cluster: any) => sum + (cluster.total_search_volume || 0),
        0
      );
      const totalClusterSearchVolume =
        typeof topic.total_cluster_search_volume === "number"
          ? topic.total_cluster_search_volume
          : typeof topic.total_search_volume === "number"
            ? topic.total_search_volume
            : totalSearchVolume;

      // Create comma-separated cluster names
      const clusterNames = clusters
        .map((cluster: any) => cluster.cluster_name || cluster.cluster)
        .filter(Boolean)
        .join(", ");

      rows.push({
        id: topic.topic_name || topic.topic,
        topic: topic.topic_name || topic.topic,
        business_relevance_score: topic.business_relevance_score || 0,
        topic_cluster_topic_coverage: topic.topic_coverage ?? topic.topic_cluster_topic_coverage ?? 0,
        offerings: topic.offerings || [],
        clusters: clusters,
        cluster_names: clusterNames,
        sub_topics_count: clusters.length,
        total_keywords: totalKeywords,
        total_cluster_search_volume: totalClusterSearchVolume,
      });
    });

    return rows;
  }, []);

  /**
   * Fetch strategy topics with filtering, sorting, and pagination
   */
  const fetchStrategy = useCallback(
    async (params: GetStrategySchema) => {
      // Build query parameters
      const queryParams = new URLSearchParams({
        business_id: params.business_id,
        page: params.page.toString(),
        page_size: params.perPage.toString(),
      });

      // Add search if provided
      if (params.search) {
        queryParams.append("search", params.search);
      }

      // Add offerings filter if provided (backend supports this)
      if (params.offerings) {
        queryParams.append("offerings", params.offerings);
      }

      // Map frontend column IDs to backend API field names
      const mapFieldToApiName = (field: string): string => {
        const fieldMap: Record<string, string> = {
          topic: "topic_name",
          topic_cluster_topic_coverage: "topic_coverage",
          total_cluster_search_volume: "total_search_volume",
          sub_topics_count: "cluster_count",
          total_keywords: "keyword_count",
        };
        return fieldMap[field] ?? field;
      };

      // Fields displayed as percentages (0–100) in the UI but stored as decimals (0–1) in the API.
      const percentageFields = new Set(["business_relevance_score", "topic_coverage"]);

      const clamp = (v: number) => Math.max(0, Math.min(1, v));
      const toDecimal = (pct: string) => parseFloat(pct) / 100;

      // Normalize a single filter object for percentage fields.
      // The UI shows Math.round(v * 100), so to match all values that display as "89"
      // we must query the range [0.885, 0.895] rather than the exact value 0.89.
      const normalizePercentageFilter = (filter: typeof params.filters[number]) => {
        const value = filter.value as string | string[];
        const operator = filter.operator;

        if (operator === "isBetween" && Array.isArray(value)) {
          const [minValue, maxValue] = value;
          const minNum = toDecimal(minValue);
          const maxNum = toDecimal(maxValue);

          if (Number.isNaN(minNum) || Number.isNaN(maxNum)) {
            return [filter];
          }

          return [
            {
              ...filter,
              operator: "gte" as const,
              value: String(clamp(minNum - 0.005)),
            },
            {
              ...filter,
              operator: "lte" as const,
              value: String(clamp(maxNum + 0.005)),
            },
          ];
        }

        if ((operator === "eq" || operator === "ne") && !Array.isArray(value)) {
          const num = toDecimal(value as string);
          if (Number.isNaN(num)) return [filter];

          if (operator === "eq") {
            return [
              {
                ...filter,
                operator: "gte" as const,
                value: String(clamp(num - 0.005)),
              },
              {
                ...filter,
                operator: "lte" as const,
                value: String(clamp(num + 0.005)),
              },
            ];
          }

          return [{ ...filter, value: String(num) }];
        }

        if (operator === "gte" && !Array.isArray(value)) {
          const num = toDecimal(value as string);
          if (Number.isNaN(num)) return [filter];
          return [{ ...filter, value: String(clamp(num - 0.005)) }];
        }

        if (operator === "lte" && !Array.isArray(value)) {
          const num = toDecimal(value as string);
          if (Number.isNaN(num)) return [filter];
          return [{ ...filter, value: String(clamp(num + 0.005)) }];
        }

        if (!Array.isArray(value)) {
          const num = toDecimal(value as string);
          return Number.isNaN(num) ? [filter] : [{ ...filter, value: String(num) }];
        }

        return [filter];
      };

      // Add sort parameters
      if (params.sort && params.sort.length > 0) {
        const mappedSort = params.sort.map(sortItem => ({
          ...sortItem,
          field: mapFieldToApiName(sortItem.field),
        }));
        queryParams.append("sort", JSON.stringify(mappedSort));
      }

      // Add filters if provided
      if (params.filters && params.filters.length > 0) {
        const mappedFilters = params.filters.flatMap(filter => {
          const apiField = mapFieldToApiName(filter.field as string);
          const withMappedField = { ...filter, field: apiField } as typeof params.filters[number];
          return percentageFields.has(apiField)
            ? normalizePercentageFilter(withMappedField)
            : [withMappedField];
        });
        queryParams.append("filters", JSON.stringify(mappedFilters));
      }

      // Add join operator if filters exist
      if (params.filters && params.filters.length > 0 && params.joinOperator) {
        queryParams.append("joinOperator", params.joinOperator);
      }

      const endpoint = `/strategies/topics?${queryParams.toString()}`;

      try {
        const response = await strategyApi.execute(endpoint, {
          method: "GET",
        });

        // Transform nested structure to flat rows for table
        const items = response?.output_data?.items || [];
        const flatRows = transformToTableRows(items);

        // Get page count from pagination data
        const pagination = response?.output_data?.pagination;

        // Use total_pages from API if available, otherwise calculate from total_count
        let pageCount = 0;
        if (pagination?.total_pages) {
          pageCount = pagination.total_pages;
        } else if (pagination?.total_count) {
          pageCount = Math.ceil(pagination.total_count / params.perPage);
        } else {
          pageCount = Math.ceil(flatRows.length / params.perPage);
        }

        const metricsMaybe =
          (response as any)?.output_data?.metrics ?? (response as any)?.metrics;
        const metricsFirst = Array.isArray(metricsMaybe)
          ? metricsMaybe[0]
          : metricsMaybe;
        const metrics: StrategyMetrics | null = metricsFirst
          ? {
              total_topics:
                typeof metricsFirst?.total_topics === "number"
                  ? metricsFirst.total_topics
                  : 0,
              total_clusters:
                typeof metricsFirst?.total_clusters === "number"
                  ? metricsFirst.total_clusters
                  : 0,
              total_keywords:
                typeof metricsFirst?.total_keywords === "number"
                  ? metricsFirst.total_keywords
                  : 0,
            }
          : null;

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
          metrics,
        };
      } catch (error) {
        console.error("Error fetching strategy data:", error);
        throw error;
      }
    },
    [strategyApi, transformToTableRows]
  );

  /**
   * Fetch counts and ranges for filter options
   * This can be used to populate filter dropdowns with counts
   */
  const fetchStrategyCounts = useCallback(async () => {
    // For now, this endpoint might not exist yet
    // We'll return empty counts and let the table work without them
    // In future, backend can provide a /client/topic-strategy-builder/counts endpoint

    try {
      // Placeholder: Fetch all data to calculate counts client-side
      // In production, backend should provide this
      const endpoint = `/strategies/topics?business_id=${businessId}&page=1&page_size=1000`;
      const response = await strategyApi.execute(endpoint, {
        method: "GET",
      });

      const items = response?.output_data?.items || [];

      // Calculate counts from data
      const offeringCounts: Record<string, number> = {};
      let minRelevance = Infinity;
      let maxRelevance = -Infinity;
      let minCoverage = Infinity;
      let maxCoverage = -Infinity;
      let minVolume = Infinity;
      let maxVolume = -Infinity;

      items.forEach((item: any) => {
        // Count offerings
        if (item.offerings && Array.isArray(item.offerings)) {
          item.offerings.forEach((offering: string) => {
            offeringCounts[offering] = (offeringCounts[offering] || 0) + 1;
          });
        }

        // Track ranges
        if (item.business_relevance_score !== undefined) {
          minRelevance = Math.min(minRelevance, item.business_relevance_score);
          maxRelevance = Math.max(maxRelevance, item.business_relevance_score);
        }
        const coverage = item.topic_coverage ?? item.topic_cluster_topic_coverage;
        if (coverage !== undefined) {
          minCoverage = Math.min(minCoverage, coverage);
          maxCoverage = Math.max(maxCoverage, coverage);
        }
        if (item.clusters && Array.isArray(item.clusters)) {
          item.clusters.forEach((cluster: any) => {
            if (cluster.total_search_volume !== undefined) {
              minVolume = Math.min(minVolume, cluster.total_search_volume);
              maxVolume = Math.max(maxVolume, cluster.total_search_volume);
            }
          });
        }
      });

      return {
        offeringCounts,
        businessRelevanceRange: {
          min: isFinite(minRelevance) ? minRelevance : 0,
          max: isFinite(maxRelevance) ? maxRelevance : 1,
        },
        topicCoverageRange: {
          min: isFinite(minCoverage) ? minCoverage : 0,
          max: isFinite(maxCoverage) ? maxCoverage : 1,
        },
        searchVolumeRange: {
          min: isFinite(minVolume) ? minVolume : 0,
          max: isFinite(maxVolume) ? maxVolume : 10000,
        },
      };
    } catch (error) {
      console.error("Error fetching strategy counts:", error);
      // Return default empty counts
      return {
        offeringCounts: {},
        businessRelevanceRange: { min: 0, max: 1 },
        topicCoverageRange: { min: 0, max: 1 },
        searchVolumeRange: { min: 0, max: 10000 },
      };
    }
  }, [businessId, strategyApi]);

  /**
   * Fetch all strategy pages (up to 100) for the bubble map view.
   * Fetches page 1 first to determine total_pages, then fetches remaining
   * pages in parallel batches of 10.
   */
  const fetchAllStrategyPages = useCallback(
    async (businessId: string) => {
      const PAGE_SIZE = 5000;
      const MAX_PAGES = 100;
      const BATCH_SIZE = 10;

      const firstEndpoint = `/strategies/topics?business_id=${businessId}&page=1&page_size=${PAGE_SIZE}`;
      const firstResponse = await api.get<StrategyApiResponse>(firstEndpoint, "python");

      const firstItems = firstResponse?.output_data?.items || [];
      const pagination = firstResponse?.output_data?.pagination;
      const totalPages = Math.min(pagination?.total_pages || 1, MAX_PAGES);

      if (totalPages <= 1) {
        return {
          data: transformToTableRows(firstItems),
          metadata: firstResponse?.metadata,
        };
      }

      const remainingPageNumbers = Array.from(
        { length: totalPages - 1 },
        (_, i) => i + 2
      );

      const allItems: any[] = [...firstItems];

      for (let i = 0; i < remainingPageNumbers.length; i += BATCH_SIZE) {
        const batch = remainingPageNumbers.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (page) => {
            const endpoint = `/strategies/topics?business_id=${businessId}&page=${page}&page_size=${PAGE_SIZE}`;
            const response = await api.get<StrategyApiResponse>(endpoint, "python");
            return response?.output_data?.items || [];
          })
        );
        allItems.push(...batchResults.flat());
      }

      return {
        data: transformToTableRows(allItems),
        metadata: firstResponse?.metadata,
      };
    },
    [transformToTableRows]
  );

  return {
    fetchStrategy,
    fetchStrategyCounts,
    fetchAllStrategyPages,
    loading: strategyApi.loading || countsApi.loading,
    error: strategyApi.error || countsApi.error,
    reset: () => {
      strategyApi.reset();
      countsApi.reset();
    },
  };
}
