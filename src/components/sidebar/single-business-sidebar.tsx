
'use client'
import React from 'react'
import { Settings, Bell, LogOut, BarChart3, Target, Star, User, Link2, Globe, Tv, Share2, FileText, Wrench, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLogout } from '@/hooks/use-auth'
import { useBusinessProfiles } from '@/hooks/use-business-profiles'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const FAVICON_URL = 'https://www.google.com/s2/favicons?domain='

interface BusinessIconProps {
  website?: string
  name?: string
  size?: 'sm' | 'md'
}

function BusinessIcon({ website, name, size = 'sm' }: BusinessIconProps) {
  const [imgError, setImgError] = React.useState(false)
  const fallbackInitial = name?.charAt(0).toUpperCase() || 'B'
  const sizeClasses = size === 'sm' ? 'h-5 w-5' : 'h-8 w-8'
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-sm'

  if (!website || imgError) {
    return (
      <div className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-md border border-dashed border-black dark:border-white ${textSize} font-medium text-sidebar-foreground`}>
        {fallbackInitial}
      </div>
    )
  }

  return (
    <div className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-md overflow-hidden bg-sidebar-accent`}>
      <img
        src={`${FAVICON_URL}${website}`}
        alt=""
        width={size === 'sm' ? 20 : 32}
        height={size === 'sm' ? 20 : 32}
        className="h-full w-full object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  )
}

interface NavItemProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive: boolean
  disabled?: boolean
  onClick?: () => void
  isCollapsed?: boolean
}

function NavItem({ href, icon: Icon, label, isActive, disabled, onClick, isCollapsed }: NavItemProps) {
  if (disabled) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          disabled
          className={cn('py-4 opacity-40 cursor-not-allowed', isCollapsed ? 'justify-center pl-0' : 'pl-4')}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>{label}</span>}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <div className="relative">
        {isActive && !isCollapsed && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-black dark:bg-white rounded-r-full z-10" />
        )}
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className={cn('py-4 cursor-pointer', isCollapsed ? 'justify-center pl-0' : 'pl-4')}
          onClick={onClick}
        >
          <Link href={href}>
            <Icon className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{label}</span>}
          </Link>
        </SidebarMenuButton>
      </div>
    </SidebarMenuItem>
  )
}

interface FooterActionProps {
  href?: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive: boolean
  onClick?: () => void
  isCollapsed?: boolean
}

function FooterAction({ href, icon: Icon, label, isActive, onClick, isCollapsed }: FooterActionProps) {
  return (
    <SidebarMenuItem>
      <div className="relative">
        {isActive && !isCollapsed && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-black dark:bg-white rounded-r-full z-10" />
        )}
        {onClick ? (
          <SidebarMenuButton
            onClick={onClick}
            isActive={isActive}
            className={cn('py-4 cursor-pointer w-full', isCollapsed ? 'justify-center pl-0' : 'pl-4')}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{label}</span>}
          </SidebarMenuButton>
        ) : (
          <SidebarMenuButton
            asChild
            isActive={isActive}
            className={cn('py-4 cursor-pointer', isCollapsed ? 'justify-center pl-0' : 'pl-4')}
          >
            <Link href={href!}>
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{label}</span>}
            </Link>
          </SidebarMenuButton>
        )}
      </div>
    </SidebarMenuItem>
  )
}

export default function SingleBusinessSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useLogout()
  const { user } = useAuthStore()

  const { profiles, sidebarDataLoading } = useBusinessProfiles()

  const [isCollapsed, setIsCollapsed] = React.useState(false)

  const userName = user?.username || user?.email || 'User'

  const business = profiles[0]
  const hasBusinessConnected = !!business

  const businessNavItems = [
    { label: 'Analytics', slug: 'analytics', icon: BarChart3 },
    { label: 'Strategy', slug: 'strategy', icon: Target },
    { label: 'Actions', slug: 'actions', icon: Tv },
    { label: 'Web', slug: 'web', icon: Globe },
    { label: 'Technical Audit', slug: 'technical-audit', icon: Wrench },
    { label: 'Social', slug: 'social', icon: Share2 },
    { label: 'Reviews', slug: 'reviews', icon: Star },
    { label: 'Profile', slug: 'profile', icon: User },
  ]

  const isBusinessRoute = pathname.startsWith('/business/')
  const pitchBusinessId = React.useMemo(() => {
    const parts = pathname.split('/').filter(Boolean)
    if (parts[0] !== 'pitches') return null
    if (!parts[1] || parts[1] === 'create-pitch') return null
    return parts[1]
  }, [pathname])
  const isPitchBusinessRoute = pitchBusinessId !== null

  const pitchNavItems = [
    { label: 'Reports', slug: 'reports', icon: FileText },
    { label: 'Strategy', slug: 'strategy', icon: Target },
    { label: 'Web', slug: 'web', icon: Globe },
    { label: 'Social', slug: 'social', icon: Share2 },
    { label: 'Profile', slug: 'profile', icon: User },
  ] as const


  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false)

  const confirmLogout = async () => {
    try {
      await logout.mutateAsync()
      toast.success('Logged out successfully')
      router.push('/login')
    } catch (error) {
      toast.success('Logged out successfully')
      router.push('/login')
    }
    setShowLogoutDialog(false)
  }

  const handleLogout = () => {
    setShowLogoutDialog(true)
  }

  const footerItems = [
    { href: '/settings', icon: Settings, label: 'Settings' },
    { href: '/notifications', icon: Bell, label: 'Notifications' },
    { icon: LogOut, label: 'Logout', onClick: handleLogout },
  ]

  const renderBusinessSection = () => {
    if (sidebarDataLoading) {
      return (
        <div className={cn('space-y-3', isCollapsed ? 'px-1' : 'px-4')}>
          <div className={cn('flex items-center gap-3 py-2', isCollapsed && 'justify-center')}>
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            {!isCollapsed && <Skeleton className="h-4 w-32" />}
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={cn('flex items-center gap-2 py-2', isCollapsed ? 'justify-center' : 'pl-2')}>
              <Skeleton className="h-4 w-4 rounded shrink-0" />
              {!isCollapsed && <Skeleton className="h-4 w-20" />}
            </div>
          ))}
        </div>
      )
    }

    if (!hasBusinessConnected) {
      return (
        <div className="px-2">
          {isCollapsed ? (
            <SidebarMenuItem className="mb-2 list-none">
              <SidebarMenuButton
                asChild
                className="py-4 justify-center cursor-pointer bg-primary/5 hover:bg-primary/10 border border-dashed border-primary/30 rounded-lg"
              >
                <Link href="/settings">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
                    <Link2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem className="mb-2 list-none">
              <SidebarMenuButton
                asChild
                className="py-4 pl-3 cursor-pointer bg-primary/5 hover:bg-primary/10 border border-dashed border-primary/30 rounded-lg"
              >
                <Link href="/settings" className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
                    <Link2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">Connect Business</span>
                    <span className="text-xs text-muted-foreground">Link your Google accounts</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {!isCollapsed && <SidebarSeparator className="my-3" />}

          <SidebarMenu className="gap-0.5">
            {businessNavItems.map((item) => (
              <NavItem
                key={item.slug}
                href="#"
                icon={item.icon}
                label={item.label}
                isActive={false}
                disabled={true}
                isCollapsed={isCollapsed}
              />
            ))}
          </SidebarMenu>
        </div>
      )
    }

    if (isPitchBusinessRoute && pitchBusinessId) {
      return (
        <div className="px-2">
          <SidebarMenu className="gap-0.5">
            {pitchNavItems.map((item) => {
              const itemHref =
                item.slug === 'reports'
                  ? `/pitches/${pitchBusinessId}/reports?view=cards`
                  : `/pitches/${pitchBusinessId}/${item.slug}`
              const reportsPath = `/pitches/${pitchBusinessId}/reports`
              const itemBasePath = `/pitches/${pitchBusinessId}/${item.slug}`

              let isActive = false
              if (item.slug === 'reports') {
                isActive =
                  pathname.startsWith(reportsPath) ||
                  pathname.startsWith(`/pitches/${pitchBusinessId}/summary`)
              } else {
                isActive = pathname.startsWith(itemBasePath)
              }

              return (
                <NavItem
                  key={item.slug}
                  href={itemHref}
                  icon={item.icon}
                  label={item.label}
                  isActive={isActive}
                  isCollapsed={isCollapsed}
                />
              )
            })}
          </SidebarMenu>
        </div>
      )
    }

    return (
      <div className="px-2">
        {isCollapsed ? (
          <div className={cn(
            'flex justify-center py-2 mb-2 mx-1 rounded-md',
            isBusinessRoute && 'bg-sidebar-accent'
          )}>
            <BusinessIcon website={business.Website} name={business.Name} size="md" />
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-sidebar-accent/50">
            <BusinessIcon website={business.Website} name={business.Name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate" title={business.Name || business.DisplayName}>
                {business.Name || business.DisplayName}
              </p>
              {business.Website && (
                <p className="text-xs text-muted-foreground truncate">
                  {business.Website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </p>
              )}
            </div>
          </div>
        )}

        <SidebarMenu className="gap-0.5">
          {businessNavItems.map((item) => {
            const itemHref = `/business/${business.UniqueId}/${item.slug}`
            const reportsPath = `/business/${business.UniqueId}/reports`
            const organicDeepdivePath = `/business/${business.UniqueId}/organic-deepdive`

            const itemBasePath = `/business/${business.UniqueId}/${item.slug}`
            let isActive = false
            if (item.slug === 'analytics') {
              isActive =
                pathname === itemHref ||
                pathname.startsWith(reportsPath) ||
                pathname.startsWith(organicDeepdivePath)
            } else if (item.slug === 'profile') {
              isActive = pathname === itemHref
            } else {
              isActive = pathname.startsWith(itemBasePath)
            }
            return (
              <NavItem
                key={item.slug}
                href={itemHref}
                icon={item.icon}
                label={item.label}
                isActive={isActive}
                isCollapsed={isCollapsed}
              />
            )
          })}
        </SidebarMenu>
      </div>
    )
  }

  return (
    <>
      <div className="relative h-svh shrink-0">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-4 -right-3 z-30 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white border border-sidebar-border hover:bg-sidebar-accent transition-colors cursor-pointer shadow-sm"
        >
          {isCollapsed
            ? <ChevronRight className="h-4 w-4" />
            : <ChevronLeft className="h-4 w-4" />
          }
        </button>
        <Sidebar
          collapsible="none"
          className="h-screen bg-white overflow-x-hidden transition-[width] duration-200"
          style={{ width: isCollapsed ? '3.5rem' : undefined }}
        >
          <SidebarHeader className="border-b border-sidebar-border shrink-0">
            <div className={cn('flex items-center py-4', isCollapsed ? 'justify-center px-2' : 'justify-start px-4')}>
              {isCollapsed ? (
                <img src="/massic-logo-green.svg" alt="Massic" className="h-6 w-6 opacity-60" style={{ filter: 'brightness(0)' }} />
              ) : (
                <h1 className="text-lg font-semibold text-foreground">Massic</h1>
              )}
            </div>
          </SidebarHeader>

        <SidebarContent className="flex-1 flex flex-col overflow-hidden">
          <SidebarGroup className="px-1 flex-1 flex flex-col overflow-hidden pt-4">
            <SidebarGroupContent className="flex-1 overflow-y-auto">
              {renderBusinessSection()}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="px-1 py-5 shrink-0">
          {!isCollapsed && (
            <div className="mb-1 px-4">
              <p className="text-sm font-medium text-foreground">{userName}</p>
            </div>
          )}
          <SidebarMenu className="gap-1">
            {footerItems.map((item) => (
              <FooterAction
                key={item.label}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={item.href ? pathname === item.href : false}
                onClick={item.onClick}
                isCollapsed={isCollapsed}
              />
            ))}
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
            <Button variant="destructive" onClick={confirmLogout}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
