'use client'

import React from 'react'
import { LogOut, BarChart3, User, Link2, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLogout } from '@/hooks/use-auth'
import { useBusinessProfiles } from '@/hooks/use-business-profiles'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'
import { isBusinessAnalyticsRoute, isBusinessProfileRoute } from '@/lib/business-navigation'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAppSidebarCollapsed } from './use-app-sidebar-collapsed'
import { BusinessIcon, FooterAction, NavItem, SIDEBAR_ITEM_CLASS } from './sidebar-nav-items'

export default function SingleBusinessSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useLogout()
  const { user } = useAuthStore()

  const { profiles, sidebarDataLoading } = useBusinessProfiles()

  const [isCollapsed, setIsCollapsed] = useAppSidebarCollapsed()
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false)

  const userName = user?.username || user?.email || 'User'
  const business = profiles[0]
  const businessName = business?.Name || business?.DisplayName || 'Your business'

  const confirmLogout = async () => {
    await logout.mutateAsync().catch(() => undefined)
    toast.success('Logged out successfully')
    router.push('/login')
    setShowLogoutDialog(false)
  }

  const renderBusiness = () => {
    if (sidebarDataLoading) {
      return (
        <SidebarMenu className="gap-2">
          {[1, 2, 3].map((i) => (
            <SidebarMenuItem key={i}>
              <div className={cn('flex items-center gap-2 py-2', isCollapsed ? 'justify-center' : 'pl-3')}>
                <Skeleton className="h-4 w-4 rounded-xs shrink-0" />
                {!isCollapsed && <Skeleton className="h-4 w-24" />}
              </div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      )
    }

    if (!business) {
      return (
        <SidebarMenu className="gap-2">
          <NavItem
            href="/signup"
            icon={Link2}
            label="Finish setup"
            isActive={pathname === '/signup'}
            isCollapsed={isCollapsed}
          />
        </SidebarMenu>
      )
    }

    const analyticsHref = `/business/${business.UniqueId}/analytics`

    return (
      <SidebarMenu className="gap-2">
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            className={cn(SIDEBAR_ITEM_CLASS, isCollapsed ? 'justify-center pl-0' : 'pl-3')}
            title={businessName}
          >
            <Link href={analyticsHref}>
              <BusinessIcon website={business.Website} name={businessName} />
              {!isCollapsed && (
                <span className="truncate font-medium text-general-unofficial-foreground-alt">
                  {businessName}
                </span>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <NavItem
          href={analyticsHref}
          icon={BarChart3}
          label="Analytics"
          isActive={isBusinessAnalyticsRoute(pathname, business.UniqueId)}
          isCollapsed={isCollapsed}
        />
        <NavItem
          href={`/business/${business.UniqueId}/profile`}
          icon={User}
          label="Profile"
          isActive={isBusinessProfileRoute(pathname, business.UniqueId)}
          isCollapsed={isCollapsed}
        />
      </SidebarMenu>
    )
  }

  return (
    <>
      <div className="relative h-svh shrink-0">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute top-4 -right-3 z-30 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground-light border border-general-border hover:bg-general-border transition-colors cursor-pointer shadow-sm"
        >
          {isCollapsed
            ? <ChevronRight className="h-4 w-4" />
            : <ChevronLeft className="h-4 w-4" />
          }
        </button>
        <Sidebar
          collapsible="none"
          className="h-screen bg-foreground-light py-3 overflow-x-hidden transition-[width] duration-200"
          style={{ width: isCollapsed ? '3.5rem' : undefined }}
        >
          <SidebarHeader className={cn('shrink-0 pb-3', isCollapsed ? 'px-0' : 'px-4')}>
            <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'justify-start')}>
              {isCollapsed ? (
                <img src="/massic-logo-green.svg" alt="Massic" className="h-6 w-6 opacity-60" style={{ filter: 'brightness(0)' }} />
              ) : (
                <h1 className="text-lg font-semibold text-foreground">Massic</h1>
              )}
            </div>
          </SidebarHeader>

          <div className={cn(isCollapsed ? 'px-1' : 'px-4')}>
            <Separator className="bg-general-border" />
          </div>

          <SidebarContent className="flex-1 flex flex-col overflow-hidden gap-0">
            <SidebarGroup className={cn('py-3', isCollapsed ? 'px-1' : 'px-4')}>
              {!isCollapsed && (
                <div className="flex items-center justify-between py-3">
                  <SidebarGroupLabel className="h-auto px-0 text-xs text-general-muted-foreground">
                    Business
                  </SidebarGroupLabel>
                  <span className="rounded-sm bg-general-border px-1.5 py-0.5 text-[11px] font-medium text-general-muted-foreground">
                    Free
                  </span>
                </div>
              )}
              <SidebarGroupContent>{renderBusiness()}</SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <div className={cn(isCollapsed ? 'px-1' : 'px-4')}>
            <Separator className="bg-general-border" />
          </div>

          <SidebarFooter className={cn('pt-3 pb-0 shrink-0', isCollapsed ? 'px-1' : 'px-4')}>
            {!isCollapsed && (
              <div className="mb-1">
                <p className="truncate text-sm font-medium text-general-muted-foreground">{userName}</p>
              </div>
            )}
            <SidebarMenu>
              <FooterAction
                icon={LogOut}
                label="Logout"
                isActive={false}
                onClick={() => setShowLogoutDialog(true)}
                className="text-general-muted-foreground"
                isCollapsed={isCollapsed}
              />
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Logout</DialogTitle>
              <DialogDescription>
                Are you sure you want to log out of your account?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmLogout} disabled={logout.isPending}>
                Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
