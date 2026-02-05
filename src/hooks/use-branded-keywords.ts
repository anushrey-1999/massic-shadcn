import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";
import { useJobByBusinessId, useUpdateJob, type Offering } from "./use-jobs";
import { useBusinessProfileById } from "./use-business-profiles";

interface UpdateBrandedKeywordsPayload {
  BrandTerms: string[];
}

export function useBrandedKeywords(businessUniqueId: string | null) {
  const queryClient = useQueryClient();
  const { data: jobDetails } = useJobByBusinessId(businessUniqueId);
  const { profileData } = useBusinessProfileById(businessUniqueId);
  const updateJobMutation = useUpdateJob();

  const { data: keywords = [], isLoading } = useQuery<string[]>({
    queryKey: ["brandedKeywords", businessUniqueId],
    queryFn: async () => {
      if (!businessUniqueId) return [];

      const response = await api.get<{
        err: boolean;
        data?: string;
        message?: string;
      }>(`/profile/get-business-profile/?uniqueId=${businessUniqueId}`, "node");

      if (!response.err && response.data) {
        const profile = JSON.parse(response.data);
        const brandTerms = profile.BrandTerms || profile.brand_terms;
        return Array.isArray(brandTerms) ? brandTerms : [];
      }

      return [];
    },
    enabled: !!businessUniqueId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const updateKeywordsMutation = useMutation({
    mutationFn: async (newKeywords: string[]) => {
      if (!businessUniqueId) {
        throw new Error("Business ID is required");
      }

      const payload = {
        UniqueId: businessUniqueId,
        BrandTerms: newKeywords,
      };

      await api.post(
        `/profile/update-business-profile`,
        "node",
        payload
      );

      if (jobDetails?.job_id && profileData) {
        const normalizeOfferings = (raw: any): Offering[] => {
          if (!Array.isArray(raw)) return [];
          return raw
            .map((offering: any) => ({
              name: String(offering?.offering ?? offering?.name ?? "").trim(),
              description: String(offering?.description ?? "").trim(),
              link: String(offering?.url ?? offering?.link ?? "").trim(),
            }))
            .filter((offering) => Boolean(offering.name));
        };

        const offerings = normalizeOfferings(jobDetails?.offerings);

        const ctasArray = (profileData as any).CTAs || [];
        const businessPayloadWithUpdatedBrandTerms: any = {
          ...profileData,
          BrandTerms: newKeywords,
          CTAs: Array.isArray(ctasArray) && ctasArray.length > 0
            ? {
                value: JSON.stringify(
                  ctasArray.map((cta: any) => ({
                    buttonText: cta.buttonText || "",
                    url: cta.url || "",
                  }))
                ),
              }
            : null,
        };

        await updateJobMutation.mutateAsync({
          businessId: businessUniqueId,
          businessProfilePayload: businessPayloadWithUpdatedBrandTerms,
          offerings,
          includeOfferings: false,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["brandedKeywords", businessUniqueId],
      });
      queryClient.invalidateQueries({
        queryKey: ["businessProfiles", "detail", businessUniqueId],
      });
      queryClient.invalidateQueries({
        queryKey: ["businessProfiles"],
      });
      if (jobDetails?.job_id) {
        queryClient.invalidateQueries({
          queryKey: ["job", "detail", businessUniqueId],
        });
      }
      toast.success("Branded keywords updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.message || "Failed to update branded keywords"
      );
    },
  });

  return {
    keywords,
    isLoading,
    updateKeywords: updateKeywordsMutation.mutateAsync,
    isUpdating: updateKeywordsMutation.isPending,
  };
}
