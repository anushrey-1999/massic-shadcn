'use client'

import { useAuthStore } from '@/store/auth-store'
import AgencySidebar from './app-sidebar'
import SingleBusinessSidebar from './single-business-sidebar'
import { USER_ROLE_IDS } from '@/lib/user-roles'

export default function AppSidebar() {
  const { user } = useAuthStore()
  const isSingleBusinessUser = user?.roleid === USER_ROLE_IDS.BUSINESS

  if (isSingleBusinessUser) {
    return <SingleBusinessSidebar />
  }

  return <AgencySidebar />
}
