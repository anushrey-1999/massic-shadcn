"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm, useStore } from "@tanstack/react-form";
import { PageHeader } from "@/components/molecules/PageHeader";
import { MobilePreview } from "@/components/molecules/MobilePreview";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GenericInput } from "@/components/ui/generic-input";
import { Typography } from "@/components/ui/typography";
import { LocationSelect } from "@/components/ui/location-select";
import {
  AutomationSequenceTable,
  type SequenceItem,
} from "@/components/ui/automation-sequence-table";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import {
  useCreateReviewCampaign,
  useDefaultCampaignTemplates,
  useReviewCampaignById,
  useReviewLinkByLocation,
  useUpdateReviewCampaign,
} from "@/hooks/use-review-campaigns";
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
import { deriveCampaignNameFromUrl } from "@/utils/campaign-utils";
import { generateId } from "@/lib/id";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    campaignId?: string;
    tab?: string;
    locationId?: string;
  }>;
}

type CampaignFormData = {
  reviewLink: string;
  autoTrigger: "manual" | "default";
};

export default function CreateReviewCampaignPage({
  params,
  searchParams,
}: PageProps) {
  const router = useRouter();
  const { id } = React.use(params);
  const resolvedSearchParams = React.use(searchParams || Promise.resolve({} as Record<string, never>)) as {
    campaignId?: string;
    tab?: string;
    locationId?: string;
  };
  const businessId = id;
  const [campaignId, setCampaignId] = React.useState<string | null>(
    resolvedSearchParams?.campaignId || null
  );
  const [returnTab, setReturnTab] = React.useState<string>(
    resolvedSearchParams?.tab || "campaign"
  );
  const [locationIdFromQuery, setLocationIdFromQuery] = React.useState<string | null>(
    resolvedSearchParams?.locationId || null
  );
  const [timezone, setTimezone] = React.useState<string>("");
  const [selectedSequenceId, setSelectedSequenceId] = React.useState<
    string | null
  >(null);
  const MAX_ACTIVITIES = 6;
  const MAX_SEQUENCE_DAY = 90;

  const isEditMode = !!campaignId;

  const form = useForm({
    defaultValues: {
      reviewLink: "",
      autoTrigger: "manual",
    },
  });
  const reviewLinkValue = useStore(form.store, (state: any) => state.values?.reviewLink || "");
  const hasAttemptedAutoFill = React.useRef(false);

  const getFallbackSequences = React.useCallback((): SequenceItem[] => [
    {
      id: generateId(),
      type: "email",
      name: "Email 1",
      sequenceDay: 1,
      dayUnit: "day later",
      subject: "Thanks for your recent experience with {{Business Name}}",
      content: `Hi {{Customer Name}},

Thanks for choosing {{Business Name}}. We hope you had a great experience with us. If you have a moment, we'd really appreciate your feedback. Your review helps us improve and helps others make confident decisions.

Thank you for your time and support.

— The {{Business Name}} Team`,
      buttonText: "Share Your Feedback",
    },
    {
      id: generateId(),
      type: "sms",
      name: "SMS 1",
      sequenceDay: 2,
      dayUnit: "days later",
      content: "",
    },
    {
      id: generateId(),
      type: "email",
      name: "Email 2",
      sequenceDay: 3,
      dayUnit: "days later",
      subject: "",
      content: "",
      buttonText: "",
    },
    {
      id: generateId(),
      type: "sms",
      name: "SMS 2",
      sequenceDay: 4,
      dayUnit: "days later",
      content: "",
    },
  ], []);

  const [sequences, setSequences] = React.useState<SequenceItem[]>([]);
  const [hasUserEditedSequences, setHasUserEditedSequences] = React.useState(false);
  const [hasInitializedTemplates, setHasInitializedTemplates] = React.useState(false);

  React.useEffect(() => {
    if (!resolvedSearchParams) return;
    setCampaignId(resolvedSearchParams.campaignId || null);
    setReturnTab(resolvedSearchParams.tab || "campaign");
    setLocationIdFromQuery(resolvedSearchParams.locationId || null);
  }, [resolvedSearchParams]);

  const { profileData } = useBusinessProfileById(businessId || null);
  const createCampaignMutation = useCreateReviewCampaign();
  const updateCampaignMutation = useUpdateReviewCampaign();
  const defaultTemplatesQuery = useDefaultCampaignTemplates();
  const campaignQuery = useReviewCampaignById(isEditMode ? campaignId : null);

  const businessName =
    profileData?.Name || profileData?.DisplayName || "Business";

  const selectedLocationIdForApi = locationIdFromQuery || null;

  const reviewLinkQuery = useReviewLinkByLocation(
    businessId || null,
    selectedLocationIdForApi
  );

  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false);
  const pendingNavigationRef = React.useRef<string | null>(null);
  const initialSnapshotRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (isEditMode) {
      return;
    }
    if (hasAttemptedAutoFill.current) {
      return;
    }
    const fetchedUrl = reviewLinkQuery.data?.data?.reviewUrl;
    if (!fetchedUrl) {
      return;
    }
    form.setFieldValue("reviewLink", fetchedUrl);
    hasAttemptedAutoFill.current = true;
  }, [form, reviewLinkQuery.data]);

  const normalizeSequenceNames = React.useCallback((items: SequenceItem[]) => {
    let emailCount = 0;
    let smsCount = 0;
    return items.map((seq) => {
      if (seq.type === "email") {
        emailCount += 1;
        return { ...seq, name: `Email ${emailCount}` };
      }
      smsCount += 1;
      return { ...seq, name: `SMS ${smsCount}` };
    });
  }, []);

  const timezoneOptions = React.useMemo(() => {
    try {
      const timeZones = Intl.supportedValuesOf("timeZone");
      return timeZones
        .map((tz) => ({
          value: tz,
          label: tz.replace(/_/g, " "),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    } catch (error) {
      return [
        { value: "UTC", label: "UTC" },
        { value: "America/New_York", label: "America/New York" },
        { value: "America/Chicago", label: "America/Chicago" },
        { value: "America/Denver", label: "America/Denver" },
        { value: "America/Los_Angeles", label: "America/Los Angeles" },
        { value: "Europe/London", label: "Europe/London" },
        { value: "Asia/Tokyo", label: "Asia/Tokyo" },
      ];
    }
  }, []);

  React.useEffect(() => {
    if (timezone) return;
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const hasBrowserTz = timezoneOptions.some((opt) => opt.value === browserTz);
    setTimezone(hasBrowserTz ? browserTz : "UTC");
  }, [timezone, timezoneOptions]);

  const computeSnapshot = React.useCallback(() => {
    const rawSequences = sequences.map((seq) => ({
      type: seq.type,
      sequenceDay: seq.sequenceDay,
      subject: seq.subject || "",
      content: seq.content || "",
      buttonText: seq.buttonText || "",
      isSkipped: Boolean(seq.isSkipped),
    }));

    const normalizedSequences = rawSequences
      .slice()
      .sort((a, b) => {
        if (a.sequenceDay !== b.sequenceDay) {
          return a.sequenceDay - b.sequenceDay;
        }
        return a.type.localeCompare(b.type);
      });

    return JSON.stringify({
      reviewLink: form.state.values?.reviewLink || "",
      autoTrigger: form.state.values?.autoTrigger || "manual",
      timezone: timezone || "",
      sequences: normalizedSequences,
    });
  }, [form.state.values?.autoTrigger, form.state.values?.reviewLink, sequences, timezone]);

  const hasUnsavedChanges = React.useMemo(() => {
    const snapshot = computeSnapshot();
    if (!initialSnapshotRef.current) return false;
    return snapshot !== initialSnapshotRef.current;
  }, [computeSnapshot]);

  React.useEffect(() => {
    if (initialSnapshotRef.current) return;
    if (!timezone) return;
    if (sequences.length === 0) return;

    const snapshot = computeSnapshot();
    initialSnapshotRef.current = snapshot;
  }, [computeSnapshot, sequences.length, timezone]);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  React.useEffect(() => {
    if (!isEditMode) return;
    if (!campaignQuery.data?.data) return;
    if (hasUserEditedSequences) return;

    const campaign = campaignQuery.data.data;
    form.setFieldValue("reviewLink", campaign.reviewDestinationUrl || "");
    const triggerValue = campaign.triggerType === "AUTO" ? "default" : "manual";
    form.setFieldValue("autoTrigger", triggerValue);
    setTimezone(campaign.timezone || "UTC");

    const sortedActivities = (campaign.activities || [])
      .slice()
      .sort((a, b) => (a.OrderIndex ?? 0) - (b.OrderIndex ?? 0));

    let emailCount = 0;
    let smsCount = 0;
    const mappedSequences = sortedActivities.map((activity) => {
      const isEmail = activity.Type === "EMAIL";
      if (isEmail) {
        emailCount += 1;
      } else {
        smsCount += 1;
      }

      return {
        id: generateId(),
        type: isEmail ? "email" : "sms",
        name: isEmail ? `Email ${emailCount}` : `SMS ${smsCount}`,
        sequenceDay: activity.SequenceDays,
        dayUnit: activity.SequenceDays === 1 ? "day later" : "days later",
        subject: isEmail ? activity.Subject || "" : undefined,
        content: activity.Content || "",
        buttonText: isEmail ? activity.ButtonText || "" : undefined,
      } as SequenceItem;
    });

    setSequences(normalizeSequenceNames(mappedSequences));
    setHasInitializedTemplates(true);
    initialSnapshotRef.current = null;
  }, [campaignQuery.data?.data, form, hasUserEditedSequences, isEditMode, normalizeSequenceNames]);

  const getTypeDefaults = React.useCallback(
    (type: SequenceItem["type"]) => {
      const defaultTemplates = defaultTemplatesQuery.data?.data || [];
      const fallbackTemplate = defaultTemplates.find(
        (template) =>
          template.Type === (type === "email" ? "EMAIL" : "SMS")
      );

      if (fallbackTemplate) {
        return {
          subject: type === "email" ? fallbackTemplate.Subject || "" : undefined,
          content: fallbackTemplate.Content || "",
          buttonText: type === "email" ? fallbackTemplate.ButtonText || "" : undefined,
        };
      }

      return type === "email"
        ? {
          subject: "Thanks for your recent experience with {{Business Name}}",
          content: `Hi {{Customer Name}},

Thanks for choosing {{Business Name}}. We hope you had a great experience with us. If you have a moment, we'd really appreciate your feedback. Your review helps us improve and helps others make confident decisions.

Thank you for your time and support.

— The {{Business Name}} Team`,
          buttonText: "Share Your Feedback",
        }
        : {
          content:
            "Hi {{Customer Name}},Thanks again for choosing {{Business Name}}. If you have a moment, we’d love your feedback — it really helps us grow. {{Review Link}}",
        };
    },
    [defaultTemplatesQuery.data]
  );

  const handleUpdateSequence = (id: string, data: Partial<SequenceItem>) => {
    setHasUserEditedSequences(true);
    setSequences((prev) => {
      if (data.sequenceDay !== undefined) {
        const index = prev.findIndex((seq) => seq.id === id);
        const prevDay = index > 0 ? prev[index - 1]?.sequenceDay : 0;
        const nextDay = data.sequenceDay;

        if (Number.isNaN(nextDay) || nextDay <= prevDay) {
          toast.error("Sequence day must be greater than the previous step");
          return prev;
        }

        if (nextDay > MAX_SEQUENCE_DAY) {
          toast.error(`Sequence day cannot exceed ${MAX_SEQUENCE_DAY}`);
          return prev;
        }
      }

      const next = prev.map((seq) => {
        if (seq.id !== id) return seq;

        const typeChanged =
          data.type !== undefined && data.type !== seq.type;
        let updated = { ...seq, ...data };

        if (typeChanged) {
          const defaults = getTypeDefaults(data.type as SequenceItem["type"]);
          updated = {
            ...updated,
            subject:
              data.type === "email"
                ? updated.subject || defaults.subject || ""
                : undefined,
            content:
              updated.content && updated.content.trim()
                ? updated.content
                : defaults.content || "",
            buttonText:
              data.type === "email"
                ? updated.buttonText || defaults.buttonText || ""
                : undefined,
          };
        }

        return updated;
      });

      return normalizeSequenceNames(next);
    });
  };

  const handleDeleteSequence = (id: string) => {
    setHasUserEditedSequences(true);
    setSequences((prev) => normalizeSequenceNames(prev.filter((seq) => seq.id !== id)));
  };

  const handleAddSequence = () => {
    setHasUserEditedSequences(true);
    if (sequences.length >= MAX_ACTIVITIES) {
      toast.error(`You can add up to ${MAX_ACTIVITIES} activities`);
      return;
    }

    const lastDay = sequences[sequences.length - 1]?.sequenceDay || 0;
    if (lastDay >= MAX_SEQUENCE_DAY) {
      toast.error(`Sequence day cannot exceed ${MAX_SEQUENCE_DAY}`);
      return;
    }

    const newType = sequences.length % 2 === 0 ? "email" : "sms";
    const defaults = getTypeDefaults(newType);

    setSequences((prev) =>
      normalizeSequenceNames([
        ...prev,
        {
          id: generateId(),
          type: newType,
          name: newType === "email" ? "Email" : "SMS",
          sequenceDay: Math.min(lastDay + 1, MAX_SEQUENCE_DAY),
          dayUnit: lastDay + 1 === 1 ? "day later" : "days later",
          subject: newType === "email" ? defaults.subject || "" : undefined,
          content: defaults.content || "",
          buttonText: newType === "email" ? defaults.buttonText || "" : undefined,
        },
      ])
    );
  };

  React.useEffect(() => {
    if (isEditMode && (campaignQuery.isLoading || campaignQuery.data?.data)) {
      return;
    }
    if (hasInitializedTemplates) {
      return;
    }

    const defaultTemplates = defaultTemplatesQuery.data?.data;
    if (!defaultTemplates || defaultTemplates.length === 0) {
      if (
        (defaultTemplatesQuery.isError || defaultTemplatesQuery.isSuccess) &&
        !hasUserEditedSequences &&
        sequences.length === 0
      ) {
        setSequences(getFallbackSequences());
        setHasInitializedTemplates(true);
      }
      return;
    }

    if (hasUserEditedSequences) {
      return;
    }

    const sortedTemplates = [...defaultTemplates].sort(
      (a, b) => a.DefaultSequenceDays - b.DefaultSequenceDays
    );

    let emailCount = 0;
    let smsCount = 0;

    const mappedSequences: SequenceItem[] = sortedTemplates.map((template) => {
      const isEmail = template.Type === "EMAIL";
      if (isEmail) {
        emailCount += 1;
      } else {
        smsCount += 1;
      }

      const name = isEmail ? `Email ${emailCount}` : `SMS ${smsCount}`;
      const sequenceDay = template.DefaultSequenceDays;
      const dayUnit = sequenceDay === 1 ? "day later" : "days later";

      return {
        id: generateId(),
        type: isEmail ? "email" : "sms",
        name,
        sequenceDay,
        dayUnit,
        subject: isEmail ? template.Subject || "" : undefined,
        content: template.Content || "",
        buttonText: isEmail ? template.ButtonText || "" : undefined,
      };
    });

    setSequences(normalizeSequenceNames(mappedSequences));
    setHasInitializedTemplates(true);
  }, [
    campaignQuery.data?.data,
    campaignQuery.isLoading,
    defaultTemplatesQuery.data,
    defaultTemplatesQuery.isError,
    defaultTemplatesQuery.isSuccess,
    getFallbackSequences,
    hasUserEditedSequences,
    hasInitializedTemplates,
    isEditMode,
    sequences.length,
  ]);

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Reviews", href: `/business/${businessId}/reviews` },
      {
        label: isEditMode ? "Edit Campaign" : "Create Campaign",
        href: `/business/${businessId}/reviews/campaigns/new`,
      },
    ],
    [businessId, businessName, isEditMode],
  );

  const isPageLoading =
    !businessId ||
    defaultTemplatesQuery.isLoading ||
    (isEditMode && campaignQuery.isLoading);

  const isSaving = createCampaignMutation.isPending || updateCampaignMutation.isPending;
  const isSaveDisabled = isSaving || (isEditMode ? !hasUnsavedChanges : false);

  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA]">
      <PageHeader breadcrumbs={breadcrumbs} />
      <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col gap-6">
        {isPageLoading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-lg border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p>Loading...</p>
            </div>
          </div>
        ) : (
        <>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const nextHref = `/business/${businessId}/reviews?tab=${returnTab}`;
                if (hasUnsavedChanges) {
                  pendingNavigationRef.current = nextHref;
                  setShowUnsavedDialog(true);
                  return;
                }
                router.push(nextHref);
              }}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Typography variant="h3" className="text-[20px] font-semibold">
              {isEditMode ? "Edit Campaign" : "Create New Campaign"}
            </Typography>
          </div>
          <Button
            variant="default"
            className="shrink-0 "
            disabled={isSaveDisabled}
            onClick={async () => {
              const reviewLink = form.state.values?.reviewLink?.trim();
              const autoTrigger = (form.state.values?.autoTrigger || "manual") as "manual" | "default";

              if (!reviewLink) {
                toast.error("Review link is required");
                return;
              }

              let parsedUrl: URL | null = null;
              try {
                parsedUrl = new URL(reviewLink);
              } catch {
                toast.error("Please enter a valid review URL");
                return;
              }

              if (!timezone) {
                toast.error("Please select a timezone");
                return;
              }

              if (!selectedLocationIdForApi) {
                toast.error("Please select a location before saving a campaign");
                return;
              }

              const activeSequences = sequences
                .filter((seq) => !seq.isSkipped)
                .slice()
                .sort((a, b) => a.sequenceDay - b.sequenceDay);

              if (activeSequences.length === 0) {
                toast.error("Please add at least one active sequence");
                return;
              }

              if (activeSequences.length > MAX_ACTIVITIES) {
                toast.error(`You can add up to ${MAX_ACTIVITIES} activities`);
                return;
              }

              for (let i = 0; i < activeSequences.length; i += 1) {
                const current = activeSequences[i];
                const prev = activeSequences[i - 1];
                if (prev && current.sequenceDay <= prev.sequenceDay) {
                  toast.error("Sequence days must be strictly increasing");
                  return;
                }
                if (current.sequenceDay > MAX_SEQUENCE_DAY) {
                  toast.error(`Sequence day cannot exceed ${MAX_SEQUENCE_DAY}`);
                  return;
                }
              }

              for (const seq of activeSequences) {
                if (!seq.content || !seq.content.trim()) {
                  toast.error("Content is required for all activities");
                  return;
                }
                if (seq.type === "email") {
                  if (!seq.subject || !seq.subject.trim()) {
                    toast.error("Subject is required for email activities");
                    return;
                  }
                  if (!seq.buttonText || !seq.buttonText.trim()) {
                    toast.error("Button text is required for email activities");
                    return;
                  }
                }
              }

              const activities = activeSequences.map((seq, index) => ({
                Type: (seq.type === "email" ? "EMAIL" : "SMS") as "EMAIL" | "SMS",
                SequenceDays: seq.sequenceDay,
                OrderIndex: index + 1,
                Subject: seq.type === "email" ? seq.subject || null : null,
                Content: seq.content || "",
                ButtonText: seq.type === "email" ? seq.buttonText || null : null,
              }));

              const payload = {
                businessId,
                locationId: selectedLocationIdForApi,
                name: deriveCampaignNameFromUrl(parsedUrl.toString()),
                reviewDestinationUrl: reviewLink,
                triggerType: (autoTrigger === "default" ? "AUTO" : "MANUAL") as "AUTO" | "MANUAL",
                isDefault: autoTrigger === "default",
                isActive: true,
                timezone,
                activities,
              };

              try {
                if (isEditMode && campaignId) {
                  await updateCampaignMutation.mutateAsync({ id: campaignId, payload });
                } else {
                  await createCampaignMutation.mutateAsync(payload);
                }
                initialSnapshotRef.current = computeSnapshot();
                router.push(`/business/${businessId}/reviews?tab=campaign`);
              } catch (error) {
                // Errors are handled by the mutation onError
              }
            }}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>

        <Card className="bg-white shadow-none border-none rounded-lg py-6 px-4">
          <CardContent className="p-0">
            <div className="grid grid-cols-2 gap-4">
              <Card variant="profileCard">
                <CardContent>
                  <GenericInput<CampaignFormData>
                    form={form as any}
                    fieldName="reviewLink"
                    type="url"
                    inputVariant="noBorder"
                    label="Review Link"
                    required
                    placeholder="Enter URL"
                  />
                </CardContent>
              </Card>

              <div>
                <Card variant="profileCard">
                  <CardContent>
                    <GenericInput<CampaignFormData>
                      form={form as any}
                      fieldName="autoTrigger"
                      type="radio-group"
                      inputVariant="noBorder"
                      label="Auto Trigger"
                      required
                      options={[
                        { value: "manual", label: "Manually" },
                        {
                          value: "default",
                          label:
                            "Default (auto-triggered when a customer is added)",
                        },
                      ]}
                      orientation="horizontal"
                    />
                  </CardContent>
                </Card>
                <p className="text-blue-600 text-xs mt-2">
                  Campaigns are sent out Monday-Sunday, 9:00 AM-7:00 PM local
                  time.
                </p>
              </div>

              <Card variant="profileCard">
                <CardContent>
                  <Typography variant="small" className="text-general-foreground font-medium mb-2">
                    Timezone
                  </Typography>
                  <LocationSelect
                    value={timezone}
                    onChange={setTimezone}
                    options={timezoneOptions}
                    placeholder="Select timezone"
                  />
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <div className="flex">
          <Card className="bg-white shadow-none border-none rounded-lg py-6 px-4">
            <CardContent className="p-0 flex gap-9 min-w-0">
              <div className="min-w-0 w-[700px] max-w-full">
                <AutomationSequenceTable
                  sequences={sequences}
                  onUpdateSequence={handleUpdateSequence}
                  onDeleteSequence={handleDeleteSequence}
                  onAddSequence={handleAddSequence}
                  expandedId={selectedSequenceId}
                  onExpandedChange={setSelectedSequenceId}
                  className="max-h-[560px] overflow-y-auto"
                  maxSequenceDay={MAX_SEQUENCE_DAY}
                />
              </div>

              <div className="w-[320px] shrink-0">
                {selectedSequenceId
                  ? (() => {
                    const currentSeq = sequences.find(
                      (s) => s.id === selectedSequenceId
                    );

                    if (!currentSeq) {
                      return null;
                    }

                    if (currentSeq.type === "sms") {
                      return (
                        <MobilePreview
                          type="sms"
                          smsProps={{
                            content:
                              currentSeq.content || "SMS message content...",
                          }}
                        />
                      );
                    }

                    return (
                      <MobilePreview
                        type="email"
                        emailProps={{
                          subject: currentSeq.subject || "Email subject",
                          businessName: businessName,
                          content: currentSeq.content || "Email content",
                          buttonText: currentSeq.buttonText,
                        }}
                      />
                    );
                  })()
                  : null}
              </div>
            </CardContent>
          </Card>
        </div>
        </>
        )}
      </div>
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you leave now, they will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const href = pendingNavigationRef.current;
                pendingNavigationRef.current = null;
                setShowUnsavedDialog(false);
                if (href) {
                  router.push(href);
                }
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
