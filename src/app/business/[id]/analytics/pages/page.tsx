import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { SmartSitemapTemplate } from "@/components/templates/SmartSitemapTemplate"
import { getPageMetadata } from "@/config/seo"

export const metadata = {
  ...getPageMetadata("businessAnalytics"),
}

export default async function SmartSitemapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <EntitlementsGuard entitlement="analytics" businessId={id}>
      <SmartSitemapTemplate businessId={id} />
    </EntitlementsGuard>
  )
}
