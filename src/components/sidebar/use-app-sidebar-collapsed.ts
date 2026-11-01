'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isAgentRoute } from '@/lib/layout-config'

const AGENT_WORKSPACE_EVENT = 'massic-agent-workspace-change'

export function useAppSidebarCollapsed() {
  const pathname = usePathname()
  const isAgentPage = isAgentRoute(pathname)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (!isAgentPage) {
      setIsCollapsed(false)
      return
    }

    const syncAgentWorkspace = () => {
      setIsCollapsed(document.documentElement.dataset.massicAgentWorkspace === 'active')
    }

    syncAgentWorkspace()
    window.addEventListener(AGENT_WORKSPACE_EVENT, syncAgentWorkspace)
    return () => window.removeEventListener(AGENT_WORKSPACE_EVENT, syncAgentWorkspace)
  }, [isAgentPage])

  return [isCollapsed, setIsCollapsed] as const
}
