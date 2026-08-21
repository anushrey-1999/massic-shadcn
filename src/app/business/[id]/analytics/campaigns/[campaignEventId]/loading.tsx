import { CampaignImpactReportSkeleton } from "@/components/organisms/campaign-impact/CampaignImpactReportSkeleton";

export default function CampaignImpactLoading() {
  return (
    <div className="min-h-screen bg-general-primary-foreground">
      <CampaignImpactReportSkeleton />
    </div>
  );
}
