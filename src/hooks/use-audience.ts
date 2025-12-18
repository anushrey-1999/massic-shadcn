"use client";

import { useCallback } from "react";
import { useApi, type ApiPlatform } from "./use-api";
import type {
  GetAudienceSchema,
  AudienceApiResponse,
  AudienceRow,
  AudienceCounts,
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
        // Create a unique ID by combining persona_name with use_case_name, ars, and a counter
        const persona = (item.persona_name || "").replace(/\s+/g, "_").substring(0, 50);
        const useCasesStr = useCaseNames.sort().join("|").replace(/\s+/g, "_").substring(0, 100);
        const ars = item.ars ?? 0;
        
        // Use counter instead of index for better stability across sorts
        const uniqueCounter = counter++;
        
        // Combine persona, use cases, ars, and counter to ensure uniqueness
        uniqueId = `${persona}_${useCasesStr}_${ars}_${uniqueCounter}`;
        
        // If still duplicate (shouldn't happen with counter), append more uniqueness
        if (usedIds.has(uniqueId)) {
          uniqueId = `${uniqueId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        }
      }
      
      usedIds.add(uniqueId);
      
      return {
        id: uniqueId,
        persona_name: item.persona_name || "",
        ars: item.ars ?? 0,
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

      if (params.sort && params.sort.length > 0) {
        const sortBy = params.sort[0].id;
        const sortOrder = params.sort[0].desc ? "desc" : "asc";
        queryParams.append("sort_by", sortBy);
        queryParams.append("sort_order", sortOrder);
      }

      const endpoint = `/client/audience?${queryParams.toString()}`;

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
        console.error("Error fetching audience data:", error);
        throw error;
      }
    },
    [audienceApi, transformToTableRows]
  );

  const fetchAudienceCounts = useCallback(async () => {
    try {
      const endpoint = `/client/audience?business_id=${businessId}&page=1&page_size=1000`;
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

        if (item.ars !== undefined && item.ars !== null) {
          minArs = Math.min(minArs, item.ars);
          maxArs = Math.max(maxArs, item.ars);
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
