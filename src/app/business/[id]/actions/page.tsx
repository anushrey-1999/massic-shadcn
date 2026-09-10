"use client"

import React from "react"
import { PageHeader } from "@/components/molecules/PageHeader"
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard"
import { WorkflowStatusBanner } from "@/components/molecules/WorkflowStatusBanner"
import { useBusinessProfileById } from "@/hooks/use-business-profiles"
import { useJobByBusinessId } from "@/hooks/use-jobs"
import { getWorkflowStatus, isWorkflowSuccess } from "@/lib/workflow-status"
import { PagesActionsDropdown, PostsActionsDropdown } from "@/components/organisms/actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppWindow, Share2 } from "lucide-react"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function BusinessActionsPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>("")
  const [activeTab, setActiveTab] = React.useState<"pages" | "social">("pages")

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id))
  }, [params])

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null)
  const { data: jobDetails, isLoading: jobDetailsLoading } = useJobByBusinessId(businessId || null)
  const coreStatus = getWorkflowStatus(jobDetails, "core") ?? jobDetails?.workflow_status?.status
  const showActionsContent = !jobDetailsLoading && coreStatus === "success"
  const webpagesReady = isWorkflowSuccess(jobDetails, "webpages")
  const socialReady = isWorkflowSuccess(jobDetails, "social_channels")

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
          <div
            data-slot="actions-page-content"
            className="relative flex min-h-0 min-w-0 w-full max-w-[1224px] flex-1 flex-col overflow-hidden p-5"
          >
            <Tabs value={activeTab} onValueChange={value => setActiveTab(value as "pages" | "social")} className="min-h-0 flex-1 overflow-hidden">
              <TabsList className="shrink-0">
                <TabsTrigger value="pages"><AppWindow className="size-4" />Pages</TabsTrigger>
                <TabsTrigger value="social"><Share2 className="size-4" />Social</TabsTrigger>
              </TabsList>
              <TabsContent value="pages" className="min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
                <PagesActionsDropdown businessId={businessId} ready={webpagesReady} readinessLoading={jobDetailsLoading} />
              </TabsContent>
              <TabsContent value="social" className="min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
                <PostsActionsDropdown businessId={businessId} ready={socialReady} readinessLoading={jobDetailsLoading} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex min-h-0 w-full flex-1 flex-col p-5">
            <WorkflowStatusBanner
              businessId={businessId}
              workflowKey="webpages"
              emptyStateHeight="min-h-[calc(100vh-12rem)]"
            />
          </div>
        )}
      </EntitlementsGuard>
    </div>
  )
}
