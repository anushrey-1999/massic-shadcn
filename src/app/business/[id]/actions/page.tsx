import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BusinessActionsPage({ params }: PageProps) {
  const { id } = await params
  return (
    <EntitlementsGuard entitlement="content" businessId={id}>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Actions - {id}</h1>
        <p className="text-muted-foreground">Actions page for {id}</p>
      </div>
    </EntitlementsGuard>
  )
}

