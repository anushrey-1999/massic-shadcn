import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";

export type SendingMode = "massic_default" | "custom_domain";

export type BusinessEmailDomain = {
  id: number;
  domain: string;
  sendGridDomainId: number | null;
  status: "pending_dns" | "verified" | "failed" | "disabled";
  dnsRecords: Array<{
    key: string;
    type: string;
    host: string;
    value: string;
    valid?: boolean;
  }>;
  validationResults: {
    validation_results?: Record<string, { valid?: boolean; reason?: string }>;
  } | null;
  lastValidatedAt: string | null;
};

export type BusinessEmailSender = {
  id: number;
  domainId: number;
  email: string;
  fromName: string | null;
  replyToEmail: string | null;
  status: "pending_verification" | "verified" | "disabled";
  verifiedAt: string | null;
  defaultForReviews: boolean;
  verificationTokenExpiresAt: string | null;
};

export type BusinessEmailSettingsResponse = {
  settings: {
    businessId: string;
    sendingMode: SendingMode;
    massicReplyToEmail: string | null;
    defaultReviewSenderId: number | null;
  };
  business: { id: string; name: string };
  massicSender: {
    fromEmail: string;
    fromName: string;
    replyToEmail: string | null;
  };
  customSendersEnabled: boolean;
  domains: BusinessEmailDomain[];
  senders: BusinessEmailSender[];
  reviewSuppressionsCount: number;
};

type ApiEnvelope<T> = { err?: boolean; data?: T; message?: string };

const key = (businessId: string | null) =>
  ["business-email-settings", businessId] as const;

function unwrap<T>(response: ApiEnvelope<T>): T {
  if (response.err || !response.data) {
    throw new Error(response.message || "Email settings request failed");
  }
  return response.data;
}

async function requestEmailApi<T>(
  operation: () => Promise<ApiEnvelope<T>>,
): Promise<T> {
  try {
    return unwrap(await operation());
  } catch (error) {
    if (isAxiosError<ApiEnvelope<unknown>>(error)) {
      const message = error.response?.data?.message;
      if (message) {
        throw new Error(message);
      }
    }

    throw error;
  }
}

export function useBusinessEmailSettings(businessId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: key(businessId),
    enabled: Boolean(businessId),
    queryFn: () =>
      requestEmailApi(() =>
        api.get<ApiEnvelope<BusinessEmailSettingsResponse>>(
          `/businesses/${businessId}/email-settings`,
          "node",
        ),
      ),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: key(businessId) });

  const updateSettings = useMutation({
    mutationFn: (payload: {
      sendingMode?: SendingMode;
      massicReplyToEmail?: string | null;
    }) =>
      requestEmailApi(() =>
        api.patch<ApiEnvelope<BusinessEmailSettingsResponse>>(
          `/businesses/${businessId}/email-settings`,
          "node",
          payload,
        ),
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("Email settings saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createDomain = useMutation({
    mutationFn: (domain: string) =>
      requestEmailApi(() =>
        api.post<ApiEnvelope<BusinessEmailSettingsResponse>>(
          `/businesses/${businessId}/email-domains`,
          "node",
          { domain },
        ),
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("DNS setup ready");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const validateDomain = useMutation({
    mutationFn: (domainId: number) =>
      requestEmailApi(() =>
        api.post<ApiEnvelope<BusinessEmailSettingsResponse>>(
          `/businesses/${businessId}/email-domains/${domainId}/validate`,
          "node",
        ),
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("DNS status refreshed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteDomain = useMutation({
    mutationFn: (domainId: number) =>
      requestEmailApi(() =>
        api.delete<ApiEnvelope<BusinessEmailSettingsResponse>>(
          `/businesses/${businessId}/email-domains/${domainId}`,
          "node",
        ),
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("Domain removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createSender = useMutation({
    mutationFn: (payload: {
      email: string;
      fromName?: string;
      replyToEmail?: string;
    }) =>
      requestEmailApi(() =>
        api.post<ApiEnvelope<BusinessEmailSettingsResponse>>(
          `/businesses/${businessId}/email-senders`,
          "node",
          payload,
        ),
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("Verification email sent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resendVerification = useMutation({
    mutationFn: (senderId: number) =>
      requestEmailApi(() =>
        api.post<ApiEnvelope<BusinessEmailSettingsResponse>>(
          `/businesses/${businessId}/email-senders/${senderId}/resend-verification`,
          "node",
        ),
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("Verification email resent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setDefaultReviewSender = useMutation({
    mutationFn: (senderId: number) =>
      requestEmailApi(() =>
        api.patch<ApiEnvelope<BusinessEmailSettingsResponse>>(
          `/businesses/${businessId}/email-senders/${senderId}/default-review`,
          "node",
          {},
        ),
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("Review emails will use this sender");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    ...query,
    invalidate,
    updateSettings,
    createDomain,
    validateDomain,
    deleteDomain,
    createSender,
    resendVerification,
    setDefaultReviewSender,
  };
}
