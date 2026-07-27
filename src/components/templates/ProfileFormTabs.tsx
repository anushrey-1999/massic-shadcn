"use client";

import React from "react";

import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import {
  PROFILE_FORM_TABS,
  type ProfileFormTabId,
} from "@/utils/profile-form-mappers";
import { BusinessInfoForm } from "@/components/organisms/profile/BusinessInfoForm";
import { OfferingsForm } from "@/components/organisms/profile/OfferingsForm";
import { ContentCuesForm } from "@/components/organisms/profile/ContentCuesForm";
import { LocationsForm } from "@/components/organisms/profile/LocationsForm";
import { CompetitorsForm } from "@/components/organisms/profile/CompetitorsForm";
import { GenericInput } from "@/components/ui/generic-input";
import { ProfileStepCard } from "@/components/ui/profile-step-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProfileFormTabsProps = {
  form: any;
  businessId: string | null;
  value: ProfileFormTabId;
  onValueChange: (value: ProfileFormTabId) => void;
  rightAction?: React.ReactNode;
  footer?: React.ReactNode;
  primaryLocationAction?: React.ReactNode;
  disableWebsiteLock?: boolean;
  hideFetchOfferingsFromWebsite?: boolean;
  restrictFetchOfferings?: boolean;
  extractionController?: any;
  includeBusinessDescription?: boolean;
  basicDetailsDescription?: string;
  tabsListClassName?: string;
};

export function ProfileFormTabs({
  form,
  businessId,
  value,
  onValueChange,
  rightAction,
  footer,
  primaryLocationAction,
  disableWebsiteLock,
  hideFetchOfferingsFromWebsite,
  restrictFetchOfferings,
  extractionController,
  includeBusinessDescription,
  basicDetailsDescription = "Helps us understand who you are and how to tailor insights, benchmarks, and strategy to your business.",
  tabsListClassName = "w-fit self-start shrink-0",
}: ProfileFormTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as ProfileFormTabId)}
      className="flex flex-col gap-7 flex-1 min-h-0 overflow-hidden"
    >
      <TabsList className={tabsListClassName}>
        {PROFILE_FORM_TABS.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="py-2 flex-none px-4"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent
        value="basic-details"
        className="flex flex-col flex-1 min-h-0 overflow-hidden mt-0"
      >
        <ProfileStepCard
          title="Basic Details"
          description={basicDetailsDescription}
          className="flex-1"
          scrollableContent
          contentClassName="pb-6"
          rightAction={rightAction}
          footer={footer}
        >
          <BusinessInfoForm
            form={form}
            embedded
            embeddedVariant="full"
            disableWebsiteLock={disableWebsiteLock}
            primaryLocationAction={primaryLocationAction}
          />
          <OfferingsForm
            form={form}
            businessId={businessId}
            embedded
            hideFetchOfferingsFromWebsite={hideFetchOfferingsFromWebsite}
            extractionController={extractionController}
            restrictFetchOfferings={restrictFetchOfferings}
          />
          {includeBusinessDescription && (
            <div className="w-1/2">
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="businessDescription"
                type="textarea"
                className="min-h-[160px]"
                label={
                  <>
                    Anything else we should know about your business?{" "}
                    <span className="text-general-muted-foreground font-normal">
                      (optional)
                    </span>
                  </>
                }
                placeholder="Provide any additional info"
                rows={6}
              />
            </div>
          )}
        </ProfileStepCard>
      </TabsContent>

      <TabsContent
        value="content-cues"
        className="flex flex-col flex-1 min-h-0 overflow-hidden mt-0"
      >
        <ProfileStepCard
          title="Content Cues"
          description="Guides tone, messaging, and calls-to-action so content sounds like you and converts better."
          className="flex-1"
          scrollableContent
          contentClassName="pb-6"
          rightAction={rightAction}
          footer={footer}
        >
          <ContentCuesForm form={form} embedded />
          <LocationsForm form={form} embedded />
        </ProfileStepCard>
      </TabsContent>

      <TabsContent
        value="competitors"
        className="flex flex-col flex-1 min-h-0 overflow-hidden mt-0"
      >
        <ProfileStepCard
          title="Competitors"
          description="Gives context on your landscape so we can spot gaps, differentiation, and growth opportunities."
          className="flex-1"
          scrollableContent
          contentClassName="pb-6"
          rightAction={rightAction}
          footer={footer}
        >
          <CompetitorsForm form={form} embedded />
        </ProfileStepCard>
      </TabsContent>
    </Tabs>
  );
}
