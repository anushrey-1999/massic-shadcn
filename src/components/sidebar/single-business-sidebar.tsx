
'use client'
import React from 'react'
import { Settings, Bell, LogOut, BarChart3, Target, Star, User, Link2, Globe, Tv, Share2, FileText } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLogout } from '@/hooks/use-auth'
import { useBusinessProfiles } from '@/hooks/use-business-profiles'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'
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
}

function NavItem({ href, icon: Icon, label, isActive, disabled, onClick }: NavItemProps) {
  if (disabled) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          disabled
          className="py-4 pl-4 opacity-40 cursor-not-allowed"
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <div className="relative">
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-black dark:bg-white rounded-r-full z-10" />
        )}
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className="py-4 pl-4 cursor-pointer"
          onClick={onClick}
        >
          <Link href={href}>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
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
}

function FooterAction({ href, icon: Icon, label, isActive, onClick }: FooterActionProps) {
  return (
    <SidebarMenuItem>
      <div className="relative">
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-black dark:bg-white rounded-r-full z-10" />
        )}
        {onClick ? (
          <SidebarMenuButton
            onClick={onClick}
            isActive={isActive}
            className="py-4 pl-4 cursor-pointer w-full"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </SidebarMenuButton>
        ) : (
          <SidebarMenuButton
            asChild
            isActive={isActive}
            className="py-4 pl-4 cursor-pointer"
          >
            <Link href={href!}>
              <Icon className="h-4 w-4" />
              <span>{label}</span>
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

  const userName = user?.username || user?.email || 'User'

  // For single business users, we only show the first business
  const business = profiles[0]
  const hasBusinessConnected = !!business

  const businessNavItems = [
    { label: 'Analytics', slug: 'analytics', icon: BarChart3 },
    { label: 'Strategy', slug: 'strategy', icon: Target },
    { label: 'Actions', slug: 'actions', icon: Tv },
    { label: 'Web', slug: 'web', icon: Globe },
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
        <div className="px-4 space-y-3">
          <div className="flex items-center gap-3 py-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-4 w-32" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2 py-2 pl-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      )
    }

    if (!hasBusinessConnected) {
      return (
        <div className="px-2">
          {/* Connect Business CTA */}
          <SidebarMenuItem className="mb-2">
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

          <SidebarSeparator className="my-3" />

          {/* Disabled menu items */}
          <SidebarMenu className="gap-0.5">
            {businessNavItems.map((item) => (
              <NavItem
                key={item.slug}
                href="#"
                icon={item.icon}
                label={item.label}
                isActive={false}
                disabled={true}
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
                />
              )
            })}
          </SidebarMenu>
        </div>
      )
    }

    return (
      <div className="px-2">
        {/* Business Header */}
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

        {/* Business Navigation */}
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
              />
            )
          })}
        </SidebarMenu>
      </div>
    )
  }

  return (
    <>
      <Sidebar collapsible="none" className="h-screen bg-white">
        <SidebarHeader className="border-b border-sidebar-border shrink-0">
          <div className="px-4 py-4.5">
            <h1 className="text-lg font-semibold text-foreground">Massic</h1>
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
          <div className="mb-1 px-4">
            <p className="text-sm font-medium text-foreground">{userName}</p>
          </div>
          <SidebarMenu className="gap-1">
            {footerItems.map((item) => (
              <FooterAction
                key={item.label}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={item.href ? pathname === item.href : false}
                onClick={item.onClick}
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
    </>
  )
}
