"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { toast } from "sonner"
import { api } from "./use-api"
import type { CallPrepBriefResponse, PrimaryDriversResponse } from "./use-primary-drivers"

const CALL_PREP_BRIEF_TIMEOUT_MS = 240_000

interface GenerateCallPrepBriefInput {
  businessId: string | null
  businessName: string
  primaryDrivers: PrimaryDriversResponse
}

function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string }>
  return (
    axiosError?.response?.data?.message ||
    (error instanceof Error ? error.message : "Failed to generate call brief")
  )
}

export function useCallPrepBrief() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      businessId,
      businessName,
      primaryDrivers,
    }: GenerateCallPrepBriefInput): Promise<CallPrepBriefResponse> => {
      if (!businessId) {
        throw new Error("Business ID is required to generate a call brief")
      }

      return api.post<CallPrepBriefResponse>(
        `/analytics/call-prep/brief?business_id=${encodeURIComponent(businessId)}`,
        "node",
        {
          business_id: businessId,
          business_name: businessName,
          primary_drivers: primaryDrivers,
        },
        {
          timeout: CALL_PREP_BRIEF_TIMEOUT_MS,
        },
      )
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["call-prep-runs", variables.businessId],
      })
    },
  })
}

export { CALL_PREP_BRIEF_TIMEOUT_MS }
