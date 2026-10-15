"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  FileText,
  Loader2,
  RefreshCw,
  Settings,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/molecules/PageHeader";
import { ProfileEditorTemplate } from "./ProfileEditorTemplate";
import {
  ProfileAgentButton,
  ProfileAgentDialog,
  useProfileAgent,
} from "@/components/massic-agent/profile-agent";
import { PlanModal } from "@/components/molecules/settings/PlanModal";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { ProfileActionConfirmDialog } from "@/components/organisms/profile/ProfileActionConfirmDialog";
import { useProfileFormSync } from "@/hooks/use-profile-form-sync";
import { useProfileValidation } from "@/hooks/use-profile-validation";
import { ProfileLoadingBoundary } from "@/components/organisms/profile/ProfileLoadingBoundary";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import { useToggleBusinessStatus } from "@/hooks/use-linked-businesses";
import { useSubscription } from "@/hooks/use-subscription";
import {
  useProfileAnalysis,
  type ProfileAnalysisAction,
} from "@/hooks/use-profile-analysis";
import { isOrchestrationActive, isWorkflowActive } from "@/lib/workflow-status";
import {
  hasActiveCoreOrGrowthPlan,
  hasBusinessPlanAccess,
  hasWhitelistAccess,
  resolveBusinessSubscription,
} from "@/lib/subscription-status";
import { apiErrorMessage } from "@/lib/api-error";
import {
  businessInfoSchema,
  type BusinessInfoFormData,
} from "@/schemas/ProfileFormSchema";
import { useBusinessStore, type BusinessProfile } from "@/store/business-store";
import {
  buildBusinessProfilePayload,
  mapProfileDataToFormValues,
} from "@/utils/profile-form-mappers";
import {
  mergeJobAndNodeFormValues,
  mapJobToReadOnlyDetails,
} from "@/utils/profile-v2-mappers";
import {
  validateProfileForm,
  validateStrategyProfileFields,
  type ProfileValidationIssue,
} from "@/utils/profile-form-fields";
import type { JobResponse } from "@/types/profile-v2";

interface ProfileTemplateProps {
  businessId: string;
  profileData?: BusinessProfile | null;
  jobDetails?: JobResponse | null;
  isLoading?: boolean;
  initialReadLoading?: boolean;
  readError?: unknown;
  onRetryLoad?: () => void | Promise<unknown>;
  onUpdateProfile?: (
    payload: any,
    values?: any,
    mode?: "minimal" | "full",
  ) => Promise<{ jobExistsAfterSave?: boolean } | void>;
  onAgentProfileRefresh?: (signal: AbortSignal) => Promise<void>;
}

const ACTIONS: Record<
  ProfileAnalysisAction,
  { title: string; description: string }
> = {
  analyze: {
    title: "Analyze business",
    description:
      "Analyze the business profile and search data to build its growth strategy.",
  },
  search: {
    title: "Rerun search data",
    description: "Refresh search data and regenerate the business strategy.",
  },
  context: {
    title: "Update business context",
    description: "Rebuild the business profile using its saved details.",
  },
};

export default function ProfileTemplate({
  businessId,
  profileData,
  jobDetails,
  isLoading = false,
  initialReadLoading = isLoading,
  readError,
  onRetryLoad,
  onUpdateProfile,
  onAgentProfileRefresh,
}: ProfileTemplateProps) {
  const router = useRouter();
  const profiles = useBusinessStore((state) => state.profiles);
  const locationOptions = useBusinessStore(
    (state) => state.profileForm.locationOptions,
  );
  const locationsLoading = useBusinessStore(
    (state) => state.profileForm.locationsLoading,
  );
  const business =
    profileData ?? profiles.find((profile) => profile.UniqueId === businessId);
  const businessSubscription =
    business?.SubscriptionItems ??
    profiles.find((profile) => profile.UniqueId === businessId)
      ?.SubscriptionItems;
  const isBusinessWhitelisted =
    hasWhitelistAccess(business, businessSubscription) ||
    profiles.some((profile) => profile.isWhitelisted === true);
  const subscription = useSubscription({
    businessId,
    isWhitelisted: isBusinessWhitelisted,
    throwOnReadError: true,
  });
  const isWhitelisted =
    isBusinessWhitelisted || hasWhitelistAccess(subscription.data);
  const analysis = useProfileAnalysis(businessId);
  const unlink = useToggleBusinessStatus();
  const guardSave = useFeatureActionGuard("profile.save");
  const guardAnalyze = useFeatureActionGuard("actions.acceptPlan");
  const guardUnlink = useFeatureActionGuard("business.unlink");
  const [saving, setSaving] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [unlinkConfirm, setUnlinkConfirm] = useState(false);
  const [confirmAction, setConfirmAction] =
    useState<ProfileAnalysisAction | null>(null);
  const [issues, setIssues] = useState<ProfileValidationIssue[]>([]);
  const [validationMode, setValidationMode] = useState<
    "save" | "analysis" | null
  >(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const operationRef = useRef(false);
  const currentSubscription = resolveBusinessSubscription(
    subscription.data,
    businessSubscription,
  );
  const hasPlanAccess = hasActiveCoreOrGrowthPlan(
    currentSubscription
      ? {
          ...currentSubscription,
          plan_type:
            currentSubscription.plan_type ??
            currentSubscription.planType ??
            currentSubscription.plan,
        }
      : null,
    isWhitelisted,
  );
  const mode = hasPlanAccess ? "full" : "minimal";
  const serverValues = useMemo(() => {
    const node = mapProfileDataToFormValues(
      profileData ?? null,
      null,
      locationOptions,
    );
    return jobDetails?.job_id
      ? mergeJobAndNodeFormValues(jobDetails, node)
      : node;
  }, [profileData, jobDetails, locationOptions]);
  const initialValues = useRef(serverValues);
  const form = useForm({
    defaultValues: initialValues.current,
    validators: { onBlur: businessInfoSchema as any },
  });
  const values = useStore(form.store, (state) => state.values);
  const validation = useProfileValidation(
    values,
    serverValues.primaryCategory,
    mode,
  );
  const { isDirty, isHydrated, markSaved, markSaveFailed } = useProfileFormSync(
    {
      form,
      serverValues,
      loading: isLoading || locationsLoading,
      saving,
    },
  );
  const { allowNavigation } = useUnsavedChangesGuard({ isDirty });
  const serverProcessing =
    jobDetails?.profile_status === "processing" ||
    isOrchestrationActive(jobDetails);
  const profileAgent = useProfileAgent({
    businessId,
    job: jobDetails,
    dirty: isDirty,
    saving: isLoading || saving || analysis.isPending || checkingPlan,
    onRefresh: onAgentProfileRefresh,
  });
  const locked =
    Boolean(readError) ||
    serverProcessing ||
    analysis.isPending ||
    saving ||
    checkingPlan ||
    unlink.isPending ||
    profileAgent.busy ||
    isLoading;

  useEffect(() => {
    if (!validationMode) return;
    const next =
      validationMode === "analysis"
        ? validateStrategyProfileFields(values, validation.options)
        : validateProfileForm(values, validation.options);
    setIssues(next);
    if (!next.length) setValidationMode(null);
  }, [
    values,
    validationMode,
    mode,
    validation.options.industries,
    validation.repairPrimaryCategory,
  ]);

  const showIssues = (
    next: ProfileValidationIssue[],
    kind: "save" | "analysis",
  ) => {
    setIssues(next);
    setValidationMode(kind);
    if (next.length) {
      setFocusRequest((request) => request + 1);
      toast.error(next[0].message);
    }
    return next.length > 0;
  };

  const save = async () => {
    if (!guardSave() || locked || operationRef.current || !onUpdateProfile)
      return;
    const submitted = form.state.values;
    operationRef.current = true;
    setSaving(true);
    try {
      if (showIssues(await validation.validate(submitted, "save"), "save"))
        return;
      const payload = buildBusinessProfilePayload(submitted, {
        existingProfile: profileData,
        locationOptions,
        normalizeWebsite: true,
        preserveExistingProfile: true,
      });
      await onUpdateProfile(payload, submitted, mode);
      markSaved(submitted);
      setIssues([]);
      setValidationMode(null);
      toast.success("Business profile saved");
    } catch (error) {
      markSaveFailed();
      toast.error("Couldn't save business profile", {
        description: apiErrorMessage(error),
      });
    } finally {
      operationRef.current = false;
      setSaving(false);
    }
  };

  const maintenanceReady = (action: ProfileAnalysisAction) =>
    action === "search"
      ? jobDetails?.orchestration_status === "completed"
      : action === "context"
        ? jobDetails?.has_build_completed === true
        : true;
  const maintenanceBlocked = (action: ProfileAnalysisAction) =>
    !maintenanceReady(action) || isWorkflowActive(jobDetails);

  const checkAnalysisPrerequisites = async (action: ProfileAnalysisAction) => {
    if (!isWhitelisted) {
      // Only a resolved ineligible subscription can open billing immediately.
      // A missing/failed read must be checked rather than treated as no plan.
      if (!hasPlanAccess && subscription.data !== undefined) {
        setPlanOpen(true);
        return false;
      }
      try {
        const latest = await subscription.refetchData();
        if (
          !hasActiveCoreOrGrowthPlan(
            resolveBusinessSubscription(latest, businessSubscription),
          )
        ) {
          setPlanOpen(true);
          return false;
        }
      } catch (error) {
        toast.error("Couldn't check the business plan", {
          description: apiErrorMessage(error),
        });
        return false;
      }
    }
    if (!maintenanceReady(action)) {
      toast.error(
        action === "search"
          ? "Analyze the business before rerunning search data."
          : "Complete a profile build before updating business context.",
      );
      return false;
    }
    if (isDirty) {
      toast.error("Save your changes before analyzing the business.");
      return false;
    }
    if (!jobDetails?.job_id) {
      toast.error("Save the business profile before analyzing the business.");
      return false;
    }
    try {
      if (
        showIssues(
          await validation.validate(form.state.values, "analysis"),
          "analysis",
        )
      )
        return false;
      return true;
    } catch (error) {
      toast.error("Couldn't validate the business profile", {
        description: apiErrorMessage(error),
      });
      return false;
    }
  };

  const requestAnalysis = async (action: ProfileAnalysisAction) => {
    if (
      !guardAnalyze() ||
      locked ||
      maintenanceBlocked(action) ||
      operationRef.current
    )
      return;
    operationRef.current = true;
    setCheckingPlan(true);
    try {
      if (await checkAnalysisPrerequisites(action)) setConfirmAction(action);
    } finally {
      operationRef.current = false;
      setCheckingPlan(false);
    }
  };

  const run = async () => {
    if (
      !confirmAction ||
      locked ||
      maintenanceBlocked(confirmAction) ||
      operationRef.current ||
      !guardAnalyze()
    )
      return;
    const action = confirmAction;
    setConfirmAction(null);
    operationRef.current = true;
    try {
      // Settings actions must show confirmation before their billing/API reads.
      // The header's Analyze action has already checked these prerequisites.
      if (action !== "analyze") {
        setCheckingPlan(true);
        if (!(await checkAnalysisPrerequisites(action))) return;
        setCheckingPlan(false);
      }
      await analysis.mutateAsync(action);
      toast.success(
        action === "context"
          ? "Business context update started"
          : "Business analysis started",
      );
    } catch (error) {
      toast.error(`Couldn't start ${ACTIONS[action].title.toLowerCase()}`, {
        description: apiErrorMessage(error),
      });
    } finally {
      operationRef.current = false;
      setCheckingPlan(false);
    }
  };

  const confirmUnlink = async () => {
    if (!guardUnlink() || locked || !business?.Id || operationRef.current)
      return;
    operationRef.current = true;
    try {
      await unlink.mutateAsync({
        business: {
          siteUrl: business.Website ?? "",
          displayName: business.Name ?? "Business",
          authId: business.LinkedAuthId ?? "",
          businessProfile: {
            Id: business.Id,
            UniqueId: business.UniqueId,
            IsActive: business.IsActive !== false,
          },
        },
      });
      setUnlinkConfirm(false);
      allowNavigation(() => router.push("/"));
    } catch {
      /* The mutation owns its readable error toast. */
    } finally {
      operationRef.current = false;
    }
  };

  const planType = String(
    currentSubscription?.plan_type ??
      currentSubscription?.planType ??
      currentSubscription?.plan ??
      "",
  )
    .trim()
    .toLowerCase();
  const currentPlan = !hasBusinessPlanAccess({
    status: currentSubscription?.status,
    plan_type: planType,
  })
    ? "No Plan"
    : planType === "core"
      ? "Core"
      : planType === "growth"
        ? "Growth"
        : planType === "starter"
          ? "Starter"
          : "No Plan";
  const hasFailure =
    jobDetails?.orchestration_status === "error" ||
    jobDetails?.profile_status === "error" ||
    jobDetails?.profile_status === "abandoned";
  const notice =
    serverProcessing || analysis.isPending ? (
      <div
        role="status"
        aria-live="polite"
        className="flex shrink-0 items-center gap-3 border-b bg-general-primary-foreground px-4 py-3 sm:px-6"
      >
        <Loader2 className="size-5 shrink-0 animate-spin text-general-primary" />
        <div>
          <p className="text-sm font-medium">
            {jobDetails?.orchestration_status === "strategies_running"
              ? "Building your growth strategy"
              : "Analyzing your business profile"}
          </p>
          <p className="mt-1 text-xs text-general-muted-foreground">
            Editing is paused until processing finishes. You can leave this page
            and return later.
          </p>
        </div>
      </div>
    ) : hasFailure ? (
      <div
        role="alert"
        className="flex shrink-0 items-center gap-3 border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
      >
        <CircleAlert className="size-5 shrink-0" />
        <p>
          Business analysis did not complete. Review the saved details and try
          again.
        </p>
      </div>
    ) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: business?.Name ?? "Business" },
          { label: "Profile" },
        ]}
        showAskMassic={Boolean(jobDetails?.job_id)}
      />
      <div className="flex min-h-0 min-w-0 w-full max-w-[1224px] flex-1 p-5">
        <ProfileLoadingBoundary
          key={businessId}
          loading={
            isLoading ||
            initialReadLoading ||
            (!isWhitelisted &&
              (subscription.loading || !subscription.isFetched)) ||
            validation.catalogLoading ||
            !isHydrated
          }
          error={
            readError ??
            (isWhitelisted ? null : subscription.error) ??
            validation.catalogError
          }
          onRetry={() =>
            Promise.allSettled([
              onRetryLoad?.(),
              subscription.refetchData(),
              validation.refetchCatalogs(),
            ])
          }
        >
          <ProfileEditorTemplate
            form={form}
            mode={mode}
            readOnlyDetails={mapJobToReadOnlyDetails(jobDetails)}
            extractionStatus={jobDetails?.offering_extraction}
            submissionIssues={validation.displayIssues(issues)}
            showPrimaryCategoryRepair={validation.repairPrimaryCategory}
            validationFocusRequest={focusRequest}
            notice={
              <>
                {notice}
                {readError ? (
                  <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/30 px-4 py-3 text-sm text-destructive"
                  >
                    <p>
                      {apiErrorMessage(
                        readError,
                        "Couldn't load the business profile.",
                      )}
                    </p>
                    <Button variant="outline" size="sm" onClick={onRetryLoad}>
                      Retry
                    </Button>
                  </div>
                ) : null}
              </>
            }
            onSaveChanges={() => setSaveConfirm(true)}
            onAnalyzeBusiness={() => void requestAnalysis("analyze")}
            saveDisabled={locked || (Boolean(jobDetails?.job_id) && !isDirty)}
            savePending={saving}
            saveDisabledReason={
              locked
                ? "Wait for the current business operation to finish."
                : !isDirty && jobDetails?.job_id
                  ? "No unsaved changes."
                  : undefined
            }
            analyzeDisabled={locked || maintenanceBlocked("analyze")}
            analyzePending={checkingPlan || analysis.isPending}
            analyzeDisabledReason={
              isWorkflowActive(jobDetails) ||
              jobDetails?.orchestration_status === "strategies_running"
                ? "Building your growth strategy. Please wait until it completes."
                : locked
                  ? "Wait for the current business operation to finish."
                  : undefined
            }
            isWorkflowProcessing={locked}
            busyReason="Wait for the current business operation to finish."
            initialFieldsLocked={Boolean(jobDetails?.job_id)}
            customHeaderActions={
              jobDetails?.job_id &&
              onAgentProfileRefresh && (
                <ProfileAgentButton agent={profileAgent} />
              )
            }
            trailingHeaderActions={
              <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Profile settings"
                    title="Profile settings"
                  >
                    <Settings className="size-4" aria-hidden="true" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-64 max-w-[calc(100vw-2rem)] space-y-1 p-2"
                  aria-label="Profile settings"
                >
                  {(
                    [
                      { action: "search", Icon: RefreshCw },
                      { action: "context", Icon: FileText },
                    ] as const
                  ).map(({ action, Icon }) => (
                    <Button
                      key={action}
                      type="button"
                      variant="ghost"
                      disabled={locked || maintenanceBlocked(action)}
                      title={
                        isWorkflowActive(jobDetails)
                          ? "Building your growth strategy. Please wait until it completes."
                          : maintenanceBlocked(action)
                            ? action === "search"
                              ? "Available after business analysis completes."
                              : "Available after a profile build completes."
                            : undefined
                      }
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        if (
                          locked ||
                          maintenanceBlocked(action) ||
                          operationRef.current ||
                          !guardAnalyze()
                        )
                          return;
                        setSettingsOpen(false);
                        setConfirmAction(action);
                      }}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {ACTIONS[action].title}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={
                      locked || !business?.Id || business.IsActive === false
                    }
                    className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      if (guardUnlink()) {
                        setSettingsOpen(false);
                        setUnlinkConfirm(true);
                      }
                    }}
                  >
                    <Unlink className="size-4" aria-hidden="true" />
                    Unlink business
                  </Button>
                </PopoverContent>
              </Popover>
            }
            className="flex-1"
          />
        </ProfileLoadingBoundary>
      </div>
      <ProfileAgentDialog businessId={businessId} agent={profileAgent} />
      <ProfileActionConfirmDialog
        action={saveConfirm ? "save" : null}
        onCancel={() => setSaveConfirm(false)}
        onConfirm={() => {
          setSaveConfirm(false);
          void save();
        }}
      />
      <PlanModal
        open={planOpen && !isWhitelisted}
        onClose={() => setPlanOpen(false)}
        currentPlan={currentPlan}
        showFooterButtons
        showAlertBar
        alertSeverity="error"
        alertMessage="Choose a Core or Growth plan to analyze this business."
        isDescription={false}
        loading={subscription.loading}
        onSelectPlan={async (planName, action) => {
          if (business)
            await subscription.handleSubscribeToPlan({
              business,
              planName,
              action,
              closeAllModals: () => setPlanOpen(false),
            });
        }}
      />
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction
                ? ACTIONS[confirmAction].title
                : "Analyze business"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction ? ACTIONS[confirmAction].description : ""} Editing
              will be paused while processing runs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                disabled={
                  locked ||
                  (confirmAction !== null && maintenanceBlocked(confirmAction))
                }
                onClick={() => void run()}
              >
                {confirmAction
                  ? ACTIONS[confirmAction].title
                  : "Analyze business"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={unlinkConfirm} onOpenChange={setUnlinkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink business?</AlertDialogTitle>
            <AlertDialogDescription>
              This deactivates the business and cancels its associated
              subscription. Linked accounts will no longer be available through
              this business.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlink.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                disabled={locked}
                onClick={() => void confirmUnlink()}
              >
                Unlink business
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
