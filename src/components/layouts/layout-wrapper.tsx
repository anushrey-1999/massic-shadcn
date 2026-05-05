'use client'

import { usePathname } from 'next/navigation'
import { routePrefixesWithoutSidebar, routesWithoutSidebar } from '@/lib/layout-config'
import Layout from './layout'
import EmptyLayout from './empty-layout'

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const shouldUseEmptyLayout =
    routesWithoutSidebar.includes(pathname) ||
    routePrefixesWithoutSidebar.some((routePrefix) => pathname.startsWith(routePrefix))

  if (shouldUseEmptyLayout) {
    return <EmptyLayout>{children}</EmptyLayout>
  }

  return <Layout>{children}</Layout>
}

