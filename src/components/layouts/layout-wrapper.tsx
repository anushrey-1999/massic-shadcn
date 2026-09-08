'use client'

import { usePathname } from 'next/navigation'
import { routesWithoutSidebar, routePrefixesWithoutSidebar } from '@/lib/layout-config'
import Layout from './layout'
import EmptyLayout from './empty-layout'

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isBusinessAgentRoute = /^\/business\/[^/]+\/agent(?:\/|$)/.test(pathname)
  const shouldUseEmptyLayout =
    isBusinessAgentRoute ||
    routesWithoutSidebar.includes(pathname) ||
    routePrefixesWithoutSidebar.some((prefix) => pathname.startsWith(prefix))

  if (shouldUseEmptyLayout) {
    return <EmptyLayout>{children}</EmptyLayout>
  }

  return <Layout>{children}</Layout>
}

