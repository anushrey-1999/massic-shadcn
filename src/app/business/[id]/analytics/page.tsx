import { AnalyticsTemplate } from "@/components/templates/AnalyticsTemplate"
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { GoogleConnectionGuard } from "@/components/molecules/GoogleConnectionGuard"
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
      <GoogleConnectionGuard
        requires={["gsc", "ga4"]}
        businessId={id}
        subject="analytics for this business"
      >
        <AnalyticsTemplate />
      </GoogleConnectionGuard>
    </EntitlementsGuard>
  )
}

