"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import type {
  GetStrategySchema,
  StrategyApiResponse,
  StrategyRow,
  StrategyCounts,
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

      // Create comma-separated cluster names
      const clusterNames = clusters
        .map((cluster: any) => cluster.cluster)
        .filter(Boolean)
        .join(", ");

      rows.push({
        id: topic.topic,
        topic: topic.topic,
        business_relevance_score: topic.business_relevance_score || 0,
        topic_cluster_topic_coverage: topic.topic_cluster_topic_coverage || 0,
        offerings: topic.offerings || [],
        clusters: clusters,
        cluster_names: clusterNames,
        sub_topics_count: clusters.length,
        total_keywords: totalKeywords,
        total_search_volume: totalSearchVolume,
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

      // Add sort parameters
      if (params.sort && params.sort.length > 0) {
        queryParams.append("sort", JSON.stringify(params.sort));
      }

      // Note: Backend API spec mentions filters support, but structure not fully defined
      // For now, we'll handle advanced filters on client side after fetching
      // In future, backend can support filter parameters

      const endpoint = `/client/topic-strategy-builder?${queryParams.toString()}`;

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
      const endpoint = `/client/topic-strategy-builder?business_id=${businessId}&page=1&page_size=1000`;
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
        if (item.topic_cluster_topic_coverage !== undefined) {
          minCoverage = Math.min(minCoverage, item.topic_cluster_topic_coverage);
          maxCoverage = Math.max(maxCoverage, item.topic_cluster_topic_coverage);
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

  return {
    fetchStrategy,
    fetchStrategyCounts,
    loading: strategyApi.loading || countsApi.loading,
    error: strategyApi.error || countsApi.error,
    reset: () => {
      strategyApi.reset();
      countsApi.reset();
    },
  };
}
