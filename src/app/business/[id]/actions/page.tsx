"use client"

import React from "react"
import { PageHeader } from "@/components/molecules/PageHeader"
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { WorkflowStatusBanner } from "@/components/molecules/WorkflowStatusBanner"
import { useBusinessProfileById } from "@/hooks/use-business-profiles"
import { useJobByBusinessId } from "@/hooks/use-jobs"
import { getWorkflowStatus, isWorkflowSuccess } from "@/lib/workflow-status"
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
  const { data: jobDetails, isLoading: jobDetailsLoading } = useJobByBusinessId(businessId || null)
  const coreStatus = getWorkflowStatus(jobDetails, "core") ?? jobDetails?.workflow_status?.status
  const showActionsContent =
    !jobDetailsLoading &&
    coreStatus === "success" &&
    isWorkflowSuccess(jobDetails, "blogs_and_pages_planner")

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
      <EntitlementsGuard
        entitlement="actions"
        businessId={businessId}
        alertMessage="You're on Starter or Core. Upgrade to Growth to unlock Actions."
      >
        {showActionsContent ? (
          <RefinePlanOverlayProvider businessId={businessId}>
            <div
              data-slot="actions-page-content"
              className="relative w-full max-w-[1224px] flex-1 min-h-0 overflow-hidden p-5 flex flex-col"
            >
              <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden">
                <PagesActionsDropdown
                  businessId={businessId}
                  open={openSection === "pages"}
                  onOpenChange={(next) => setOpenSection(next ? "pages" : null)}
                />
                {/* <PostsActionsDropdown
                  open={openSection === "posts"}
                  onOpenChange={(next) => setOpenSection(next ? "posts" : null)}
                /> */}
              </div>
            </div>
          </RefinePlanOverlayProvider>
        ) : (
          <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
            <WorkflowStatusBanner
              businessId={businessId}
              workflowKey="blogs_and_pages_planner"
              emptyStateHeight="min-h-[calc(100vh-12rem)]"
            />
          </div>
        )}
      </EntitlementsGuard>
    </div>
  )
}

