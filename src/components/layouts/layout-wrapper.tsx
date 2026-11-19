'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { routesWithoutSidebar, routePrefixesWithoutSidebar, isAgentRoute, isBusinessProfileRoute } from '@/lib/layout-config'
import Layout from './layout'
import EmptyLayout from './empty-layout'
import { useIsFreeBusinessAccount } from '@/hooks/use-is-free-business-account'

function isAllowedFreeBusinessPath(pathname: string) {
  if (pathname === '/' || pathname === '/signup' || pathname === '/signin-google') {
    return true
  }
  return /^\/business\/[^/]+\/(analytics(?:\/.*)?|indexing(?:\/.*)?|organic-deepdive(?:\/.*)?|reports(?:\/.*)?|profile\/?)$/.test(pathname)
}

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isFreeBusinessAccount = useIsFreeBusinessAccount()
  const freeBusinessPathAllowed =
    !isFreeBusinessAccount || isAllowedFreeBusinessPath(pathname)

  useEffect(() => {
    if (!freeBusinessPathAllowed) router.replace('/')
  }, [freeBusinessPathAllowed, router])

  if (!freeBusinessPathAllowed) return null

  const fillViewport = isAgentRoute(pathname) || isBusinessProfileRoute(pathname)
  const shouldUseEmptyLayout =
    routesWithoutSidebar.includes(pathname) ||
    routePrefixesWithoutSidebar.some((prefix) => pathname.startsWith(prefix))

  if (shouldUseEmptyLayout) {
    return <EmptyLayout>{children}</EmptyLayout>
  }

  return <Layout fill={fillViewport}>{children}</Layout>
}
