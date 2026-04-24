"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import type {
  GetAudienceSchema,
  AudienceApiResponse,
  AudienceRow,
  AudienceCounts,
  AudienceMetrics,
} from "@/types/audience-types";

export function useAudience(businessId: string) {
  const platform: ApiPlatform = "python";

  const audienceApi = useApi<AudienceApiResponse>({
    platform,
  });

  const countsApi = useApi<AudienceCounts>({
    platform,
  });

  const transformToTableRows = useCallback((items: any[]): AudienceRow[] => {
    // Track used IDs to ensure uniqueness
    const usedIds = new Set<string>();
    let counter = 0;

    return items.map((item, index) => {
      // Extract use_case_name from use_cases array (array of objects with use_case_name property)
      let useCaseNames: string[] = [];
      if (item.use_cases && Array.isArray(item.use_cases)) {
        useCaseNames = item.use_cases
          .map((uc: any) => uc?.use_case_name)
          .filter((name: any) => name && typeof name === 'string');
      } else if (item.use_case_name) {
        // Fallback: if use_case_name is already an array of strings
        useCaseNames = Array.isArray(item.use_case_name)
          ? item.use_case_name.filter((name: any) => name && typeof name === 'string')
          : [item.use_case_name].filter((name: any) => name && typeof name === 'string');
      }

      // Try to use existing ID first, but ensure it's unique
      let uniqueId = item.id;

      // If no ID or ID is already used, generate a new one
      if (!uniqueId || usedIds.has(uniqueId)) {
        // Create a unique ID by combining persona_name with use_case_name, score, and a counter
        const persona = (item.persona_name || "").replace(/\s+/g, "_").substring(0, 50);
        const useCasesStr = useCaseNames.sort().join("|").replace(/\s+/g, "_").substring(0, 100);
        const score = item.audience_relevance_score ?? item.ars ?? 0;

        // Use counter instead of index for better stability across sorts
        const uniqueCounter = counter++;

        uniqueId = `${persona}_${useCasesStr}_${score}_${uniqueCounter}`;

        // If still duplicate (shouldn't happen with counter), append more uniqueness
        if (usedIds.has(uniqueId)) {
          uniqueId = `${uniqueId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        }
      }

      usedIds.add(uniqueId);

      return {
        id: uniqueId,
        persona_name: item.persona_name || "",
        audience_relevance_score: item.audience_relevance_score ?? item.ars ?? 0,
        use_case_name: useCaseNames,
        ...item,
      };
    });
  }, []);

  const fetchAudience = useCallback(
    async (params: GetAudienceSchema) => {
      const queryParams = new URLSearchParams({
        business_id: params.business_id,
        page: params.page.toString(),
        page_size: params.perPage.toString(),
      });

      if (params.search) {
        queryParams.append("search", params.search);
      }

      if (params.offerings) {
        queryParams.append("offerings", params.offerings);
      }

      // Map frontend column IDs to backend API field names
      const mapFieldToApiName = (field: string): string => {
        const fieldMap: Record<string, string> = {
          use_cases: "use_case_count",
          keywords: "supporting_keyword_count",
        };
        return fieldMap[field] ?? field;
      };

      // Fields displayed as percentages (0–100) in the UI but stored as decimals (0–1) in the API.
      const percentageFields = new Set(["audience_relevance_score"]);

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

      if (params.sort && params.sort.length > 0) {
        const mappedSort = params.sort.map(sortItem => ({
          ...sortItem,
          field: mapFieldToApiName(sortItem.field),
        }));
        queryParams.append("sort", JSON.stringify(mappedSort));
      }

      if (params.filters && params.filters.length > 0) {
        const mappedFilters = params.filters.flatMap(filter => {
          const apiField = mapFieldToApiName(filter.field as string);
          const withMappedField = { ...filter, field: apiField };
          return percentageFields.has(apiField)
            ? normalizePercentageFilter(withMappedField)
            : [withMappedField];
        });
        queryParams.append("filters", JSON.stringify(mappedFilters));
      }

      if (params.joinOperator) {
        queryParams.append("joinOperator", params.joinOperator);
      }

      const endpoint = `/strategies/audiences?${queryParams.toString()}`;

      try {
        const response = await audienceApi.execute(endpoint, {
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

        const metricsMaybe =
          (response as any)?.output_data?.metrics ?? (response as any)?.metrics;
        const metricsFirst = Array.isArray(metricsMaybe)
          ? metricsMaybe[0]
          : metricsMaybe;
        const metrics: AudienceMetrics | null = metricsFirst
          ? {
              total_personas:
                typeof metricsFirst?.total_personas === "number"
                  ? metricsFirst.total_personas
                  : 0,
              total_use_cases:
                typeof metricsFirst?.total_use_cases === "number"
                  ? metricsFirst.total_use_cases
                  : 0,
              total_supporting_keywords:
                typeof metricsFirst?.total_supporting_keywords === "number"
                  ? metricsFirst.total_supporting_keywords
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
        console.error("Error fetching audience data:", error);
        throw error;
      }
    },
    [audienceApi, transformToTableRows]
  );

  const fetchAudienceCounts = useCallback(async () => {
    try {
      const endpoint = `/strategies/audiences?business_id=${businessId}&page=1&page_size=1000`;
      const response = await audienceApi.execute(endpoint, {
        method: "GET",
      });

      const items = response?.output_data?.items || [];

      const personaCounts: Record<string, number> = {};
      const useCaseCounts: Record<string, number> = {};
      let minArs = Infinity;
      let maxArs = -Infinity;

      items.forEach((item: any) => {
        if (item.persona_name) {
          personaCounts[item.persona_name] = (personaCounts[item.persona_name] || 0) + 1;
        }

        // Extract use_case_name from use_cases array (array of objects with use_case_name property)
        if (item.use_cases && Array.isArray(item.use_cases)) {
          item.use_cases.forEach((uc: any) => {
            const useCaseName = uc?.use_case_name;
            if (useCaseName && typeof useCaseName === 'string') {
              useCaseCounts[useCaseName] = (useCaseCounts[useCaseName] || 0) + 1;
            }
          });
        } else if (item.use_case_name) {
          // Fallback: if use_case_name is already an array of strings
          const useCases = Array.isArray(item.use_case_name) ? item.use_case_name : [item.use_case_name];
          useCases.forEach((useCase: string) => {
            if (useCase && typeof useCase === 'string') {
              useCaseCounts[useCase] = (useCaseCounts[useCase] || 0) + 1;
            }
          });
        }

        const arsValue = item.audience_relevance_score ?? item.ars;
        if (arsValue !== undefined && arsValue !== null) {
          minArs = Math.min(minArs, arsValue);
          maxArs = Math.max(maxArs, arsValue);
        }
      });

      return {
        personaCounts,
        arsRange: {
          min: isFinite(minArs) ? minArs : 0,
          max: isFinite(maxArs) ? maxArs : 1,
        },
        useCaseCounts,
      };
    } catch (error) {
      console.error("Error fetching audience counts:", error);
      return {
        personaCounts: {},
        arsRange: { min: 0, max: 1 },
        useCaseCounts: {},
      };
    }
  }, [businessId, audienceApi]);

  return {
    fetchAudience,
    fetchAudienceCounts,
    loading: audienceApi.loading || countsApi.loading,
    error: audienceApi.error || countsApi.error,
    reset: () => {
      audienceApi.reset();
      countsApi.reset();
    },
  };
}
