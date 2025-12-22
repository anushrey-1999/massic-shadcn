"use client"

import React from 'react'
import Link from 'next/link'
import { useJobByBusinessId } from '@/hooks/use-jobs'
import { cn } from '@/lib/utils'

interface WorkflowStatusBannerProps {
  businessId: string
  className?: string
}

export function WorkflowStatusBanner({ businessId, className }: WorkflowStatusBannerProps) {
  const { data: jobDetails, isLoading } = useJobByBusinessId(businessId || null)
  
  const workflowStatus = jobDetails?.workflow_status?.status

  if (isLoading) {
    return null
  }

  // Show message when no job exists
  if (!jobDetails || !workflowStatus) {
    return (
      <div className={cn(
        "bg-yellow-50 border border-yellow-200 text-yellow-900 px-4 py-3 rounded-lg mb-4",
        className
      )}>
        <p className="text-sm">
          No Job found, Please create one from{' '}
          <Link 
            href={`/business/${businessId}/profile`}
            className="underline font-medium hover:text-yellow-700"
          >
            Profile Page
          </Link>
        </p>
      </div>
    )
  }

  if (workflowStatus === "processing") {
    return (
      <div className={cn(
        "bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-lg mb-4",
        className
      )}>
        <p className="text-sm">
          Your workflows are being proceed. You will get the data in sometime
        </p>
      </div>
    )
  }

  if (workflowStatus === "error") {
    return (
      <div className={cn(
        "bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-lg mb-4",
        className
      )}>
        <p className="text-sm">
          Something went wrong, Re-run the workflows in{' '}
          <Link 
            href={`/business/${businessId}/profile`}
            className="underline font-medium hover:text-red-700"
          >
            Profile
          </Link>{' '}
          page
        </p>
      </div>
    )
  }

  return null
}
