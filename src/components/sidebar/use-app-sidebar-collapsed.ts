'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isAgentRoute } from '@/lib/layout-config'

export function useAppSidebarCollapsed() {
  const pathname = usePathname()
  const isAgentPage = isAgentRoute(pathname)
  const [isCollapsed, setIsCollapsed] = useState(isAgentPage)
  const wasAgentPage = useRef(isAgentPage)

  useEffect(() => {
    if (isAgentPage === wasAgentPage.current) return
    setIsCollapsed(isAgentPage)
    wasAgentPage.current = isAgentPage
  }, [isAgentPage])

  return [isCollapsed, setIsCollapsed] as const
}
