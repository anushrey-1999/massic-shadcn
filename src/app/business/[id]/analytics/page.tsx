import { AnalyticsTemplate } from "@/templates/analytics/AnalyticsTemplate"
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"

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

