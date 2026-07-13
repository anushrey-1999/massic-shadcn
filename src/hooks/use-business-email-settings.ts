import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/hooks/use-api";

export type SendingMode = "massic_default" | "custom_domain";

export type BusinessEmailDomain = {
  id: number;
  domain: string;
  sendGridDomainId: number | null;
  status: "pending_dns" | "verified" | "failed" | "disabled";
  dnsRecords: Array<{ key: string; type: string; host: string; value: string; valid?: boolean }>;
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

const key = (businessId: string | null) => ["business-email-settings", businessId] as const;

function unwrap<T>(response: ApiEnvelope<T>): T {
  if (response.err || !response.data) {
    throw new Error(response.message || "Email settings request failed");
  }
  return response.data;
}

export function useBusinessEmailSettings(businessId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: key(businessId),
    enabled: Boolean(businessId),
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<BusinessEmailSettingsResponse>>(
        `/businesses/${businessId}/email-settings`,
        "node"
      );
      return unwrap(response);
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key(businessId) });

  const updateSettings = useMutation({
    mutationFn: async (payload: { sendingMode?: SendingMode; massicReplyToEmail?: string | null }) => {
      const response = await api.patch<ApiEnvelope<BusinessEmailSettingsResponse>>(
        `/businesses/${businessId}/email-settings`,
        "node",
        payload
      );
      return unwrap(response);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("Email settings saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createDomain = useMutation({
    mutationFn: async (domain: string) => {
      const response = await api.post<ApiEnvelope<BusinessEmailSettingsResponse>>(
        `/businesses/${businessId}/email-domains`,
        "node",
        { domain }
      );
      return unwrap(response);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("DNS setup ready");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const validateDomain = useMutation({
    mutationFn: async (domainId: number) => {
      const response = await api.post<ApiEnvelope<BusinessEmailSettingsResponse>>(
        `/businesses/${businessId}/email-domains/${domainId}/validate`,
        "node"
      );
      return unwrap(response);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("DNS status refreshed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteDomain = useMutation({
    mutationFn: async (domainId: number) => {
      const response = await api.delete<ApiEnvelope<BusinessEmailSettingsResponse>>(
        `/businesses/${businessId}/email-domains/${domainId}`,
        "node"
      );
      return unwrap(response);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("Domain removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createSender = useMutation({
    mutationFn: async (payload: { email: string; fromName?: string; replyToEmail?: string }) => {
      const response = await api.post<ApiEnvelope<BusinessEmailSettingsResponse>>(
        `/businesses/${businessId}/email-senders`,
        "node",
        payload
      );
      return unwrap(response);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("Verification email sent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resendVerification = useMutation({
    mutationFn: async (senderId: number) => {
      const response = await api.post<ApiEnvelope<BusinessEmailSettingsResponse>>(
        `/businesses/${businessId}/email-senders/${senderId}/resend-verification`,
        "node"
      );
      return unwrap(response);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("Verification email resent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setDefaultReviewSender = useMutation({
    mutationFn: async (senderId: number) => {
      const response = await api.patch<ApiEnvelope<BusinessEmailSettingsResponse>>(
        `/businesses/${businessId}/email-senders/${senderId}/default-review`,
        "node",
        {}
      );
      return unwrap(response);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key(businessId), data);
      toast.success("Default review sender updated");
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
