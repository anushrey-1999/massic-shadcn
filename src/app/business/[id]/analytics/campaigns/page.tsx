import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";
import { GoogleConnectionGuard } from "@/components/molecules/GoogleConnectionGuard";
import { CampaignsTemplate } from "@/components/templates/CampaignsTemplate";

export default async function CampaignsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <EntitlementsGuard entitlement="analytics" businessId={id}>
      <GoogleConnectionGuard
        requires={["ga4"]}
        businessId={id}
        subject="campaign tracking for this business"
      >
        <CampaignsTemplate businessId={id} />
      </GoogleConnectionGuard>
    </EntitlementsGuard>
  );
}
