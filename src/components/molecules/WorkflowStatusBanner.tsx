"use client"

import { useJobByBusinessId } from '@/hooks/use-jobs'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/molecules/EmptyState'
import { getWorkflowStatus, type WorkflowStatusValue } from '@/lib/workflow-status'

interface WorkflowStatusBannerProps {
  businessId: string
  className?: string
  emptyStateHeight?: string
  profileHref?: string
  workflowKey?: string | string[]
}

function combineWorkflowStatuses(statuses: WorkflowStatusValue[]): WorkflowStatusValue {
  if (statuses.some((s) => s === "error")) return "error"
  if (statuses.every((s) => s === "success")) return "success"
  if (statuses.some((s) => s === "processing")) return "processing"
  if (statuses.some((s) => s === "pending")) return "pending"
  return undefined
}

export function WorkflowStatusBanner({
  businessId,
  className,
  emptyStateHeight,
  profileHref,
  workflowKey,
}: WorkflowStatusBannerProps) {
  const { data: jobDetails, isLoading } = useJobByBusinessId(businessId || null)
  const coreStatus = getWorkflowStatus(jobDetails, "core") ?? jobDetails?.workflow_status?.status
  const effectiveWorkflowKey = workflowKey
  const overallStatus = jobDetails?.workflow_status?.status
  const workflowStatus = (() => {
    if (!effectiveWorkflowKey) return jobDetails?.workflow_status?.status
    if (coreStatus && coreStatus !== "success") return coreStatus
    if (Array.isArray(effectiveWorkflowKey)) {
      const statuses = effectiveWorkflowKey.map((key) => getWorkflowStatus(jobDetails, key))
      return combineWorkflowStatuses(statuses)
    }
    return getWorkflowStatus(jobDetails, effectiveWorkflowKey)
  })()
  const effectiveStatus = workflowStatus ?? (jobDetails ? "processing" : undefined)
  const effectiveProfileHref = profileHref || `/business/${businessId}/profile`

  if (isLoading) {
    return null
  }

  // Show message when no job exists
  if (!jobDetails) {
    return (
      <EmptyState
        title="No Job Found"
        className={emptyStateHeight || "h-[calc(100vh-12rem)]"}
        description="Please create a job in the profile page to view web page data."
        cardClassName={cn("", className)}
        buttons={[
          {
            label: "Go to Profile",
            href: effectiveProfileHref,
            variant: "outline",
            size: "lg"
          }
        ]}
      />
    )
  }

  if (overallStatus === "processing" && effectiveStatus !== "success" && effectiveStatus !== "error") {
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

  if (effectiveStatus === "processing") {
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

  if (effectiveStatus === "error") {
    return (
      <EmptyState
        title="Workflow Error"
        className={emptyStateHeight}
        cardClassName={cn("", className)}
        description="Something went wrong. Please re-run the workflows from your profile page."
        buttons={[
          {
            label: "Go to Profile",
            href: effectiveProfileHref,
            variant: "outline",
            size: "lg"
          }
        ]}
      />
    )
  }

  if (effectiveStatus === "pending") {
    return (
      <EmptyState
        title="No Data Found"
        className={emptyStateHeight}
        cardClassName={cn("", className)}
        description="Trigger workflow from Profile page to start the workflows"
        buttons={[
          {
            label: "Go to Profile",
            href: effectiveProfileHref,
            variant: "outline",
            size: "lg"
          }
        ]}
      />
    )
  }

  return null
}
