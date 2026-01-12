"use client"

import { useJobByBusinessId } from '@/hooks/use-jobs'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/molecules/EmptyState'

interface WorkflowStatusBannerProps {
  businessId: string
  className?: string
  emptyStateHeight?: string
}

export function WorkflowStatusBanner({ businessId, className, emptyStateHeight }: WorkflowStatusBannerProps) {
  const { data: jobDetails, isLoading } = useJobByBusinessId(businessId || null)
  
  const workflowStatus = jobDetails?.workflow_status?.status

  if (isLoading) {
    return null
  }

  // Show message when no job exists
  if (!jobDetails || !workflowStatus) {
    return (
      <EmptyState
        title="No Job Found"
        className={emptyStateHeight || "h-[calc(100vh-12rem)]"}
        description="Please create a job in the profile page to view web page data."
        cardClassName={cn("", className)}
        buttons={[
          {
            label: "Go to Profile",
            href: `/business/${businessId}/profile`,
            variant: "outline",
            size: "lg"
          }
        ]}
      />
    )
  }

  if (workflowStatus === "processing") {
    return (
      <EmptyState
        title="Workflow Processing"
        description="Your workflows are being processed. Data will be available shortly."
        className={emptyStateHeight}
        cardClassName={cn("", className)}
        isProcessing={true}
      />
    )
  }

  if (workflowStatus === "error") {
    return (
      <EmptyState
        title="Workflow Error"
        className={emptyStateHeight}
        cardClassName={cn("", className)}
        description="Something went wrong. Please re-run the workflows from your profile page."
        buttons={[
          {
            label: "Go to Profile",
            href: `/business/${businessId}/profile`,
            variant: "outline",
            size: "lg"
          }
        ]}
      />
    )
  }

  return null
}
