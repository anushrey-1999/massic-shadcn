'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { isAgentRoute, isBusinessProfileRoute, usesEmptyLayout } from '@/lib/layout-config'
import { DeveloperModeProvider } from '@/features/developer-mode/developer-mode-provider'
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
  const isArchitecturePreview = /^\/business\/[^/]+\/web\/architecture\/[^/]+\/view\/?$/.test(pathname)

  if (usesEmptyLayout(pathname)) {
    return <EmptyLayout>{children}</EmptyLayout>
  }

  return (
    <DeveloperModeProvider pathname={pathname}>
      <Layout fill={fillViewport} hideSidebarOnMobile={isArchitecturePreview}>{children}</Layout>
    </DeveloperModeProvider>
  )
}
