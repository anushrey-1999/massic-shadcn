import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { SmartSitemapPageTemplate } from "@/components/templates/SmartSitemapPageTemplate"
import { getPageMetadata } from "@/config/seo"

export const metadata = {
  ...getPageMetadata("businessAnalytics"),
}

export default async function SmartSitemapPageDetail({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>
}) {
  const { id, pageId } = await params
  return (
    <EntitlementsGuard entitlement="analytics" businessId={id}>
      <SmartSitemapPageTemplate businessId={id} pageId={pageId} />
    </EntitlementsGuard>
  )
}
