import SettingsTemplate from '@/components/templates/SettingsTemplate'
import React, { Suspense } from 'react'
import { getPageMetadata } from "@/config/seo";

export const metadata = {
  ...getPageMetadata("settings"),
}

const page = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SettingsTemplate />
    </Suspense>
  )
}

export default page