"use client";

import React, { useCallback, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import * as z from "zod";
import { toast } from "sonner";
import { useLocations } from "@/hooks/use-locations";
import {
  useCreateBusiness,
  useBusinessProfiles,
} from "@/hooks/use-business-profiles";
import { CreateBusinessTemplate } from "@/components/templates/CreateBusinessTemplate";
import { api } from "@/hooks/use-api";
import { cleanWebsiteUrl } from "@/utils/utils";
import { getAutofillErrorMessage } from "@/utils/profile-autofill";

interface ProfileAutofillResponse {
  business_url?: string;
  profile_autofill?: {
    business_name?: string;
    url?: string;
    market?: string;
    sell?: string;
    error?: string | null;
    reason?: string | null;
    recommendation?: string | null;
    [key: string]: unknown;
  };
  errors?: string | string[] | null;
  error?: string | null;
  message?: string | null;
  detail?: string | null;
}

const formSchema = z.object({
  website: z
    .string()
    .min(1, "Website is required")
    .url("Please enter a valid URL"),
  businessName: z.string().min(1, "Business Name is required"),
  primaryLocation: z.string().min(1, "Primary Location is required"),
  serveCustomers: z
    .string()
    .min(1, "Please select where you serve your customers")
    .refine((val) => val === "local" || val === "online", {
      message: "Please select where you serve your customers",
    }),
  offerType: z
    .string()
    .min(1, "Please select what you offer")
    .refine((val) => val === "products" || val === "services", {
      message: "Please select what you offer",
    }),
});

type FormData = z.infer<typeof formSchema>;
const formFieldNames = [
  "website",
  "businessName",
  "primaryLocation",
  "serveCustomers",
  "offerType",
] as const;

export default function CreateBusinessPage() {
  const router = useRouter();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");

  const createBusiness = useCreateBusiness();
  const { refetchBusinessProfiles } = useBusinessProfiles();
  const [isAutofillLoading, setIsAutofillLoading] = useState(false);
  const [hasAutofilledProfile, setHasAutofilledProfile] = useState(false);

  const form = useForm({
    defaultValues: {
      website: "",
      businessName: "",
      primaryLocation: "",
      serveCustomers: "",
      offerType: "",
    },
    validators: {
      onChange: formSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await createBusiness.mutateAsync({
          website: value.website,
          businessName: value.businessName,
          primaryLocation: value.primaryLocation,
          serveCustomers: value.serveCustomers as "local" | "online",
          offerType: value.offerType as "products" | "services",
        });

        await refetchBusinessProfiles();

        if (result?.createdBusiness?.UniqueId) {
          router.push(`/business/${result.createdBusiness.UniqueId}/analytics`);
        } else {
          router.push("/");
        }
      } catch (error) {
        // Error is already handled in the hook's onError
        throw error;
      }
    },
  });

  const handleAutofillProfile = useCallback(async () => {
    const values = form.state.values as FormData;
    const website = cleanWebsiteUrl(values?.website || "").trim();

    if (!website) {
      toast.error("Please enter a website URL first");
      return;
    }

    if (!values?.primaryLocation?.trim()) {
      toast.error("Please select a location first");
      return;
    }

    setIsAutofillLoading(true);
    try {
      const res = await api.post<ProfileAutofillResponse>(
        "/tools/autofill-profile",
        "python",
        { business_url: website },
        { timeout: 120000 }
      );
      const autofillErrorMessage = getAutofillErrorMessage(res, "");
      if (autofillErrorMessage) {
        toast.error(autofillErrorMessage);
        return;
      }

      const pa = res?.profile_autofill;
      if (!pa) {
        const fallbackMessage = String(res?.message ?? res?.detail ?? "").trim();
        toast.error(fallbackMessage || "Failed to autofill profile");
        return;
      }

      const nextWebsite = cleanWebsiteUrl(
        String(pa.url || res?.business_url || website)
      );
      if (nextWebsite) {
        form.setFieldValue("website", nextWebsite);
      }

      const nextBusinessName = String(pa.business_name ?? "").trim();
      if (nextBusinessName) {
        form.setFieldValue("businessName", nextBusinessName);
      }

      const market = String(pa.market ?? "").trim().toLowerCase();
      if (market === "local" || market === "online") {
        form.setFieldValue("serveCustomers", market);
      }

      const sell = String(pa.sell ?? "").trim().toLowerCase();
      if (sell === "products" || sell === "services") {
        form.setFieldValue("offerType", sell);
      }

      formFieldNames.forEach((fieldName) => {
        form.setFieldMeta(fieldName, (prev: any) => ({
          ...prev,
          isTouched: false,
          isValid: true,
          errors: [],
          errorMap: {},
          hasValidationErrors: false,
        }));
      });
      setHasAutofilledProfile(true);
      toast.success("Profile fields updated from website");
    } catch (error: any) {
      const fallbackMessage = String(
        error?.response?.data?.message ??
          error?.response?.data?.detail ??
          error?.message ??
          ""
      ).trim();
      toast.error(
        getAutofillErrorMessage(error?.response?.data ?? error, "") ||
          fallbackMessage ||
          "Failed to autofill profile"
      );
    } finally {
      setIsAutofillLoading(false);
    }
  }, [form]);

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <CreateBusinessTemplate
      form={form}
      locationOptions={locationOptions}
      locationsLoading={locationsLoading}
      isSubmitting={form.state.isSubmitting}
      isPending={createBusiness.isPending}
      isAutofillLoading={isAutofillLoading}
      hasAutofilledProfile={hasAutofilledProfile}
      onAutofillProfile={handleAutofillProfile}
      onCancel={handleCancel}
    />
  );
}
