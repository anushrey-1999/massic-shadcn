"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { PageHeader } from "@/components/molecules/PageHeader";
import { MobilePreview } from "@/components/molecules/MobilePreview";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GenericInput } from "@/components/ui/generic-input";
import { Typography } from "@/components/ui/typography";
import {
  AutomationSequenceTable,
  type SequenceItem,
} from "@/components/ui/automation-sequence-table";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { generateId } from "@/lib/id";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    campaignId?: string;
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
  const [businessId, setBusinessId] = React.useState<string>("");
  const [campaignId, setCampaignId] = React.useState<string | null>(null);
  const [selectedSequenceId, setSelectedSequenceId] = React.useState<
    string | null
  >(null);

  const isEditMode = !!campaignId;

  const form = useForm({
    defaultValues: {
      reviewLink: "",
      autoTrigger: "manual" as const,
    },
  });
  const [sequences, setSequences] = React.useState<SequenceItem[]>([
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
  ]);

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id));
  }, [params]);

  React.useEffect(() => {
    if (searchParams) {
      searchParams.then((sp) => setCampaignId(sp.campaignId || null));
    }
  }, [searchParams]);

  const { profileData } = useBusinessProfileById(businessId || null);

  const businessName =
    profileData?.Name || profileData?.DisplayName || "Business";

  const handleUpdateSequence = (id: string, data: Partial<SequenceItem>) => {
    setSequences((prev) =>
      prev.map((seq) => (seq.id === id ? { ...seq, ...data } : seq)),
    );
  };

  const handleDeleteSequence = (id: string) => {
    setSequences((prev) => prev.filter((seq) => seq.id !== id));
  };

  const handleAddSequence = () => {
    const emailCount = sequences.filter((s) => s.type === "email").length;
    const smsCount = sequences.filter((s) => s.type === "sms").length;
    const newType = sequences.length % 2 === 0 ? "email" : "sms";
    const newName =
      newType === "email" ? `Email ${emailCount + 1}` : `SMS ${smsCount + 1}`;

    setSequences((prev) => [
      ...prev,
      {
        id: generateId(),
        type: newType,
        name: newName,
        sequenceDay: prev.length + 1,
        dayUnit: prev.length + 1 === 1 ? "day later" : "days later",
        subject: newType === "email" ? "" : undefined,
        content: "",
        buttonText: newType === "email" ? "" : undefined,
      },
    ]);
  };

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

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA]">
      <PageHeader breadcrumbs={breadcrumbs} />
      <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Typography variant="h3" className="text-[20px] font-semibold">
              {isEditMode ? "Edit Campaign" : "Create New Campaign"}
            </Typography>
          </div>
          <Button variant="default" className="shrink-0 ">
            Save Changes
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
            </div>
          </CardContent>
        </Card>

        <div className="flex">
          <Card className="bg-white shadow-none border-none rounded-lg py-6 px-4">
            <CardContent className="p-0 flex gap-9">
              <AutomationSequenceTable
                sequences={sequences}
                onUpdateSequence={handleUpdateSequence}
                onDeleteSequence={handleDeleteSequence}
                onAddSequence={handleAddSequence}
              />

              <div>
                {(() => {
                  const currentSeq = selectedSequenceId
                    ? sequences.find((s) => s.id === selectedSequenceId)
                    : sequences.find((s) => !s.isSkipped);

                  if (!currentSeq) {
                    return (
                      <MobilePreview
                        type="email"
                        emailProps={{
                          subject: "No preview available",
                          businessName: businessName,
                          content: "Select a sequence to preview",
                        }}
                      />
                    );
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
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
