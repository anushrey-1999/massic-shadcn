"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/molecules/PageHeader";
import { CAMPAIGN_REPORT_WIDTH_CLASS, CampaignImpactReportContent } from "@/components/organisms/campaign-impact/CampaignImpactReportContent";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { useCampaignEvent } from "@/hooks/use-campaign-impact";
import { cn } from "@/lib/utils";

export function CampaignImpactReportTemplate({ businessId, campaignId }: { businessId: string; campaignId: string }) {
  const router = useRouter();
  const { profileData } = useBusinessProfileById(businessId);
  const detail = useCampaignEvent(businessId, campaignId);
  const campaign = detail.data;
  const businessName = profileData?.Name || "Business";
  const campaignsHref = `/business/${businessId}/analytics/campaigns`;
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: businessName },
    { label: "Analytics", href: `/business/${businessId}/analytics` },
    { label: "Campaign Tracking", href: campaignsHref },
    { label: campaign?.name || "Impact report" },
  ];

  return (
    <div className="min-h-screen bg-general-primary-foreground">
      <PageHeader breadcrumbs={breadcrumbs} />
      <main className={cn("w-full px-5 md:px-7", CAMPAIGN_REPORT_WIDTH_CLASS)}>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4 -ml-2 h-7 px-2 text-xs"
          onClick={() => router.push(campaignsHref)}
        >
          <ArrowLeft className="size-3.5" />Campaigns
        </Button>
        <CampaignImpactReportContent
          businessId={businessId}
          campaignId={campaignId}
          variant="page"
          onBackToCampaigns={() => router.push(campaignsHref)}
        />
      </main>
    </div>
  );
}
