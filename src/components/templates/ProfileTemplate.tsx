"use client";

import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../molecules/PageHeader";
import { useBusinessStore } from "@/store/business-store";
import { useForm, useStore } from "@tanstack/react-form";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderOverlay } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { isOrchestrationActive } from "@/lib/workflow-status";
import { isValidWebsiteUrl } from "@/utils/utils";
import {
  buildBusinessProfilePayload,
  mapProfileDataToFormValues as mapBusinessProfileToFormValues,
} from "@/utils/profile-form-mappers";
import { Button } from "@/components/ui/button";
import { CircleAlert, Loader2 } from "lucide-react";
import { ProfileAgentButton, ProfileAgentDialog, useProfileAgent } from "@/components/massic-agent/profile-agent";
import { PlanModal } from "@/components/molecules/settings/PlanModal";
import { ProfileEditorTemplate } from "@/components/templates/ProfileEditorTemplate";
import { useSubscription } from "@/hooks/use-subscription";
import {
  ProfileActionConfirmDialog,
  type ProfileConfirmAction,
} from "@/components/organisms/profile/ProfileActionConfirmDialog";
import { useToggleBusinessStatus } from "@/hooks/use-linked-businesses";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useEntitlements } from "@/hooks/use-entitlements";
import { stableStringify } from "@/utils/stable-stringify";
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
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import { BusinessProfile } from "@/store/business-store";
import {
  mergeJobAndNodeFormValues,
  mapJobToReadOnlyDetails,
} from "@/utils/profile-v2-mappers";
import type { JobResponse } from "@/types/profile-v2";
import { assertProfileStrategyReady } from "@/utils/profile-strategy-gate";
import {
  type ProfileValidationIssue,
  validateProfileForm,
  validateStrategyProfileFields,
} from "@/utils/profile-form-fields";

interface ProfileTemplateProps {
  businessId: string;
  profileData?: BusinessProfile | null;
  jobDetails?: JobResponse | null;
  isLoading?: boolean;
  onUpdateProfile?: (
    payload: any,
    formValues?: any
  ) => Promise<{ jobExistsAfterSave?: boolean } | void>;
  onAgentProfileRefresh?: (signal: AbortSignal) => Promise<void>;
}

// Form schema and types are imported from @/schemas/ProfileFormSchema

const ProfileTemplate = ({
  businessId,
  profileData: externalProfileData,
  jobDetails: externalJobDetails,
  isLoading: externalLoading = false,
  onUpdateProfile,
  onAgentProfileRefresh,
}: ProfileTemplateProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profiles = useBusinessStore((state) => state.profiles);
  const locationOptions = useBusinessStore((state) => state.profileForm.locationOptions);
  const locationsLoading = useBusinessStore((state) => state.profileForm.locationsLoading);
  const currentProfile = profiles.find((p) => p.UniqueId === businessId);
  const [isStrategyConfirmOpen, setIsStrategyConfirmOpen] = useState(false);
  const [isMissingFieldsOpen, setIsMissingFieldsOpen] = useState(false);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<ProfileConfirmAction | null>(null);
  const [isUnlinkBusinessConfirmOpen, setIsUnlinkBusinessConfirmOpen] =
    useState(false);
  const toggleBusinessStatusMutation = useToggleBusinessStatus();
  const { canAccessStrategy } = useEntitlements(businessId);

  // Derive whitelist status from profiles (agency-level check)
  const isAgencyWhitelisted = useMemo(() => {
    return profiles.some(profile => profile.isWhitelisted === true);
  }, [profiles]);

  const [isSaving, setIsSaving] = useState(false);
  const [isTriggeringWorkflow, setIsTriggeringWorkflow] = useState(false);
  const [isCheckingPlan, setIsCheckingPlan] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [hasCreatedJobAfterSave, setHasCreatedJobAfterSave] = useState(false);
  const {
    loading: subscriptionLoading,
    data: subscriptionData,
    handleSubscribeToPlan,
    refetchData: refetchSubscriptionData,
  } = useSubscription({ isWhitelisted: isAgencyWhitelisted });
  const [submissionIssues, setSubmissionIssues] = useState<
    ProfileValidationIssue[]
  >([]);
  const [submissionValidationMode, setSubmissionValidationMode] = useState<
    "save" | "strategy" | null
  >(null);
  const [validationFocusRequest, setValidationFocusRequest] = useState(0);
  const hydratedServerRevisionRef = useRef<string | null>(null);
  const isJobCreated = Boolean(externalJobDetails?.job_id) || hasCreatedJobAfterSave;

  const serverValues = useMemo(
    () => {
      const nodeValues = mapBusinessProfileToFormValues(
        externalProfileData || null,
        null,
        locationOptions
      );
      return externalJobDetails?.job_id
        ? mergeJobAndNodeFormValues(externalJobDetails, nodeValues)
        : nodeValues;
    },
    [externalJobDetails, externalProfileData, locationOptions]
  );
  const serverRevision = useMemo(
    () => stableStringify(serverValues),
    [serverValues]
  );

  // Saving never goes through `form.handleSubmit()`. TanStack aborts submission
  // silently while any field still holds a validation error, so a stale error on
  // an unrelated profile field would make Save look dead. `handleSaveChanges`
  // reads `form.state.values` and runs its own explicit checks instead.
  const form = useForm({
    defaultValues: serverValues,
    validators: {
      onBlur: businessInfoSchema as any,
      onSubmit: businessInfoSchema as any,
    },
  });

  const {
    isDirty: hasChanges,
    hasBaseline,
    resetBaseline,
    clearBaseline,
  } = useFormDirtyState({ form });

  const { allowNavigation } = useUnsavedChangesGuard({ isDirty: hasChanges });
  const profileAgent = useProfileAgent({
    businessId, job: externalJobDetails, dirty: hasChanges,
    saving: externalLoading || isSaving,
    onRefresh: onAgentProfileRefresh,
  });

  const saveProfileValues = useCallback(
    async (value: BusinessInfoFormData): Promise<boolean> => {
      if (profileAgent.busy) return false;
      if (!onUpdateProfile) {
        console.warn("onUpdateProfile not provided");
        return false;
      }

      setIsSaving(true);
      try {
        const normalizeUsps = (raw: unknown): string[] => {
          if (!raw) return [];
          if (Array.isArray(raw)) {
            return raw.map((item) => String(item).trim()).filter(Boolean);
          }
          if (typeof raw === "string") {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item).trim()).filter(Boolean);
              }
            } catch {
              // ignore
            }
            return raw
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
          }
          return [];
        };

        const jobUsps = normalizeUsps(
          (externalJobDetails as any)?.usps ?? (externalJobDetails as any)?.USPs
        );
        const formUsps = value.usps && value.usps.trim()
          ? value.usps
            .split(",")
            ?.map((item: string) => item.trim())
            ?.filter((item: string) => item.length > 0)
          : [];
        const jobExists = Boolean(externalJobDetails && externalJobDetails.job_id);
        const uspsPayload = jobExists
          ? Array.from(
            new Set([
              ...jobUsps,
              ...formUsps,
            ])
          )
          : formUsps;

        const payload = {
          ...buildBusinessProfilePayload(value, {
            existingProfile: externalProfileData,
            locationOptions: useBusinessStore.getState().profileForm.locationOptions,
            normalizeWebsite: true,
            businessObjectiveBothValue: "hybrid",
            preserveExistingProfile: true,
          }),
          USPs: uspsPayload.length > 0 ? uspsPayload : null,
          SellingPoints: uspsPayload.length > 0 ? uspsPayload : null,
          ProfileId:
            externalJobDetails?.profile_id ||
            (externalProfileData as any)?.ProfileId,
        };

        const updateResult = await onUpdateProfile(payload, value);

        if (updateResult?.jobExistsAfterSave) {
          setHasCreatedJobAfterSave(true);
        }

        // The saved values are the new clean state
        resetBaseline();
        return true;
      } catch (error) {
        // Error toast is handled by the mutation
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [
      businessId,
      profileAgent.busy,
      externalJobDetails?.profile_id,
      externalProfileData,
      onUpdateProfile,
      resetBaseline,
      setIsSaving,
    ]
  );

  const guardAcceptPlan = useFeatureActionGuard("actions.acceptPlan");
  const guardSaveProfile = useFeatureActionGuard("profile.save");
  const guardUnlinkBusiness = useFeatureActionGuard("business.unlink");
  const guardSubscribePlan = useFeatureActionGuard("billing.subscribe");
  const guardChangeBillingPlan = useFeatureActionGuard("billing.changePlan");

  useEffect(() => {
    if (isSaving || locationsLoading) return;
    if (!externalProfileData && !externalJobDetails?.job_id) {
      if (hasBaseline()) {
        clearBaseline();
        hydratedServerRevisionRef.current = null;
      }
      return;
    }
    if (hydratedServerRevisionRef.current === serverRevision) return;

    // The first server payload establishes the baseline even if TanStack has
    // already observed its new default values. Later background refetches must
    // never erase edits that have not been saved.
    if (
      hydratedServerRevisionRef.current !== null &&
      hasBaseline() &&
      hasChanges
    ) {
      return;
    }

    form.reset(serverValues);
    resetBaseline(serverValues);
    hydratedServerRevisionRef.current = serverRevision;
  }, [
    clearBaseline,
    externalJobDetails?.job_id,
    externalProfileData,
    form,
    hasBaseline,
    hasChanges,
    isSaving,
    locationsLoading,
    resetBaseline,
    serverRevision,
    serverValues,
  ]);

  useEffect(() => {
    if (externalJobDetails?.job_id) {
      setHasCreatedJobAfterSave(true);
      return;
    }

    setHasCreatedJobAfterSave(false);
  }, [businessId, externalJobDetails?.job_id]);

  const saveRequirementReason = useStore(form.store, (state) => {
    const values = state.values;
    const website = String(values.website ?? "").trim();
    if (!website) return "Add a website before saving.";
    if (!isValidWebsiteUrl(website)) {
      return "Enter a valid website URL before saving.";
    }
    if (!String(values.businessName ?? "").trim()) {
      return "Add a business name before saving.";
    }
    if (!String(values.primaryLocation ?? "").trim()) {
      return "Select a primary location before saving.";
    }
    if (!String(values.serviceAreaType ?? "").trim()) {
      return "Select a service area type before saving.";
    }
    return null;
  });

  const getPlanTypeFromData = useCallback(
    (data: any) => {
      if (data?.status === "canceled") return "no_plan";
      const raw =
        currentProfile?.SubscriptionItems?.plan_type ||
        (externalProfileData as any)?.SubscriptionItems?.plan_type ||
        data?.plan_type ||
        data?.planType ||
        data?.plan;
      if (!raw) return "";
      return String(raw).toLowerCase();
    },
    [currentProfile, externalProfileData]
  );

  // Handle Confirm & Proceed - trigger workflow API and navigate to strategy
  const handleConfirmAndProceed = useCallback(async () => {
    if (!businessId) {
      toast.error("Business ID is required");
      return;
    }

    // Check if job exists (required before triggering workflow)
    if (!externalJobDetails?.job_id) {
      toast.error("Please add offerings to create a job first");
      return;
    }

    try {
      setIsCheckingPlan(true);

      // Check whitelist status first (agency-level)
      if (!isAgencyWhitelisted) {
        // For non-whitelisted users, check subscription and plan level
        const latestSubscription = await refetchSubscriptionData();
        const effectiveSubscription = latestSubscription ?? subscriptionData;
        const isCanceled = effectiveSubscription?.status === "canceled";

        if (isCanceled) {
          setPlanModalOpen(true);
          return;
        }

        const planType = getPlanTypeFromData(effectiveSubscription);
        const planLevels: Record<string, number> = {
          no_plan: 0,
          starter: 1,
          core: 2,
          growth: 3,
        };
        const level = planLevels[planType] ?? 0;
        const hasAboveStarterPlan = level > planLevels.starter;

        if (!hasAboveStarterPlan) {
          setPlanModalOpen(true);
          return;
        }
      }

      assertProfileStrategyReady(externalJobDetails);
      setIsTriggeringWorkflow(true);

      // Call trigger workflow API
      const response = await api.post<{
        success?: boolean;
        [key: string]: any;
      }>("/jobs/run", "python", {
        business_id: businessId,
      });

      // Validate response (matching old repo pattern)
      if (response) {
        toast.success("Workflow triggered successfully!");

        // Invalidate job query cache to ensure fresh workflow status when user returns
        // This is more efficient than always refetching - only refetches when needed
        queryClient.invalidateQueries({
          queryKey: ["jobs", "detail", businessId],
        });

        // Navigate to strategy page after successful API call
        allowNavigation(() => router.push(`/business/${businessId}/strategy`));
      }
    } catch (error: unknown) {
      // Improved error handling with better type safety
      let errorMessage = "Unknown error";

      if (error && typeof error === "object") {
        const axiosError = error as {
          response?: { data?: { detail?: string } };
          message?: string;
        };
        errorMessage =
          axiosError?.response?.data?.detail ||
          axiosError?.message ||
          errorMessage;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      toast.error(`Error triggering workflow: ${errorMessage}`);
    } finally {
      setIsCheckingPlan(false);
      setIsTriggeringWorkflow(false);
    }
  }, [
    allowNavigation,
    businessId,
    externalJobDetails,
    router,
    refetchSubscriptionData,
    subscriptionData,
    getPlanTypeFromData,
  ]);

  const businessName = useMemo(() => {
    const profile = profiles.find((p) => p.UniqueId === businessId);
    return profile?.Name || profile?.DisplayName || "Business";
  }, [profiles, businessId]);

  const isTrialActive =
    ((externalProfileData as any)?.isTrialActive ??
      (currentProfile as any)?.isTrialActive) === true;

  const remainingTrialDays =
    typeof (externalProfileData as any)?.remainingTrialDays === "number"
      ? (externalProfileData as any).remainingTrialDays
      : typeof (currentProfile as any)?.remainingTrialDays === "number"
        ? (currentProfile as any).remainingTrialDays
        : undefined;

  const getCurrentPlanLabel = useCallback((planType?: string | null) => {
    if (!planType) return "No Plan";
    if (planType.toLowerCase() === "no_plan") return "No Plan";
    return planType.charAt(0).toUpperCase() + planType.slice(1).toLowerCase();
  }, []);

  const getPlanAlertMessage = useCallback(
    (currentPlan: string) => {
      if (isTrialActive) {
        const trialDaysMessage =
          typeof remainingTrialDays === "number" && remainingTrialDays > 0
            ? ` Your trial expires in ${remainingTrialDays} day${remainingTrialDays === 1 ? "" : "s"}.`
            : "";
        return `You're on a free trial. Upgrade to access this feature.${trialDaysMessage}`;
      }

      if (currentPlan === "No Plan") {
        return "Upgrade to Core to access this feature.";
      }

      return `You're on ${currentPlan}. Upgrade to Core to access this feature.`;
    },
    [isTrialActive, remainingTrialDays]
  );

  // Memoize breadcrumbs to prevent re-renders
  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Profile", href: `/business/${businessId}/profile` },
    ],
    [businessName, businessId]
  );

  const orchestrationStatus = externalJobDetails?.orchestration_status;
  const isOrchestrationProcessing = useMemo(() => {
    return isOrchestrationActive(externalJobDetails);
  }, [externalJobDetails]);
  const isProfileProcessing =
    externalJobDetails?.profile_status === "processing";
  const hasProfileError = externalJobDetails?.profile_status === "error";

  const isSaveChangesAction = !isJobCreated || hasChanges;
  const editorMode = canAccessStrategy ? "full" : "minimal";
  const visibleSections = useMemo(
    () =>
      editorMode === "minimal"
        ? (["identity", "offerings", "competitors"] as const)
        : undefined,
    [editorMode]
  );

  // Check if CTAs have validation errors
  const hasCtaValidationErrors = useStore(form.store, (state: any) => {
    const ctasMeta = state.fieldMeta?.ctas;
    return ctasMeta?.hasValidationErrors === true;
  });

  // Check if offerings have validation errors
  const hasOfferingsValidationErrors = useStore(form.store, (state: any) => {
    const offeringsMeta = state.fieldMeta?.offeringsList;
    return offeringsMeta?.hasValidationErrors === true;
  });
  const currentFormValues = useStore(
    form.store,
    (state: any) => state.values as BusinessInfoFormData
  );

  useEffect(() => {
    if (!submissionValidationMode) return;

    const issues =
      submissionValidationMode === "strategy"
        ? validateStrategyProfileFields(currentFormValues)
        : validateProfileForm(currentFormValues, {
            offerings: hasOfferingsValidationErrors,
            ctas: hasCtaValidationErrors,
            sectionMode: editorMode,
            visibleSections: visibleSections
              ? [...visibleSections]
              : undefined,
          });

    setSubmissionIssues(issues);
    if (issues.length === 0) {
      setSubmissionValidationMode(null);
    }
  }, [
    currentFormValues,
    editorMode,
    hasCtaValidationErrors,
    hasOfferingsValidationErrors,
    submissionValidationMode,
    visibleSections,
  ]);

  // Only the fields the profile/job calls actually require. Unrelated schema
  // noise must never block a save, and every block must name its own cause.
  const getSaveBlockReason = useCallback(
    (values: BusinessInfoFormData): string | null => {
      if (externalLoading) return "Wait for the profile to finish loading before saving.";
      if (isOrchestrationProcessing) return "Strategy generation is running. Wait for it to finish before saving.";
      if (isProfileProcessing) return "Profile processing is in progress. Wait for it to finish before saving.";
      const [firstIssue] = validateProfileForm(values, {
        offerings: hasOfferingsValidationErrors,
        ctas: hasCtaValidationErrors,
        sectionMode: editorMode,
        visibleSections: visibleSections
          ? [...visibleSections]
          : undefined,
      });
      return firstIssue?.message ?? null;
    },
    [
      externalLoading,
      hasCtaValidationErrors,
      hasOfferingsValidationErrors,
      isOrchestrationProcessing,
      isProfileProcessing,
      editorMode,
      visibleSections,
    ]
  );

  const handleSaveChanges = useCallback(async (): Promise<boolean> => {
    if (!guardSaveProfile()) return false;
    if (isSaving) return false;

    const currentValues = form.state.values as BusinessInfoFormData;
    form.validate("submit");
    const issues = validateProfileForm(currentValues, {
      offerings: hasOfferingsValidationErrors,
      ctas: hasCtaValidationErrors,
      sectionMode: editorMode,
      visibleSections: visibleSections
        ? [...visibleSections]
        : undefined,
    });
    setSubmissionValidationMode("save");
    setSubmissionIssues(issues);
    if (issues.length > 0) {
      setValidationFocusRequest((request) => request + 1);
    }
    const blockReason = getSaveBlockReason(currentValues);
    if (blockReason) {
      toast.error(blockReason);
      return false;
    }

    const saved = await saveProfileValues(currentValues);
    if (saved) {
      setSubmissionIssues([]);
      setSubmissionValidationMode(null);
    }
    return saved;
  }, [
    form,
    getSaveBlockReason,
    guardSaveProfile,
    hasCtaValidationErrors,
    hasOfferingsValidationErrors,
    isSaving,
    saveProfileValues,
    editorMode,
    visibleSections,
  ]);

  const handleSaveAndUpdateStrategy = useCallback(async () => {
    if (!guardAcceptPlan()) return;
    if (!canAccessStrategy) {
      setPlanModalOpen(true);
      return;
    }

    const currentValues = form.state.values as BusinessInfoFormData;
    const issues = validateStrategyProfileFields(currentValues);
    setSubmissionValidationMode(issues.length > 0 ? "strategy" : null);
    setSubmissionIssues(issues);
    if (issues.length > 0) {
      setValidationFocusRequest((request) => request + 1);
      setIsMissingFieldsOpen(true);
      return;
    }

    if (isSaveChangesAction) {
      const saved = await handleSaveChanges();
      if (!saved) return;
    }
    if (!externalJobDetails?.job_id) {
      toast.error("Save the business profile before updating Strategy.");
      return;
    }
    setIsStrategyConfirmOpen(true);
  }, [
    canAccessStrategy,
    externalJobDetails?.job_id,
    form,
    guardAcceptPlan,
    handleSaveChanges,
    isSaveChangesAction,
  ]);

  // "Save & Update Strategy" saves first, and that save now reports its own block
  // reason, so field validity must not disable this button — otherwise the user
  // gets a dead control with nothing telling them which field is at fault.
  const isProceedDisabled =
    externalLoading ||
    isSaving ||
    isCheckingPlan ||
    isTriggeringWorkflow ||
    isOrchestrationProcessing ||
    isProfileProcessing ||
    hasProfileError;

  // Hint only. The button stays clickable and `handleSaveChanges` toasts the same
  // reason, so the user is never left with a dead control and no explanation.
  const saveDisabledReason = useMemo(() => {
    if (isSaving) return "Saving in progress.";
    if (isJobCreated && !hasChanges) return "No unsaved changes.";
    if (externalLoading) return "Wait for the profile to finish loading before saving.";
    if (isOrchestrationProcessing) return "Strategy generation is running. Wait for it to finish.";
    if (isProfileProcessing) return "Profile processing is in progress.";
    if (hasOfferingsValidationErrors) {
      return "Fix the highlighted errors in Offerings before saving.";
    }
    if (hasCtaValidationErrors) {
      return "Fix the highlighted errors in CTAs before saving.";
    }
    return saveRequirementReason ?? undefined;
  }, [
    externalLoading,
    hasCtaValidationErrors,
    hasOfferingsValidationErrors,
    isProfileProcessing,
    isJobCreated,
    hasChanges,
    isSaving,
    isOrchestrationProcessing,
    saveRequirementReason,
  ]);

  // Determine loading state and message
  const isLoading =
    externalLoading || isSaving || isTriggeringWorkflow;
  const loadingMessage = useMemo(() => {
    if (isTriggeringWorkflow) return "Triggering workflow...";
    if (isSaving) return "Saving changes...";
    if (externalLoading) return "Loading profile data...";
    return undefined;
  }, [isTriggeringWorkflow, isSaving, externalLoading]);

  const currentPlanLabel = useMemo(() => {
    const planType = getPlanTypeFromData(subscriptionData);
    return getCurrentPlanLabel(planType);
  }, [getPlanTypeFromData, getCurrentPlanLabel, subscriptionData]);

  const planAlertMessage = useMemo(
    () => getPlanAlertMessage(currentPlanLabel),
    [getPlanAlertMessage, currentPlanLabel]
  );

  const handlePlanSelect = useCallback(
    async (planName: string, action: "UPGRADE" | "DOWNGRADE" | "SUBSCRIBE") => {
      if (action === "SUBSCRIBE") {
        if (!guardSubscribePlan()) return;
      } else if (!guardChangeBillingPlan()) {
        return;
      }

      const business = currentProfile || externalProfileData;
      if (!business) return;
      await handleSubscribeToPlan({
        business,
        planName,
        action,
        closeAllModals: () => setPlanModalOpen(false),
      });
    },
    [currentProfile, externalProfileData, guardChangeBillingPlan, guardSubscribePlan, handleSubscribeToPlan]
  );

  const businessForUnlink = externalProfileData || currentProfile;
  const canUnlinkBusiness =
    Boolean(businessForUnlink?.Id) && businessForUnlink?.IsActive !== false;

  const handleConfirmUnlinkBusiness = useCallback(async () => {
    if (!guardUnlinkBusiness()) return;

    if (!businessForUnlink?.Id) {
      toast.error("Unable to unlink business", {
        description: "Business details are still loading. Please try again.",
      });
      return;
    }

    await toggleBusinessStatusMutation.mutateAsync({
      business: {
        siteUrl: businessForUnlink.Website || "",
        displayName:
          businessForUnlink.DisplayName || businessForUnlink.Name || "Business",
        authId: businessForUnlink.LinkedAuthId || "",
        businessProfile: {
          Id: businessForUnlink.Id,
          UniqueId: businessForUnlink.UniqueId || businessId,
          IsActive: businessForUnlink.IsActive !== false,
        },
      },
    });
    setIsUnlinkBusinessConfirmOpen(false);
    queryClient.invalidateQueries({
      queryKey: ["businessProfiles", "detail", businessId],
    });
    allowNavigation(() => router.push("/"));
  }, [
    allowNavigation,
    businessForUnlink,
    businessId,
    guardUnlinkBusiness,
    queryClient,
    router,
    toggleBusinessStatusMutation,
  ]);

  const unlinkBusinessFooter = canUnlinkBusiness ? (
    <div className="flex justify-end">
      <Button
        type="button"
        variant="destructive"
        onClick={() => {
          if (!guardUnlinkBusiness()) return;
          setIsUnlinkBusinessConfirmOpen(true);
        }}
        disabled={externalLoading || toggleBusinessStatusMutation.isPending || isProfileProcessing || profileAgent.busy}
      >
        {toggleBusinessStatusMutation.isPending
          ? "Unlinking..."
          : "Unlink Business"}
      </Button>
    </div>
  ) : null;

  return (
    <div
      className={cn(
        // NOTE: This page is rendered inside `SidebarInset` which already controls
        // viewport height + scrolling. Using `dvh` here can cause layout jumps on
        // first interaction when browsers recalc dynamic viewport units.
        "flex flex-col h-full min-h-0 relative overflow-hidden"
      )}
    >
      <PlanModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        currentPlan={currentPlanLabel}
        showFooterButtons={true}
        showAlertBar={true}
        alertSeverity="error"
        alertMessage={planAlertMessage}
        isDescription={false}
        onSelectPlan={handlePlanSelect}
        loading={subscriptionLoading}
      />
      <LoaderOverlay
        isLoading={isLoading || toggleBusinessStatusMutation.isPending}
        message={
          toggleBusinessStatusMutation.isPending
            ? "Unlinking business..."
            : loadingMessage
        }
      >
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          {/* Sticky Page Header */}
          <div className="sticky top-0 z-10 shrink-0 bg-background">
            <PageHeader breadcrumbs={breadcrumbs} />
          </div>

          {/* Content area: takes remaining height, scroll lives inside form column */}
          <div className="flex-1 flex min-h-0 overflow-hidden min-w-0">
            <div className="w-full max-w-[1224px] flex gap-6 p-5 items-stretch min-h-0 min-w-0 flex-1">
          <div className="flex-1 flex flex-col gap-7 min-h-0 min-w-0 overflow-hidden">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPendingConfirmAction("save");
                }}
                className="flex flex-col gap-0 flex-1 min-h-0 overflow-hidden"
              >
                <ProfileEditorTemplate
                  form={form}
                  mode={editorMode}
                  readOnlyDetails={mapJobToReadOnlyDetails(
                    externalJobDetails
                  )}
                  submissionIssues={submissionIssues}
                  validationFocusRequest={validationFocusRequest}
                  notice={
                    isOrchestrationProcessing ? (
                      <div
                        role="status"
                        aria-live="polite"
                        className="flex shrink-0 items-center gap-3 border-b border-general-border bg-general-primary-foreground px-4 py-3 sm:px-6"
                      >
                        <Loader2
                          className="size-5 shrink-0 animate-spin text-general-primary"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-sm font-medium text-general-foreground">
                            {orchestrationStatus === "deep_running"
                              ? "Analyzing your business profile"
                              : "Building your growth strategy"}
                          </p>
                          <p className="mt-0.5 text-xs text-general-muted-foreground">
                            This comprehensive analysis may take up to an hour.
                            You can leave this page and return later.
                          </p>
                        </div>
                      </div>
                    ) : orchestrationStatus === "error" ? (
                      <div
                        role="alert"
                        className="flex shrink-0 items-center gap-3 border-b border-destructive/30 bg-destructive/5 px-4 py-3 sm:px-6"
                      >
                        <CircleAlert
                          className="size-5 shrink-0 text-destructive"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-sm font-medium text-destructive">
                            Strategy generation stopped
                          </p>
                          <p className="mt-0.5 text-xs text-destructive">
                            Review the profile details and run Strategy again.
                          </p>
                        </div>
                      </div>
                    ) : undefined
                  }
                  customHeaderActions={<>
                    {externalJobDetails?.job_id && onAgentProfileRefresh && <ProfileAgentButton agent={profileAgent} />}
                  </>}
                  onSaveChanges={() => setPendingConfirmAction("save")}
                  onSaveAndUpdateStrategy={() => void handleSaveAndUpdateStrategy()}
                  onUnlinkBusiness={() => {
                    if (!guardUnlinkBusiness()) return;
                    setIsUnlinkBusinessConfirmOpen(true);
                  }}
                  unlinkBusinessDisabled={
                    externalLoading || toggleBusinessStatusMutation.isPending || isProfileProcessing || profileAgent.busy
                  }
                  saveDisabled={
                    isSaving || (isJobCreated && !hasChanges)
                  }
                  savePending={isSaving}
                  saveDisabledReason={profileAgent.busy ? "The profile agent is working. Wait for the profile refresh to finish." : saveDisabledReason}
                  isWorkflowProcessing={
                    isOrchestrationProcessing || isProfileProcessing || profileAgent.busy
                  }
                  busyReason={profileAgent.busy ? "The profile agent is working. Wait for the profile refresh to finish." : isOrchestrationProcessing ? "Your growth strategy is being built." : externalJobDetails?.profile_status === "processing" ? "Your profile is still processing." : undefined}
                  initialFieldsLocked={Boolean(externalJobDetails?.job_id)}
                  profileStatus={externalJobDetails?.profile_status}
                  proceedDisabled={
                    isProceedDisabled ||
                    (!isSaveChangesAction && !externalJobDetails?.job_id)
                  }
                  className="flex-1"
                />
              </form>
          </div>
            </div>
        </div>
        </div>

        <ProfileAgentDialog businessId={businessId} agent={profileAgent} />

        <ProfileActionConfirmDialog
          action={pendingConfirmAction}
          onCancel={() => setPendingConfirmAction(null)}
          onConfirm={(action) => {
            setPendingConfirmAction(null);
            if (action === "save") void handleSaveChanges();
          }}
        />

        <AlertDialog
          open={isMissingFieldsOpen}
          onOpenChange={setIsMissingFieldsOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complete required profile fields</AlertDialogTitle>
              <AlertDialogDescription>
                Add the following details before updating Strategy.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <ul className="list-disc space-y-1 pl-5 text-sm text-general-foreground">
              {submissionIssues.map((issue) => (
                <li key={`${issue.field}-${issue.message}`}>
                  <span className="font-medium">{issue.label}:</span>{" "}
                  {issue.message}
                </li>
              ))}
            </ul>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsMissingFieldsOpen(false)}>
                Review fields
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirm & Proceed to Strategy Modal */}
        <AlertDialog open={isStrategyConfirmOpen} onOpenChange={setIsStrategyConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm & Proceed to Strategy</AlertDialogTitle>
              <AlertDialogDescription>
                This will trigger deep analysis of search data and build strategy for this business. It may take upto an hour.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={
                  isTriggeringWorkflow ||
                  isCheckingPlan
                }
              >
                Do Later
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  onClick={async () => {
                    if (!guardAcceptPlan()) return;
                    setIsStrategyConfirmOpen(false);
                    try {
                      await handleConfirmAndProceed();
                    } catch (e) {
                      toast.error("Something went wrong. Please try again.");
                    }
                  }}
                  disabled={
                    isTriggeringWorkflow ||
                    isCheckingPlan
                  }
                >
                  Confirm
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={isUnlinkBusinessConfirmOpen}
          onOpenChange={setIsUnlinkBusinessConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unlink Business</AlertDialogTitle>
              <AlertDialogDescription>
                Unlinking this business will deactivate it, cancel any associated
                subscription, and remove it from your profile along with all linked
                accounts (GSC, GA4, GBP). This impacts your strategy and execution.
                Only do this if your business goals have significantly changed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={toggleBusinessStatusMutation.isPending}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  onClick={handleConfirmUnlinkBusiness}
                  disabled={toggleBusinessStatusMutation.isPending}
                >
                  {toggleBusinessStatusMutation.isPending
                    ? "Please wait..."
                    : "Unlink"}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </LoaderOverlay>
    </div>
  );
};

export default ProfileTemplate;
