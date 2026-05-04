"use client";

import React, { useCallback, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import * as z from "zod";
import { toast } from "sonner";
import { useLocations } from "@/hooks/use-locations";
import {
  useCreateBusiness,
  useBusinessProfiles,
} from "@/hooks/use-business-profiles";
import type { BusinessProfile } from "@/store/business-store";
import { CreateBusinessTemplate } from "@/components/templates/CreateBusinessTemplate";
import { api } from "@/hooks/use-api";
import {
  cleanWebsiteUrl,
  normalizeWebsiteUrl,
} from "@/utils/utils";
import { getAutofillErrorMessage } from "@/utils/profile-autofill";
import {
  useCreateJob,
  type BusinessProfilePayload,
  type Offering,
} from "@/hooks/use-jobs";
import { useStartOfferingsExtraction } from "@/hooks/use-offerings-extractor";

interface ProfileAutofillResponse {
  business_url?: string;
  profile_autofill?: {
    business_name?: string;
    url?: string;
    market?: string;
    ltv?: string;
    sell?: string;
    competitors?: string[];
    ctas?: Array<{ text?: string; url?: string }>;
    brand_terms?: string[];
    web_tone?: string[];
    social_tone?: string[];
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

interface OfferingsExtractionStatusResponse {
  status?: "processing" | "completed" | "failed";
  type?: string;
  offerings?: Array<{
    name?: string;
    offering?: string;
    description?: string;
    url?: string;
    link?: string;
  }>;
  error?: string;
  errors?: string[];
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureHttpsUrl = (raw: unknown): string => {
  const s = String(raw ?? "")
    .replace(/^sc-domain:/i, "")
    .trim();
  if (!s) return "";
  if (/^(tel:|mailto:)/i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) {
    return s.replace(/^http:\/\//i, "https://");
  }
  return `https://${s}`;
};

const normalizeOfferingLink = (rawLink: unknown, website: string): string => {
  const link = String(rawLink ?? "").replace(/^sc-domain:/i, "").trim();
  if (!link) return "";
  if (/^(mailto:|tel:)/i.test(link)) return link;

  if (/^https?:\/\//i.test(link)) {
    return link.replace(/^http:\/\//i, "https://");
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(link)) {
    return `https://${link.replace(/^\/+/, "")}`;
  }

  const baseUrl = normalizeWebsiteUrl(website);
  if (!baseUrl) return "";

  try {
    return new URL(link, baseUrl).toString();
  } catch {
    return "";
  }
};

const mapExtractedOfferings = (
  rawOfferings: OfferingsExtractionStatusResponse["offerings"],
  website: string
): Offering[] => {
  if (!Array.isArray(rawOfferings)) return [];

  return rawOfferings
    .map((offering) => ({
      name: String(offering.name || offering.offering || "").trim(),
      description: String(offering.description || "").trim(),
      link: normalizeOfferingLink(offering.url || offering.link, website),
    }))
    .filter((offering) => Boolean(offering.name));
};

const pollOfferingsExtraction = async (
  taskId: string,
  website: string
): Promise<Offering[]> => {
  const startedAt = Date.now();
  const timeoutMs = 120000;

  while (Date.now() - startedAt < timeoutMs) {
    const response = await api.get<OfferingsExtractionStatusResponse>(
      `/tools/extract-offerings?task_id=${taskId}`,
      "python"
    );

    const errors = response?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      throw new Error(errors[0]);
    }

    if (response?.status === "failed") {
      throw new Error(response.error || "Failed to extract offerings");
    }

    const hasOfferings =
      Array.isArray(response?.offerings) && response.offerings.length > 0;
    const isComplete =
      response?.status === "completed" ||
      (response?.status !== "processing" && (hasOfferings || response?.type !== undefined));

    if (isComplete) {
      return mapExtractedOfferings(response.offerings, website);
    }

    await sleep(5000);
  }

  return [];
};

const buildBusinessProfilePayload = (
  value: FormData,
  autofillData: ProfileAutofillResponse["profile_autofill"] | null
): BusinessProfilePayload => {
  const locationParts = value.primaryLocation.split(",");
  const location = locationParts[0]?.trim() || "";
  const country = locationParts[1]?.trim() || "united states";

  const ltv = String(autofillData?.ltv ?? "").trim().toLowerCase();
  const ctas = Array.isArray(autofillData?.ctas)
    ? autofillData.ctas
      .map((cta) => ({
        buttonText: String(cta?.text ?? "").trim(),
        url: ensureHttpsUrl(cta?.url),
      }))
      .filter((cta) => Boolean(cta.buttonText && cta.url))
    : [];

  const competitors = Array.isArray(autofillData?.competitors)
    ? autofillData.competitors
      .filter((url): url is string => Boolean(url && String(url).trim()))
      .map((url) => cleanWebsiteUrl(String(url)))
      .filter(Boolean)
      .map((url) => ({ website: url }))
    : null;

  const brandTerms =
    Array.isArray(autofillData?.brand_terms) && autofillData.brand_terms.length > 0
      ? autofillData.brand_terms.map((term) => String(term).trim()).filter(Boolean)
      : null;

  const normalizeTone = (raw: unknown): string[] | null => {
    if (!Array.isArray(raw)) return null;

    const tones = raw
      .map((tone) => String(tone).trim())
      .filter(Boolean)
      .slice(0, 3);

    return tones.length > 0 ? tones : null;
  };

  return {
    Website: normalizeWebsiteUrl(cleanWebsiteUrl(value.website)),
    Name: value.businessName,
    Description: "",
    UserDefinedBusinessDescription: "",
    PrimaryLocation: {
      Location: location,
      Country: country,
    },
    BusinessObjective: value.serveCustomers,
    LocationType: value.offerType,
    LTV: ltv === "high" || ltv === "low" ? ltv : null,
    BrandTerms: brandTerms,
    CTAs:
      ctas.length > 0
        ? {
          value: JSON.stringify(ctas),
        }
        : null,
    Competitors: competitors,
    SocialBrandVoice: normalizeTone(autofillData?.social_tone),
    WebBrandVoice: normalizeTone(autofillData?.web_tone),
    USPs: null,
    SellingPoints: null,
  };
};

const updateCreatedBusinessProfile = async (
  businessId: string,
  createdBusiness: BusinessProfile | null,
  payload: BusinessProfilePayload
) => {
  await api.post(
    "/profile/update-business-profile",
    "node",
    {
      ...(createdBusiness ?? {}),
      ...payload,
      UniqueId: businessId,
    }
  );
};

export default function CreateBusinessPage() {
  const router = useRouter();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");

  const createBusiness = useCreateBusiness();
  const createJob = useCreateJob();
  const startOfferingsExtraction = useStartOfferingsExtraction();
  const { refetchBusinessProfiles } = useBusinessProfiles();
  const [isAutofillLoading, setIsAutofillLoading] = useState(false);
  const [hasAutofilledProfile, setHasAutofilledProfile] = useState(false);
  const [autofillProfileData, setAutofillProfileData] = useState<
    ProfileAutofillResponse["profile_autofill"] | null
  >(null);
  const [extractedOfferings, setExtractedOfferings] = useState<Offering[]>([]);
  const offeringsExtractionPromiseRef = useRef<Promise<Offering[]> | null>(null);
  const offeringsExtractionRunIdRef = useRef(0);

  const startOfferingsExtractionForWebsite = useCallback(
    (website: string) => {
      const runId = offeringsExtractionRunIdRef.current + 1;
      offeringsExtractionRunIdRef.current = runId;

      const extractionPromise = (async () => {
        try {
          const taskId = await startOfferingsExtraction.mutateAsync(website);
          const offerings = await pollOfferingsExtraction(taskId, website);
          if (offeringsExtractionRunIdRef.current === runId) {
            setExtractedOfferings(offerings);
          }
          return offerings;
        } catch (error) {
          console.error("Failed to extract offerings:", error);
          return [];
        } finally {
          if (offeringsExtractionRunIdRef.current === runId) {
            offeringsExtractionPromiseRef.current = null;
          }
        }
      })();

      offeringsExtractionPromiseRef.current = extractionPromise;
      return extractionPromise;
    },
    [startOfferingsExtraction]
  );

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

        const businessId = result?.createdBusiness?.UniqueId;
        if (businessId) {
          const offerings =
            extractedOfferings.length > 0
              ? extractedOfferings
              : offeringsExtractionPromiseRef.current
                ? await offeringsExtractionPromiseRef.current
                : [];
          const businessProfilePayload = buildBusinessProfilePayload(
            value,
            autofillProfileData
          );

          try {
            await updateCreatedBusinessProfile(
              businessId,
              result.createdBusiness,
              businessProfilePayload
            );
          } catch (error) {
            console.error("Failed to update business profile after creation:", error);
          }

          try {
            await createJob.mutateAsync({
              businessId,
              businessProfilePayload,
              offerings,
            });
          } catch (error) {
            console.error("Failed to create job after business creation:", error);
          }

          await refetchBusinessProfiles();

          router.push(`/business/${businessId}/profile`);
        } else {
          router.push("/");
        }
      } catch (error) {
        // Error is already handled in the hook's onError
        throw error;
      }
    },
  });

  const handleSubmitCreate = useCallback(() => {
    const values = form.state.values as FormData;
    const validation = formSchema.safeParse(values);

    formFieldNames.forEach((fieldName) => {
      const fieldIssue = validation.success
        ? undefined
        : validation.error.issues.find((issue) => issue.path[0] === fieldName);

      form.setFieldMeta(fieldName, (prev: any) => ({
        ...prev,
        isTouched: true,
        isValid: !fieldIssue,
        errors: fieldIssue ? [{ message: fieldIssue.message }] : [],
        errorMap: fieldIssue
          ? {
            onChange: [{ message: fieldIssue.message }],
          }
          : {},
        hasValidationErrors: Boolean(fieldIssue),
      }));
    });

    if (!validation.success) {
      toast.error("Please fix the highlighted fields before creating your business.");
      return;
    }

    form.handleSubmit();
  }, [form]);

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
    setExtractedOfferings([]);
    startOfferingsExtractionForWebsite(website);
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

      setAutofillProfileData(pa);

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
  }, [form, startOfferingsExtractionForWebsite]);

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <CreateBusinessTemplate
      form={form}
      locationOptions={locationOptions}
      locationsLoading={locationsLoading}
      isSubmitting={form.state.isSubmitting}
      isPending={createBusiness.isPending || createJob.isPending}
      isAutofillLoading={isAutofillLoading}
      hasAutofilledProfile={hasAutofilledProfile}
      onAutofillProfile={handleAutofillProfile}
      onSubmitCreate={handleSubmitCreate}
      onCancel={handleCancel}
    />
  );
}
