import { AnalyticsTemplate } from "@/components/templates/AnalyticsTemplate"
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { getPageMetadata } from "@/config/seo";

export const metadata = {
  ...getPageMetadata("businessAnalytics"),
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BusinessAnalyticsPage({ params }: PageProps) {
  const { id } = await params
  return (
    <EntitlementsGuard entitlement="analytics" businessId={id}>
      <AnalyticsTemplate />
    </EntitlementsGuard>
  )
}

