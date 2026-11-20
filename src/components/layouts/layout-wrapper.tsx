'use client'

import { usePathname } from 'next/navigation'
import { isAgentRoute, isBusinessProfileRoute, usesEmptyLayout } from '@/lib/layout-config'
import { DeveloperModeProvider } from '@/features/developer-mode/developer-mode-provider'
import Layout from './layout'
import EmptyLayout from './empty-layout'

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const fillViewport = isAgentRoute(pathname) || isBusinessProfileRoute(pathname)
  if (usesEmptyLayout(pathname)) {
    return <EmptyLayout>{children}</EmptyLayout>
  }

  return (
    <DeveloperModeProvider pathname={pathname}>
      <Layout fill={fillViewport}>{children}</Layout>
    </DeveloperModeProvider>
  )
}
