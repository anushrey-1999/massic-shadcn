import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/hooks/use-api";

function normalizeBusinessUrl(value: string): string {
  return String(value || "").trim().replace(/\/$/, "");
}

async function postQuickEvaluation(businessUrl: string): Promise<unknown> {
  return api.post("/quick-evaluation", "python", { business_url: businessUrl });
}

export function useQuickEvaluation() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { businessUrl: string }>({
    mutationFn: async ({ businessUrl }) => {
      const normalized = normalizeBusinessUrl(businessUrl);
      if (!normalized) throw new Error("business_url is required");

      const key = ["quick-evaluation", normalized] as const;
      const cached = queryClient.getQueryData<unknown>(key);
      if (cached != null) return cached;

      return postQuickEvaluation(normalized);
    },
    onSuccess: (data, variables) => {
      const normalized = normalizeBusinessUrl(variables.businessUrl);
      if (!normalized) return;
      queryClient.setQueryData(["quick-evaluation", normalized], data);
    },
    onError: (error) => {
      toast.error("Quick evaluation failed", {
        description: error.message || "Please try again.",
      });
    },
  });
}

