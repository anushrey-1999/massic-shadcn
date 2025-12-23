"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useStrategy } from "./use-strategy";
import { useSocial } from "./use-social";
import { useWebOptimizationAnalysis } from "./use-web-optimization-analysis";
import { useBlogPagePlan } from "./use-blog-page-plan";
import { useDigitalAds } from "./use-digital-ads";
import { useAudience } from "./use-audience";
import { useJobByBusinessId } from "./use-jobs";

export function usePrefetchAnalyticsPages(businessId: string | null) {
  const queryClient = useQueryClient();
  const { fetchStrategy } = useStrategy(businessId || "");
  const { fetchSocial } = useSocial(businessId || "");
  const { fetchWebOptimizationAnalysisAll } = useWebOptimizationAnalysis();
  const { fetchWebPages } = useBlogPagePlan(businessId || "");
  const { fetchDigitalAds } = useDigitalAds(businessId || "");
  const { fetchAudience } = useAudience(businessId || "");
  const { data: jobDetails } = useJobByBusinessId(businessId || null);
  const jobExists = jobDetails && jobDetails.job_id;

  const prefetchPage1 = useCallback(async () => {
    if (!businessId || !jobExists) return;

    const defaultParams = {
      page: 1,
      perPage: 100,
      search: undefined,
      sort: [] as Array<{ id: string; desc: boolean }>,
      filters: [] as Array<{
        id: string;
        value: string | string[];
        variant: string;
        operator: string;
        filterId: string;
      }>,
      joinOperator: "and" as "and" | "or",
    };

    let isCancelled = false;
    const timeoutIds: NodeJS.Timeout[] = [];

    // Batch 1: Immediate prefetch (most common pages)
    const batch1Promises = [];

    const strategyQueryKey = [
      "strategy",
      businessId,
      defaultParams.page,
      defaultParams.perPage,
      "",
      JSON.stringify(defaultParams.sort),
      JSON.stringify(defaultParams.filters),
      defaultParams.joinOperator,
    ];

    const strategyCached = queryClient.getQueryData(strategyQueryKey);
    if (!strategyCached) {
      batch1Promises.push(
        queryClient.prefetchQuery({
          queryKey: strategyQueryKey,
          queryFn: async () => {
            return fetchStrategy({
              business_id: businessId,
              ...defaultParams,
            });
          },
          staleTime: 1000 * 60 * 5, // 5 minutes
          gcTime: 1000 * 60 * 15, // 15 minutes
        })
      );
    }

    const webPageQueryKey = [
      "web-page",
      businessId,
      defaultParams.page,
      defaultParams.perPage,
      "",
      JSON.stringify(defaultParams.sort),
      JSON.stringify(defaultParams.filters),
      defaultParams.joinOperator,
    ];

    const webPageCached = queryClient.getQueryData(webPageQueryKey);
    if (!webPageCached && jobExists) {
      batch1Promises.push(
        queryClient.prefetchQuery({
          queryKey: webPageQueryKey,
          queryFn: async () => {
            return fetchWebPages({
              business_id: businessId,
              ...defaultParams,
            });
          },
          staleTime: 1000 * 60 * 5, // 5 minutes
          gcTime: 1000 * 60 * 15, // 15 minutes
        })
      );
    }

    const audienceQueryKey = [
      "audience",
      businessId,
      defaultParams.page,
      defaultParams.perPage,
      "",
      JSON.stringify(defaultParams.sort),
      JSON.stringify(defaultParams.filters),
      defaultParams.joinOperator,
    ];

    const audienceCached = queryClient.getQueryData(audienceQueryKey);
    if (!audienceCached && jobExists) {
      batch1Promises.push(
        queryClient.prefetchQuery({
          queryKey: audienceQueryKey,
          queryFn: async () => {
            return fetchAudience({
              business_id: businessId,
              ...defaultParams,
            });
          },
          staleTime: 1000 * 60 * 5, // 5 minutes
          gcTime: 1000 * 60 * 15, // 15 minutes
        })
      );
    }

    // Execute batch 1 immediately
    await Promise.allSettled(batch1Promises);

    // Batch 2: Prefetch after 1.5 seconds (Social + Ads)
    const batch2Timeout = setTimeout(async () => {
      if (isCancelled) return;
      const batch2Promises = [];

      const socialQueryKey = [
        "social",
        businessId,
        defaultParams.page,
        defaultParams.perPage,
        "",
        JSON.stringify(defaultParams.sort),
        JSON.stringify(defaultParams.filters),
        defaultParams.joinOperator,
        "all",
      ];

      const socialCached = queryClient.getQueryData(socialQueryKey);
      if (!socialCached) {
        batch2Promises.push(
          queryClient.prefetchQuery({
            queryKey: socialQueryKey,
            queryFn: async () => {
              return fetchSocial({
                business_id: businessId,
                ...defaultParams,
                channel_name: "all",
              });
            },
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 15, // 15 minutes
          })
        );
      }

      const digitalAdsQueryKey = [
        "digital-ads",
        businessId,
        defaultParams.page,
        defaultParams.perPage,
        "",
        JSON.stringify(defaultParams.sort),
        JSON.stringify(defaultParams.filters),
        defaultParams.joinOperator,
      ];

      const digitalAdsCached = queryClient.getQueryData(digitalAdsQueryKey);
      if (!digitalAdsCached && jobExists) {
        batch2Promises.push(
          queryClient.prefetchQuery({
            queryKey: digitalAdsQueryKey,
            queryFn: async () => {
              return fetchDigitalAds({
                business_id: businessId,
                ...defaultParams,
              });
            },
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 15, // 15 minutes
          })
        );
      }

      await Promise.allSettled(batch2Promises);
    }, 1500); // 1.5 seconds delay
    timeoutIds.push(batch2Timeout);

    // Batch 3: Prefetch after 3 seconds (Web Optimization - least common)
    const batch3Timeout = setTimeout(async () => {
      if (isCancelled) return;
      const webOptimizationQueryKey = ["web-optimization-analysis-all", businessId];
      const webOptimizationCached = queryClient.getQueryData(webOptimizationQueryKey);
      
      // Check if there's an error state in the query
      const queryState = queryClient.getQueryState(webOptimizationQueryKey);
      const hasError = queryState?.error;
      if (hasError) {
        const error = hasError as any;
        const status = error?.response?.status || error?.status;
        if (status === 400 || status === 404) {
          return; // Don't prefetch if we already have a 400/404 error
        }
      }
      
      if (!webOptimizationCached) {
        try {
          await queryClient.prefetchQuery({
            queryKey: webOptimizationQueryKey,
            queryFn: async () => {
              return fetchWebOptimizationAnalysisAll(businessId);
            },
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 15, // 15 minutes
            retry: false, // Disable retries completely for prefetch
          });
        } catch (error: any) {
          // Error is already handled by React Query, no need to set it manually
          // The query will be in error state and won't refetch due to retry: false
        }
      }
    }, 3000); // 3 seconds delay
    timeoutIds.push(batch3Timeout);

    return () => {
      isCancelled = true;
      timeoutIds.forEach((id) => clearTimeout(id));
    };
  }, [businessId, jobExists, queryClient, fetchStrategy, fetchSocial, fetchWebOptimizationAnalysisAll, fetchWebPages, fetchDigitalAds, fetchAudience]);

  return { prefetchPage1 };
}

