import { IndexingTemplate } from "@/components/templates/IndexingTemplate"
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { getPageMetadata } from "@/config/seo"

export const metadata = {
  ...getPageMetadata("businessAnalytics"),
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BusinessIndexingPage({ params }: PageProps) {
  const { id } = await params
  return (
    <EntitlementsGuard entitlement="analytics" businessId={id}>
      <IndexingTemplate />
    </EntitlementsGuard>
  )
}
