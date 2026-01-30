import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";
import { useCallback, useEffect, useState, useMemo } from "react";

const OFFERINGS_EXTRACTOR_KEY = "offerings-extractor";

// Global service to keep React Query polling active even when component unmounts
// Uses React Query's refetchQueries to maintain polling in background
class OfferingsPollingService {
  private static instance: OfferingsPollingService;
  private activeExtractions: Map<string, { taskId: string; intervalId: NodeJS.Timeout }> = new Map();
  private queryClientRef: { current: any } = { current: null };

  static getInstance(): OfferingsPollingService {
    if (!OfferingsPollingService.instance) {
      OfferingsPollingService.instance = new OfferingsPollingService();
    }
    return OfferingsPollingService.instance;
  }

  setQueryClient(queryClient: any) {
    this.queryClientRef.current = queryClient;
  }

  // Start keeping React Query polling active (even when component unmounts)
  startExtraction(businessId: string, taskId: string) {
    // Clear any existing polling for this business
    this.stopExtraction(businessId);

    // Use setInterval to keep calling React Query's refetchQueries
    // This keeps polling active even when component unmounts
    const intervalId = setInterval(async () => {
      if (this.queryClientRef.current) {
        try {
          // Check cached status first to avoid unnecessary polling if already complete
          const cachedData = this.queryClientRef.current.getQueryData([
            OFFERINGS_EXTRACTOR_KEY,
            businessId,
            taskId,
          ]) as ExtractionStatusResponse | undefined;
          
          // If already complete or failed, stop polling immediately
          if (cachedData && cachedData.status !== "processing") {
            // Also check for new response format where status might be missing but we have type
            if (!cachedData.status && !cachedData.type && !cachedData.offerings) {
              // If it has no status AND no type AND no offerings, it might still be processing or invalid
              // But if it has ANY of these, it's likely done or providing info
              // Let's assume if it matches the new "done" shape (no status, has type), it should stop
            } else {
               this.stopExtraction(businessId);
               return;
            }
          }

          // Trigger React Query to refetch - it will handle caching, error handling, etc.
          // Use "all" type to refetch even if query is inactive (component unmounted)
          await this.queryClientRef.current.refetchQueries({
            queryKey: [OFFERINGS_EXTRACTOR_KEY, businessId, taskId],
            type: "all", // Refetch all queries matching the key, even inactive ones
          });

          // After refetch, check the cache again (more reliable than checking refetchQueries result)
          const updatedCacheData = this.queryClientRef.current.getQueryData([
            OFFERINGS_EXTRACTOR_KEY,
            businessId,
            taskId,
          ]) as ExtractionStatusResponse | undefined;
          
          if (updatedCacheData) {
            const status = updatedCacheData.status;
            
            // Stop polling if status is not "processing". 
            // In new format, status is undefined when done, so undefined !== "processing" is true.
            if (status !== "processing") {
              this.stopExtraction(businessId);
              return; // Important: return to prevent further polling
            }
          }
        } catch (error) {
          // Don't stop polling on error - might be temporary network issue
          // Silently continue polling
        }
      }
    }, 5000); // Poll every 5 seconds

    this.activeExtractions.set(businessId, { taskId, intervalId });
  }

  // Stop extraction polling
  stopExtraction(businessId: string) {
    const extraction = this.activeExtractions.get(businessId);
    if (extraction) {
      clearInterval(extraction.intervalId);
      this.activeExtractions.delete(businessId);
    }
  }

  // Check if extraction is active
  isExtracting(businessId: string): boolean {
    return this.activeExtractions.has(businessId);
  }

  // Get taskId for active extraction
  getTaskId(businessId: string): string | null {
    return this.activeExtractions.get(businessId)?.taskId || null;
  }

  // Get all active business IDs
  getActiveExtractions(): string[] {
    return Array.from(this.activeExtractions.keys());
  }
}

const offeringsPollingService = OfferingsPollingService.getInstance();

// Type for extracted offering
export interface ExtractedOffering {
  name: string;
  description: string;
  link: string;
}

// Type for extraction task response
interface ExtractionTaskResponse {
  task_id: string;
}

// Type for extraction status response
interface ExtractionStatusResponse {
  status?: "processing" | "completed" | "failed"; // Optional in new format
  type?: string; // New field from backend
  business_url?: string;
  offerings?: Array<{
    name?: string;
    offering?: string;
    description?: string;
    url?: string;
  }>;
  error?: string;
}

// Helper functions for localStorage persistence
const getTaskIdKey = (businessId: string) => `offering_task_${businessId}`;

const saveTaskId = (businessId: string, taskId: string) => {
  try {
    localStorage.setItem(getTaskIdKey(businessId), taskId);
  } catch (error) {
    console.error("Failed to save taskId to localStorage:", error);
  }
};

const getTaskId = (businessId: string): string | null => {
  try {
    return localStorage.getItem(getTaskIdKey(businessId));
  } catch (error) {
    console.error("Failed to get taskId from localStorage:", error);
    return null;
  }
};

const clearTaskId = (businessId: string) => {
  try {
    localStorage.removeItem(getTaskIdKey(businessId));
  } catch (error) {
    console.error("Failed to clear taskId from localStorage:", error);
  }
};

// Hook to start offerings extraction
export function useStartOfferingsExtraction() {
  return useMutation({
    mutationFn: async (businessUrl: string): Promise<string> => {
      const response = await api.post<ExtractionTaskResponse>(
        "/offering-extractor",
        "python",
        {
          business_url: businessUrl,
        }
      );

      if (!response.task_id) {
        throw new Error("Failed to start offerings extraction");
      }

      return response.task_id;
    },
    onError: (error: any) => {
      toast.error(
        `Error starting extraction: ${
          error?.response?.data?.detail || error?.message || "Unknown error"
        }`
      );
    },
  });
}

// Hook to check extraction status
// React Query handles the query, service keeps it active in background
export function useOfferingsExtractionStatus(
  businessId: string | null,
  taskId: string | null,
  enabled: boolean
) {
  const queryEnabled = enabled && !!taskId && !!businessId;

  return useQuery({
    queryKey: [OFFERINGS_EXTRACTOR_KEY, businessId, taskId],
    queryFn: async (): Promise<ExtractionStatusResponse> => {
      if (!taskId) {
        throw new Error("Task ID is required");
      }

      const response = await api.get<ExtractionStatusResponse>(
        `/offering-extractor?task_id=${taskId}`,
        "python"
      );

      return response;
    },
    enabled: queryEnabled,
    // Don't use refetchInterval here - service handles background polling via refetchQueries
    // This allows polling to continue even when component unmounts
    retry: false,
    staleTime: 0, // Always consider stale to allow refetch
  });
}

// Main hook to manage offerings extraction
export function useOfferingsExtractor(businessId: string | null) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const queryClient = useQueryClient();

  // Set queryClient in polling service so it can update cache
  useEffect(() => {
    offeringsPollingService.setQueryClient(queryClient);
  }, [queryClient]);

  // Load saved taskId from localStorage on mount and resume polling if needed
  useEffect(() => {
    if (businessId) {
      const savedTaskId = getTaskId(businessId);
      if (savedTaskId) {
        setTaskId(savedTaskId);
        
        // Check if extraction is already marked as active
        const isActive = offeringsPollingService.isExtracting(businessId);
        if (!isActive) {
          // First check React Query cache to avoid unnecessary API call
          const cachedData = queryClient.getQueryData<ExtractionStatusResponse>([
            OFFERINGS_EXTRACTOR_KEY,
            businessId,
            savedTaskId,
          ]);
          
          if (cachedData) {
            // We have cached data - check status
            if (cachedData.status === "processing") {
              // Still processing - start background polling service
              setIsExtracting(true);
              offeringsPollingService.startExtraction(businessId, savedTaskId);
            } else {
              // Already complete or failed - just set state, no API call needed
              setIsExtracting(false);
            }
          } else {
            // No cached data - check status via API only if we don't have cache
            const checkStatus = async () => {
              try {
                const response = await api.get<ExtractionStatusResponse>(
                  `/offering-extractor?task_id=${savedTaskId}`,
                  "python"
                );
                
                // Update cache with current status
                queryClient.setQueryData(
                  [OFFERINGS_EXTRACTOR_KEY, businessId, savedTaskId],
                  response
                );
                
                if (response.status === "processing") {
                  // Still processing - start background polling service
                  setIsExtracting(true);
                  offeringsPollingService.startExtraction(businessId, savedTaskId);
                } else {
                  // Already complete or failed - just set state
                  setIsExtracting(false);
                }
              } catch (error) {
                console.error("Error checking extraction status:", error);
                // Only start polling if we get an error and don't have cached data
                // This prevents unnecessary polling for completed extractions
                // Note: cachedData is null here (we're in the else block), so we start polling
                setIsExtracting(true);
                offeringsPollingService.startExtraction(businessId, savedTaskId);
              }
            };
            
            checkStatus();
          }
        } else {
          // Extraction already active - sync state and get taskId from service
          setIsExtracting(true);
          const serviceTaskId = offeringsPollingService.getTaskId(businessId);
          if (serviceTaskId && serviceTaskId !== savedTaskId) {
            // Service has different taskId, update our state
            setTaskId(serviceTaskId);
          }
        }
      }
    }

    // Cleanup: Don't stop extraction on unmount - let it continue in background
    // The service keeps it active, React Query will continue polling
    return () => {
      // Extraction continues in background via service
    };
  }, [businessId, queryClient]);

  // Mutation to start extraction
  const startExtractionMutation = useStartOfferingsExtraction();

  // Query to check extraction status
  // Enabled when we have a taskId (whether extracting or not, to read completed results from cache)
  const statusQuery = useOfferingsExtractionStatus(
    businessId,
    taskId,
    !!taskId && !!businessId
  );

  // Handle extraction start
  const startExtraction = useCallback(
    async (businessUrl: string) => {
      if (!businessId) {
        toast.error("Business ID is required");
        return;
      }

      if (!businessUrl) {
        toast.error("Please enter a website URL first");
        return;
      }

      try {
        setIsExtracting(true);
        const newTaskId = await startExtractionMutation.mutateAsync(
          businessUrl
        );
        setTaskId(newTaskId);
        saveTaskId(businessId, newTaskId);
        
        // Start background polling service - keeps React Query polling active
        // even if user navigates away (service calls refetchQueries periodically)
        offeringsPollingService.startExtraction(businessId, newTaskId);
      } catch (error) {
        setIsExtracting(false);
        // Error toast is handled by mutation's onError
      }
    },
    [businessId, startExtractionMutation]
  );

  // Handle extraction completion
  useEffect(() => {
    if (!statusQuery.data) return;

    // Check if extraction is complete:
    // 1. Status is explicitly "completed" OR
    // 2. Status is not "processing" AND (we have offerings OR we have a response with a type)
    const data = statusQuery.data;
    const status = data.status;
    const type = data.type;
    const hasOfferings = data.offerings && Array.isArray(data.offerings) && data.offerings.length > 0;
    
    // New response format may not have status, but will have type
    const isResponseReceived = type !== undefined;
    
    // If we have a type, or non-empty offerings, and status is not 'processing', we consider it done.
    const isComplete = status === "completed" || 
                       (status !== "processing" && (hasOfferings || isResponseReceived));
    
    const isFailed = status === "failed";
    
    if (isComplete || isFailed) {
      setIsExtracting(false);
      
      // CRITICAL: Stop polling service immediately when extraction is complete
      if (businessId) {
        offeringsPollingService.stopExtraction(businessId);
      }

      if (isFailed) {
        toast.error(
          statusQuery.data.error || "Failed to extract offerings from website"
        );
        if (businessId) {
          clearTaskId(businessId);
        }
        setTaskId(null);
      } else if (isComplete) {
        // Clear taskId from localStorage once extraction is complete and we have data
        // This ensures taskId is removed even if parent component doesn't process immediately
        if (businessId && taskId) {
          clearTaskId(businessId);
        }
      }
    }
  }, [statusQuery.data, businessId, taskId]);
  
  // Sync extraction state with service (for when user returns to page)
  useEffect(() => {
    if (!businessId || !taskId) return;
    
    // Check if extraction is marked as active in service
    const isActive = offeringsPollingService.isExtracting(businessId);
    if (isActive && !isExtracting) {
      setIsExtracting(true);
    }
  }, [businessId, taskId, isExtracting]);

  // Transform extracted offerings to our format
  const getExtractedOfferings = useCallback((): ExtractedOffering[] => {
    const data = statusQuery.data;
    if (!data) return [];

    // Check if we have offerings data
    if (
      data.offerings &&
      Array.isArray(data.offerings) &&
      data.offerings.length > 0
    ) {
      // Only return if status is "completed" OR if status is undefined but we have offerings/type
      const status = data.status;
      const type = data.type;
      
      // If completed explicitly, OR if we have type/offerings and not processing
      if (status === "completed" || 
          (status !== "processing" && (type !== undefined || data.offerings.length > 0))) {
        return data.offerings.map((offering) => ({
          name: offering.name || offering.offering || "",
          description: offering.description || "",
          link: offering.url || "",
        }));
      }
    }
    return [];
  }, [statusQuery.data]);

  // Clear task and stop extraction
  const clearExtraction = useCallback(() => {
    if (businessId) {
      clearTaskId(businessId);
      offeringsPollingService.stopExtraction(businessId);
    }
    setTaskId(null);
    setIsExtracting(false);
    queryClient.removeQueries({
      queryKey: [OFFERINGS_EXTRACTOR_KEY, businessId],
    });
  }, [businessId, queryClient]);

  // Determine extraction status - infer "completed" if we have offerings/type but no status
  const inferredStatus = useMemo((): "processing" | "completed" | "failed" | undefined => {
    const data = statusQuery.data as ExtractionStatusResponse | undefined;
    if (data) {
      const status = data.status;
      const type = data.type;
      const hasOfferings = data.offerings && Array.isArray(data.offerings) && data.offerings.length > 0;
      
      // If status is undefined but we have offerings OR type (e.g. "unknown"), treat as completed
      if (!status && (hasOfferings || type !== undefined)) {
        return "completed";
      }
      return status;
    }
    return undefined;
  }, [statusQuery.data]);

  return {
    startExtraction,
    isExtracting: isExtracting || startExtractionMutation.isPending,
    extractedOfferings: getExtractedOfferings(),
    extractionStatus: inferredStatus,
    extractionError: statusQuery.error,
    clearExtraction,
    taskId,
    // Expose raw query data for direct access if needed
    extractionData: statusQuery.data,
  };
}
