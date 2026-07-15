import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import {
  applyFormValues,
  mapAutofillResultToFormValues,
} from "@/utils/profile-form-mappers";
import {
  createAndPollProfileResult,
  normalizeProfileCountry,
  type NormalizedProfileResult,
} from "@/utils/profile-result";
import {
  formatPrimaryLocationApiValue,
  parsePrimaryLocationForPayload,
} from "@/utils/primary-location";
import { cleanWebsiteUrl } from "@/utils/utils";
import { getAutofillErrorMessage } from "@/utils/profile-autofill";

type LocationOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type UseProfileAutofillFormOptions = {
  form: any;
  locationOptions?: LocationOption[];
  normalizeWebsite?: boolean;
  onBeforeAutofill?: (website: string) => void | boolean | Promise<void | boolean>;
  onAutofillSuccess?: (
    profile: NormalizedProfileResult,
    values: BusinessInfoFormData
  ) => void | Promise<void>;
  guard?: () => boolean;
};

export function useProfileAutofillForm({
  form,
  locationOptions,
  normalizeWebsite,
  onBeforeAutofill,
  onAutofillSuccess,
  guard,
}: UseProfileAutofillFormOptions) {
  const [isAutofillLoading, setIsAutofillLoading] = useState(false);
  const [autofillProfileResult, setAutofillProfileResult] =
    useState<NormalizedProfileResult | null>(null);

  const autofillProfile = useCallback(async () => {
    if (guard && !guard()) return null;

    const values = form.state.values as BusinessInfoFormData;
    const website = cleanWebsiteUrl(values?.website || "").trim();
    if (!website) {
      toast.error("Please enter a website URL first");
      return null;
    }
    if (!values?.primaryLocation?.trim()) {
      toast.error("Please select a location first");
      return null;
    }
    const serviceAreaType = values.serviceAreaType?.trim();
    if (!serviceAreaType) {
      toast.error("Please select a service area type first");
      return null;
    }

    setIsAutofillLoading(true);
    try {
      const shouldContinue = await onBeforeAutofill?.(website);
      if (shouldContinue === false) return null;
      const profileLocationPayload = parsePrimaryLocationForPayload(
        values.primaryLocation,
        locationOptions
      );
      const profile = await createAndPollProfileResult(website, {
        country: normalizeProfileCountry(profileLocationPayload.Country),
        location: formatPrimaryLocationApiValue(profileLocationPayload),
        serviceAreaType,
      });
      const nextValues = mapAutofillResultToFormValues(values, profile, website, {
        normalizeWebsite,
      });

      setAutofillProfileResult(profile);
      applyFormValues(form, nextValues);
      await onAutofillSuccess?.(profile, nextValues);
      toast.success("Profile fields updated from website");
      return { profile, values: nextValues };
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
      return null;
    } finally {
      setIsAutofillLoading(false);
    }
  }, [
    form,
    guard,
    locationOptions,
    normalizeWebsite,
    onAutofillSuccess,
    onBeforeAutofill,
  ]);

  return {
    autofillProfile,
    autofillProfileResult,
    isAutofillLoading,
    setAutofillProfileResult,
  };
}
