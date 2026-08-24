import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";
import { CampaignsTemplate } from "@/components/templates/CampaignsTemplate";

export default async function CampaignsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EntitlementsGuard entitlement="analytics" businessId={id}><CampaignsTemplate businessId={id} /></EntitlementsGuard>;
}
