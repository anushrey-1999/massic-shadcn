import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";
import { CampaignImpactReportTemplate } from "@/components/templates/CampaignImpactReportTemplate";

export default async function CampaignImpactPage({ params }: { params: Promise<{ id: string; campaignEventId: string }> }) {
  const { id, campaignEventId } = await params;
  return <EntitlementsGuard entitlement="analytics" businessId={id}><CampaignImpactReportTemplate businessId={id} campaignId={campaignEventId} /></EntitlementsGuard>;
}
