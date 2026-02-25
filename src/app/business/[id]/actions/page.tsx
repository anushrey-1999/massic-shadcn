"use client"

import React from "react"
import { PageHeader } from "@/components/molecules/PageHeader"
import { useBusinessProfileById } from "@/hooks/use-business-profiles"
import { PagesActionsDropdown, PostsActionsDropdown } from "@/components/organisms/actions"
import { RefinePlanOverlayProvider } from "@/components/organisms/actions/refine-plan-overlay-provider"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function BusinessActionsPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>("")
  const [openSection, setOpenSection] = React.useState<"pages" | "posts" | null>("pages")

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id))
  }, [params])

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null)

  const businessName = profileData?.Name || profileData?.DisplayName || "Business"

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Actions", href: `/business/${businessId}/actions` },
    ],
    [businessName, businessId]
  )

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (profileDataLoading) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader breadcrumbs={breadcrumbs} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <PageHeader breadcrumbs={breadcrumbs} />
          <RefinePlanOverlayProvider businessId={businessId}>
            <div
              data-slot="actions-page-content"
              className="relative w-full max-w-[1224px] flex-1 min-h-0 overflow-hidden p-5 flex flex-col"
            >
              <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden">
                <PagesActionsDropdown
                  open={openSection === "pages"}
                  onOpenChange={(next) => setOpenSection(next ? "pages" : null)}
                />
                <PostsActionsDropdown
                  open={openSection === "posts"}
                  onOpenChange={(next) => setOpenSection(next ? "posts" : null)}
                />
              </div>
            </div>
          </RefinePlanOverlayProvider>
    </div>
  )
}

