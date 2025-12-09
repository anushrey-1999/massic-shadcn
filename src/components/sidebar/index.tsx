'use client'

import { useAuthStore } from '@/store/auth-store'
import AgencySidebar from './app-sidebar'
import SingleBusinessSidebar from './single-business-sidebar'

const SINGLE_BUSINESS_ROLE_ID = 4

export default function AppSidebar() {
  const { user } = useAuthStore()
  const isSingleBusinessUser = user?.roleid === SINGLE_BUSINESS_ROLE_ID

  if (isSingleBusinessUser) {
    return <SingleBusinessSidebar />
  }

  return <AgencySidebar />
}
