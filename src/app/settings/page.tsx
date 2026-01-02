import SettingsTemplate from '@/components/templates/SettingsTemplate'
import React from 'react'
import { getPageMetadata } from "@/config/seo";

export const metadata = {
  ...getPageMetadata("settings"),
}

const page = () => {
  return (
    <SettingsTemplate />
  )
}

export default page