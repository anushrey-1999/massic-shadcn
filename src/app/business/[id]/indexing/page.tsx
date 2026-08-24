import { IndexingTemplate } from "@/components/templates/IndexingTemplate"
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { GoogleConnectionGuard } from "@/components/molecules/GoogleConnectionGuard"
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
      <GoogleConnectionGuard
        requires={["gsc"]}
        businessId={id}
        subject="indexing for this business"
      >
        <IndexingTemplate />
      </GoogleConnectionGuard>
    </EntitlementsGuard>
  )
}
