'use client'

import React, { useEffect, useState } from 'react'
import { Home, LineChart, Settings, Bell, LogOut, Plus, Search, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useLogout } from '@/hooks/use-auth'
import { useBusinessProfiles } from '@/hooks/use-business-profiles'
import { useAuthStore } from '@/store/auth-store'
import { useBusinessStore } from '@/store/business-store'
import { toast } from 'sonner'
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'

const FAVICON_URL = 'https://www.google.com/s2/favicons?domain='

interface BusinessIconProps {
  website?: string
  name?: string
}

function BusinessIcon({ website, name }: BusinessIconProps) {
  const [imgError, setImgError] = useState(false)
  const fallbackInitial = name?.charAt(0).toUpperCase() || 'B'

  if (!website || imgError) {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border border-dashed border-black dark:border-white text-[9px] text-sidebar-foreground">
        {fallbackInitial}
      </div>
    )
  }

  return (
    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs overflow-hidden bg-sidebar-accent">
      <img
        src={`${FAVICON_URL}${website}`}
        alt=""
        width={16}
        height={16}
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
}

function NavItem({ href, icon: Icon, label, isActive }: NavItemProps) {
  return (
    <SidebarMenuItem>
      <div className="relative">
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-black dark:bg-white rounded-r-full z-10" />
        )}
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className="py-4.5 pl-4 cursor-pointer"
        >
          <Link href={href}>
            <Icon className="h-5 w-5" />
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
            className="py-4.5 pl-4 cursor-pointer w-full"
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </SidebarMenuButton>
        ) : (
          <SidebarMenuButton
            asChild
            isActive={isActive}
            className="py-4.5 pl-4 cursor-pointer"
          >
            <Link href={href!}>
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          </SidebarMenuButton>
        )}
      </div>
    </SidebarMenuItem>
  )
}

export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useLogout()
  const { user } = useAuthStore()

  const {
    profiles,
    sidebarDataLoading,
    expandedBusinessId,
  } = useBusinessProfiles()

  const setExpandedBusinessId = useBusinessStore((state) => state.setExpandedBusinessId)

  const navItems = [
    {
      href: '/',
      icon: Home,
      label: 'Home',
    },
    {
      href: '/proposals',
      icon: LineChart,
      label: 'Proposal',
    },
  ]

  const userName = user?.username || user?.email || 'User'

  const businessSubItems = [
    { label: 'Analytics', slug: 'analytics' },
    { label: 'Strategy', slug: 'strategy' },
    { label: 'Actions', slug: 'actions' },
    { label: 'Reviews', slug: 'reviews' },
    { label: 'Profile', slug: 'profile' },
  ]

  const isBusinessRoute = pathname.startsWith('/business/')

  useEffect(() => {
    if (!isBusinessRoute) {
      if (expandedBusinessId !== null) {
        setExpandedBusinessId(null)
      }
    } else {
      const businessIdMatch = pathname.match(/^\/business\/([^/]+)/)
      if (businessIdMatch) {
        const businessUniqueId = businessIdMatch[1]
        const matchingBusiness = profiles.find(
          (p) => p.UniqueId === businessUniqueId
        )
        if (matchingBusiness && expandedBusinessId !== matchingBusiness.UniqueId) {
          setExpandedBusinessId(matchingBusiness.UniqueId)
        }
      }
    }
  }, [pathname, isBusinessRoute, profiles, expandedBusinessId])

  const toggleBusiness = (uniqueId: string, open: boolean) => {
    setExpandedBusinessId(open ? uniqueId : null)
    if (open) {
      router.push(`/business/${uniqueId}/analytics`)
    }
  }

  const handleLogout = async () => {
    try {
      await logout.mutateAsync()
      toast.success('Logged out successfully')
      router.push('/login')
    } catch (error) {
      // Error is handled in the hook (onError clears local state)
      // Still show success message and redirect since local state is cleared
      toast.success('Logged out successfully')
      router.push('/login')
    }
  }

  const footerItems = [
    {
      href: '/settings',
      icon: Settings,
      label: 'Settings',
    },
    {
      href: '/notifications',
      icon: Bell,
      label: 'Notifications',
    },
    {
      icon: LogOut,
      label: 'Logout',
      onClick: handleLogout,
    },
  ]

  return (
    <Sidebar collapsible="none" className="h-screen bg-white">
      <SidebarHeader className="border-b border-sidebar-border shrink-0">
        <div className="px-4 py-4.5">
          <h1 className="text-lg font-semibold text-foreground">Massic</h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1 flex flex-col overflow-hidden">
        <SidebarGroup className="px-1 shrink-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={pathname === item.href}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="shrink-0" />

        <SidebarGroup className="px-1 flex-1 flex flex-col overflow-hidden">
          <div className="relative flex items-center justify-between px-4 py-2 shrink-0">
            <SidebarGroupLabel className="px-0 flex-1">
              Businesses
            </SidebarGroupLabel>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => router.push('/create-business')}
                className="text-sidebar-foreground ring-sidebar-ring bg-sidebar-accent hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground flex aspect-square w-6 items-center justify-center rounded-md p-0 outline-hidden transition-colors focus-visible:ring-2 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="text-sidebar-foreground ring-sidebar-ring bg-sidebar-accent hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground flex aspect-square w-6 items-center justify-center rounded-md p-0 outline-hidden transition-colors focus-visible:ring-2 cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <SidebarGroupContent className="flex-1 overflow-y-auto">
            <SidebarMenu className="gap-1">
              {sidebarDataLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <SidebarMenuItem key={i}>
                      <div className="flex items-center gap-2 py-4.5 pl-4">
                        <Skeleton className="h-4 w-4 rounded-xs" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </SidebarMenuItem>
                  ))}
                </>
              ) : profiles.length === 0 ? (
                <SidebarMenuItem>
                  <div className="py-4 pl-4 text-sm text-muted-foreground">
                    No businesses found
                  </div>
                </SidebarMenuItem>
              ) : (
                profiles.map((business) => {
                  const isOpen = expandedBusinessId === business.UniqueId
                  const hasActiveSubItem = businessSubItems.some((subItem) => {
                    const subItemHref = `/business/${business.UniqueId}/${subItem.slug}`
                    return pathname === subItemHref
                  })
                  return (
                    <Collapsible
                      key={business.UniqueId}
                      open={isOpen}
                      onOpenChange={(open) => toggleBusiness(business.UniqueId, open)}
                    >
                      <SidebarMenuItem>
                        <div className="relative">
                          {hasActiveSubItem && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-black dark:bg-white rounded-r-full z-10" />
                          )}
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              isActive={hasActiveSubItem}
                              className="py-4.5 pl-4 group/business w-full justify-between cursor-pointer overflow-hidden"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <BusinessIcon website={business.Website} name={business.Name} />
                                <span className="truncate" title={business.Name || business.DisplayName}>{business.Name || business.DisplayName}</span>
                              </div>
                              <ChevronRight className={`shrink-0 ml-auto h-4 w-4 opacity-0 group-hover/business:opacity-100 transition-all duration-200 ${isOpen ? 'rotate-90 opacity-100' : ''}`} />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                          <SidebarMenuSub className="ml-5 border-l-2 border-sidebar-border">
                            {businessSubItems.map((subItem) => {
                              const subItemHref = `/business/${business.UniqueId}/${subItem.slug}`
                              const isActive = pathname === subItemHref
                              return (
                                <SidebarMenuSubItem key={subItem.slug}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isActive}
                                    className="cursor-pointer py-4"
                                  >
                                    <Link href={subItemHref}>
                                      <span className="pl-2">{subItem.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                })
              )}
            </SidebarMenu>
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
  )
}
