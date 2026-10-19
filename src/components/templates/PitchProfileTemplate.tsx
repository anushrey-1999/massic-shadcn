"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/molecules/PageHeader";
import { ProfileEditorTemplate } from "./ProfileEditorTemplate";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useBusinessProfileById,
  useUpdateBusinessProfile,
} from "@/hooks/use-business-profiles";
import { useConvertPitchToBusiness } from "@/hooks/use-business-actions";
import {
  useCreateJob,
  useJobByBusinessId,
  useUpdateJob,
} from "@/hooks/use-jobs";
import { useLocations } from "@/hooks/use-locations";
import { useProfileFormSync } from "@/hooks/use-profile-form-sync";
import { useProfileValidation } from "@/hooks/use-profile-validation";
import { ProfileLoadingBoundary } from "@/components/organisms/profile/ProfileLoadingBoundary";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import { businessInfoSchema } from "@/schemas/ProfileFormSchema";
import { useBusinessStore } from "@/store/business-store";
import {
  buildBusinessProfilePayload,
  mapProfileDataToFormValues,
  selectCombinedBusinessPayload,
} from "@/utils/profile-form-mappers";
import { mergeJobAndNodeFormValues } from "@/utils/profile-v2-mappers";
import { type ProfileValidationIssue } from "@/utils/profile-form-fields";
import { isOrchestrationActive } from "@/lib/workflow-status";
import { apiErrorMessage } from "@/lib/api-error";

export function PitchProfileTemplate() {
  const params = useParams();
  const router = useRouter();
  const businessId = params?.id as string;
  const {
    locationOptions,
    isLoading: locationsLoading,
    isFetching: locationsFetching,
  } = useLocations("us");
  const {
    profileData,
    profileDataLoading,
    profileDataFetching,
    profileDataError,
    refetchProfile,
  } = useBusinessProfileById(businessId || null);
  const jobQuery = useJobByBusinessId(businessId || null);
  const updateNode = useUpdateBusinessProfile(businessId || null, {
    silent: true,
  });
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const convert = useConvertPitchToBusiness();
  const guardSave = useFeatureActionGuard("profile.save");
  const guardConvert = useFeatureActionGuard("business.convertPitch");
  const [converting, setConverting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<ProfileValidationIssue[]>([]);
  const [focusRequest, setFocusRequest] = useState(0);
  const operationRef = useRef(false);
  const lastError = useRef("");
  const setLocationOptions = useBusinessStore(
    (state) => state.setLocationOptions,
  );
  const setLocationsLoading = useBusinessStore(
    (state) => state.setLocationsLoading,
  );
  const serverValues = useMemo(() => {
    const node = mapProfileDataToFormValues(
      profileData ?? null,
      null,
      locationOptions,
    );
    return jobQuery.data?.job_id
      ? mergeJobAndNodeFormValues(jobQuery.data, node)
      : node;
  }, [jobQuery.data, locationOptions, profileData]);
  const initialValues = useRef(serverValues);
  const form = useForm({
    defaultValues: initialValues.current,
    validators: { onBlur: businessInfoSchema as never },
  });
  const values = useStore(form.store, (state) => state.values);
  const validation = useProfileValidation(
    values,
    serverValues.primaryCategory,
    "minimal",
  );
  const { isDirty, isHydrated, markSaved, markSaveFailed } = useProfileFormSync(
    {
      form,
      serverValues,
      loading: profileDataLoading || jobQuery.isLoading || locationsLoading,
      saving,
    },
  );
  const { allowNavigation } = useUnsavedChangesGuard({ isDirty });
  const processing =
    jobQuery.data?.profile_status === "processing" ||
    isOrchestrationActive(jobQuery.data);
  const loading = profileDataLoading || jobQuery.isLoading || locationsLoading;
  const locked =
    Boolean(jobQuery.error ?? profileDataError) ||
    loading ||
    processing ||
    saving ||
    convert.isPending;

  useEffect(() => {
    setLocationOptions(locationOptions);
    setLocationsLoading(locationsLoading);
  }, [
    locationOptions,
    locationsLoading,
    setLocationOptions,
    setLocationsLoading,
  ]);
  useEffect(() => {
    if (!jobQuery.error && !profileDataError) {
      lastError.current = "";
      return;
    }
    const message = apiErrorMessage(jobQuery.error ?? profileDataError);
    if (message !== lastError.current) {
      toast.error("Couldn't refresh the pitch profile", {
        description: message,
      });
      lastError.current = message;
    }
  }, [jobQuery.error, profileDataError]);

  const save = async () => {
    if (
      !guardSave() ||
      locked ||
      operationRef.current ||
      (jobQuery.data?.job_id && !isDirty)
    )
      return;
    const values = form.state.values;
    operationRef.current = true;
    setSaving(true);
    try {
      const nextIssues = await validation.validate(values, "save");
      setIssues(nextIssues);
      if (nextIssues.length) {
        setFocusRequest((value) => value + 1);
        toast.error(nextIssues[0].message);
        return;
      }
      const nodePrimaryCategory = mapProfileDataToFormValues(
        profileData ?? null,
        null,
        locationOptions,
      ).primaryCategory;
      const includePrimaryCategory =
        values.primaryCategory !== serverValues.primaryCategory ||
        (Boolean(nodePrimaryCategory) &&
          values.primaryCategory !== nodePrimaryCategory);
      const job = jobQuery.data?.job_id
        ? await updateJob.mutateAsync({
            businessId,
            values,
            locationOptions,
            mode: "minimal",
            includePrimaryCategory,
          })
        : await createJob.mutateAsync({ businessId, values, locationOptions });
      const payload = selectCombinedBusinessPayload(
        buildBusinessProfilePayload(values, {
          existingProfile: profileData,
          locationOptions,
          preserveExistingProfile: true,
        }),
        { includePrimaryCategory },
      );
      payload.ProfileId = job.profile_id ?? (profileData as any)?.ProfileId;
      await updateNode.mutateAsync(payload);
      await Promise.all([
        jobQuery.refetch({ throwOnError: true }),
        refetchProfile({ throwOnError: true }),
      ]);
      markSaved(values);
      toast.success("Pitch profile saved");
    } catch (error) {
      markSaveFailed();
      toast.error("Couldn't save pitch profile", {
        description: apiErrorMessage(error),
      });
    } finally {
      operationRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Pitches", href: "/pitches" },
          { label: profileData?.Name ?? "Pitch" },
          { label: "Profile" },
        ]}
        showAskMassic={false}
      />
      <div className="flex min-h-0 min-w-0 w-full max-w-[1224px] flex-1 p-5">
        <ProfileLoadingBoundary
          key={businessId}
          loading={
            loading ||
            profileDataFetching ||
            jobQuery.isFetching ||
            locationsFetching ||
            validation.catalogLoading ||
            !isHydrated
          }
          error={jobQuery.error ?? profileDataError ?? validation.catalogError}
          onRetry={() =>
            Promise.allSettled([
              jobQuery.refetch({ throwOnError: true }),
              refetchProfile({ throwOnError: true }),
              validation.refetchCatalogs(),
            ])
          }
        >
          <ProfileEditorTemplate
            form={form}
            mode="minimal"
            extractionStatus={jobQuery.data?.offering_extraction}
            leftTitle="Pitch profile"
            onSaveChanges={() => void save()}
            onAnalyzeBusiness={() => undefined}
            showDefaultActions={false}
            isWorkflowProcessing={locked}
            initialFieldsLocked={Boolean(jobQuery.data?.job_id)}
            submissionIssues={validation.displayIssues(issues)}
            showPrimaryCategoryRepair={validation.repairPrimaryCategory}
            validationFocusRequest={focusRequest}
            notice={
              <>
                {processing ? (
                  <div
                    role="status"
                    className="flex items-center gap-3 border-b px-4 py-3 text-sm"
                  >
                    <Loader2 className="size-5 animate-spin" />
                    Processing your pitch profile. Editing will be available
                    when it finishes.
                  </div>
                ) : null}
                {(jobQuery.error ?? profileDataError) ? (
                  <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-sm text-destructive"
                  >
                    <p>{apiErrorMessage(jobQuery.error ?? profileDataError)}</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        void jobQuery.refetch();
                        void refetchProfile();
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                ) : null}
              </>
            }
            customHeaderActions={
              <>
                <Button
                  disabled={
                    locked || (Boolean(jobQuery.data?.job_id) && !isDirty)
                  }
                  onClick={() => void save()}
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  variant="outline"
                  disabled={locked}
                  onClick={() => {
                    if (!guardConvert()) return;
                    if (isDirty) {
                      toast.error(
                        "Save your changes before converting the pitch.",
                      );
                      return;
                    }
                    if (!jobQuery.data?.job_id) {
                      toast.error(
                        "Save the pitch profile before converting it.",
                      );
                      return;
                    }
                    setConverting(true);
                  }}
                >
                  Convert to business
                </Button>
              </>
            }
          />
        </ProfileLoadingBoundary>
      </div>
      <AlertDialog open={converting} onOpenChange={setConverting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to business?</AlertDialogTitle>
            <AlertDialogDescription>
              This pitch will move to Businesses. Its profile and reports will
              be retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={convert.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                disabled={locked}
                onClick={async () => {
                  if (!guardConvert() || locked || operationRef.current) return;
                  operationRef.current = true;
                  try {
                    await convert.mutateAsync({ businessId });
                    allowNavigation(() =>
                      router.push(`/business/${businessId}/profile`),
                    );
                  } catch {
                    /* Mutation owns the error toast. */
                  } finally {
                    operationRef.current = false;
                  }
                }}
              >
                Convert
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
