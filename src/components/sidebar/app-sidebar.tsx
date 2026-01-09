'use client'

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Home, LineChart, Settings, Bell, LogOut, Plus, Search, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useLogout } from '@/hooks/use-auth'
import { useBusinessProfiles } from '@/hooks/use-business-profiles'
import { useAuthStore } from '@/store/auth-store'
import { useBusinessStore } from '@/store/business-store'
import { useScrollBlurEffect } from '@/hooks/use-scroll-blur-effect'
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
import { Input } from '@/components/ui/input'
import { normalizeDomainForFavicon } from '@/utils/utils'

const FAVICON_URL = 'https://www.google.com/s2/favicons?domain='

interface BusinessIconProps {
  website?: string
  name?: string
}
function BusinessIcon({ website, name }: BusinessIconProps) {
  const [imgError, setImgError] = useState(false)
  const fallbackInitial = name?.charAt(0).toUpperCase() || 'B'

  const normalizedDomain = normalizeDomainForFavicon(website)

  if (!normalizedDomain || imgError) {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border border-dashed border-black dark:border-white text-[9px] font-medium text-sidebar-foreground aspect-square">
        {fallbackInitial}
      </div>
    )
  }

  return (
    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs overflow-hidden bg-sidebar-accent aspect-square">
      <img
        src={`${FAVICON_URL}${normalizedDomain}`}
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
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className="py-4 pl-3 cursor-pointer hover:bg-general-border hover:text-general-unofficial-foreground-alt data-[active=true]:bg-general-border data-[active=true]:text-general-unofficial-foreground-alt"
      >
        <Link href={href}>
          <Icon className="h-5 w-5" />
          <span className="font-medium text-general-unofficial-foreground-alt">{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

interface FooterActionProps {
  href?: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive: boolean
  onClick?: () => void
  className?: string
}

function FooterAction({ href, icon: Icon, label, isActive, onClick, className }: FooterActionProps) {
  const isLogout = label === 'Logout'
  const labelClassName = isLogout
    ? 'transition-colors group-hover:text-general-unofficial-foreground-alt'
    : 'text-general-unofficial-foreground-alt'
  return (
    <SidebarMenuItem>
      {onClick ? (
        <SidebarMenuButton
          onClick={onClick}
          isActive={isActive}
          className={`group py-4 pl-3 cursor-pointer w-full hover:bg-general-border data-[active=true]:bg-general-border ${className ?? ''}`}
        >
          <Icon className="h-5 w-5" />
          <span className={labelClassName}>{label}</span>
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className={`group py-4 pl-3 cursor-pointer hover:bg-general-border data-[active=true]:bg-general-border ${className ?? ''}`}
        >
          <Link href={href!}>
            <Icon className="h-5 w-5" />
            <span className={labelClassName}>{label}</span>
          </Link>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  )
}


export default function AppSidebar() {
  // ...existing code...
  const pathname = usePathname()
  const router = useRouter()
  const logout = useLogout()
  const { user } = useAuthStore()

  const businessesScrollRef = useRef<HTMLDivElement>(null)

  const {
    profiles,
    sidebarDataLoading,
    expandedBusinessId,
  } = useBusinessProfiles()

  const setExpandedBusinessId = useBusinessStore((state) => state.setExpandedBusinessId)
  // Scroll active business into view on mount or when expandedBusinessId changes
  useEffect(() => {
    if (!expandedBusinessId || sidebarDataLoading) return;
    // Defer scroll until after DOM update
    const timeout = setTimeout(() => {
      const container = businessesScrollRef.current;
      if (!container) return;
      const target = container.querySelector<HTMLElement>(`[data-business-id="${expandedBusinessId}"]`);
      if (!target) return;
      if (!isFullyVisible(container, target)) {
        smoothScrollToCenter(container, target);
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [expandedBusinessId, sidebarDataLoading]);

  // Search state
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Scroll blur effect hook
  const { handleScroll, blurEffectClassName, blurEffectStyle } = useScrollBlurEffect({ fadeZone: 60 })

  const navItems = [
    {
      href: '/',
      icon: Home,
      label: 'Home',
    },
    // {
    //   href: '/proposals',
    //   icon: LineChart,
    //   label: 'Proposal',
    // },
    {
      href: '/pitches',
      icon: LineChart,
      label: 'Pitches',
    },
  ]

  const userName = user?.username || user?.email || 'User'

  const businessSubItems = [
    { label: 'Analytics', slug: 'analytics' },
    { label: 'Strategy', slug: 'strategy' },
    { label: 'Web', slug: 'web' },
    { label: 'Social', slug: 'social' },
    { label: 'Ads', slug: 'ads' },
    { label: 'Reviews', slug: 'reviews' },
    { label: 'Profile', slug: 'profile' },
  ]

  // Filter businesses based on search query
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles

    return profiles.filter(business =>
      (business.Name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (business.DisplayName?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [profiles, searchQuery])

  const isBusinessRoute = pathname.startsWith('/business/')

  useEffect(() => {

    // Utility: check if an element is fully visible in a scroll container
    // (moved helpers to component scope)
  }, [])

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

  // Utility: check if an element is fully visible in a scroll container
  const isFullyVisible = (container: HTMLElement, target: HTMLElement) => {
    const cTop = container.scrollTop
    const cBottom = cTop + container.clientHeight
    const tTop = target.offsetTop
    const tBottom = tTop + target.offsetHeight
    return tTop >= cTop && tBottom <= cBottom
  }

  // Utility: smooth scroll to center target in container
  // Scroll so the target is near the top (with a small offset)
  const smoothScrollToCenter = (container: HTMLElement, target: HTMLElement, duration = 650) => {
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    // Offset from the top (e.g., 16px)
    const offset = 16;
    const targetTopY = targetRect.top - containerRect.top + container.scrollTop - offset;
    const desiredScrollTop = Math.max(0, targetTopY);
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const nextScrollTop = Math.max(0, Math.min(maxScrollTop, desiredScrollTop));
    const start = container.scrollTop;
    const change = nextScrollTop - start;
    const startTime = performance.now();
    function easeInOutQuad(t: number) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeInOutQuad(progress);
      container.scrollTop = start + change * eased;
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  // Handler to scroll after accordion opens
  const handleBusinessAccordionOpen = useCallback((uniqueId: string, open: boolean) => {
    setExpandedBusinessId(open ? uniqueId : null)
    if (open) {
      setTimeout(() => {
        const container = businessesScrollRef.current
        if (!container) return
        const target = container.querySelector<HTMLElement>(`[data-business-id="${uniqueId}"]`)
        if (!target) return
        if (!isFullyVisible(container, target)) {
          smoothScrollToCenter(container, target)
        }
      }, 0) // Run after DOM update
    }
  }, [setExpandedBusinessId])

  const toggleBusiness = (uniqueId: string, open: boolean) => {
    handleBusinessAccordionOpen(uniqueId, open)
    if (open) {
      router.push(`/business/${uniqueId}/analytics`)
    }
  }

  const handleSearchClick = () => {
    setIsSearchMode(true)
  }

  const handleSearchClose = () => {
    setIsSearchMode(false)
    setSearchQuery('')
  }


  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const confirmLogout = async () => {
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
    setShowLogoutDialog(false)
  }

  const handleLogout = () => {
    setShowLogoutDialog(true)
  }

  const footerItems = [
    {
      href: '/settings',
      icon: Settings,
      label: 'Settings',
    },
    // {
    //   href: '/notifications',
    //   icon: Bell,
    //   label: 'Notifications',
    // },
    {
      icon: LogOut,
      label: 'Logout',
      onClick: handleLogout,
      className: 'text-general-muted-foreground',
    },
  ]

  return (
    <>
      <Sidebar collapsible="none" className="h-screen bg-foreground-light py-3">
        <SidebarHeader className="shrink-0 pb-3 px-4">
          <div className="">
            <h1 className="text-lg font-semibold text-foreground">Massic</h1>
          </div>
        </SidebarHeader>
        <SidebarContent className="flex-1 flex flex-col overflow-hidden gap-0">
          <SidebarGroup className="shrink-0 py-0 pb-3 px-4">
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
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

          <div className="px-4">
            <Separator className="bg-general-border" />
          </div>

          <SidebarGroup className="flex-1 flex flex-col overflow-hidden py-3 p-0">
            <div className="relative flex items-center justify-between shrink-0 py-3 px-4">
              {isSearchMode ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    placeholder="Search businesses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-8 text-sm"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSearchClose}
                    className="h-6 w-6 bg-foreground-light hover:bg-sidebar-accent/80 rounded-sm"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <SidebarGroupLabel className="flex-1 text-xs text-general-muted-foreground">
                    Businesses
                  </SidebarGroupLabel>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push('/create-business')}
                      className="h-6 w-6 bg-foreground-light hover:bg-sidebar-accent/80 rounded-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSearchClick}
                      className="h-6 w-6 bg-foreground-light hover:bg-sidebar-accent/80 rounded-sm"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div className="relative flex-1 overflow-hidden">
              <SidebarGroupContent
                ref={businessesScrollRef}
                className="flex-1 overflow-y-auto py-0 h-full px-0"
                onScroll={handleScroll}
              >
                <SidebarMenu className="gap-1 px-4 pb-3">
                  {sidebarDataLoading ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <SidebarMenuItem key={i}>
                          <div className="flex items-center gap-2 ">
                            <Skeleton className="h-4 w-4 rounded-xs" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </SidebarMenuItem>
                      ))}
                    </>
                  ) : filteredProfiles.length === 0 ? (
                    <SidebarMenuItem>
                      <div className=" text-sm text-muted-foreground">
                        {searchQuery ? 'No matching businesses found' : 'No businesses found'}
                      </div>
                    </SidebarMenuItem>
                  ) : (
                    filteredProfiles.map((business) => {
                      const isOpen = expandedBusinessId === business.UniqueId
                      return (
                        <Collapsible
                          key={business.UniqueId}
                          open={isOpen}
                          onOpenChange={(open) => toggleBusiness(business.UniqueId, open)}
                        >
                          <SidebarMenuItem>
                            <div className="relative">
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                  isActive={false}
                                  data-business-id={business.UniqueId}
                                  className="py-4 pl-3 group/business w-full justify-between cursor-pointer overflow-hidden rounded-md"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <BusinessIcon website={business.Website} name={business.Name} />
                                    <span className="truncate font-medium text-general-unofficial-foreground-alt" title={business.Name || business.DisplayName}>{business.Name || business.DisplayName}</span>
                                  </div>
                                  <ChevronRight className={`shrink-0 ml-auto h-4 w-4 text-general-border-three opacity-0 group-hover/business:opacity-100 transition-all duration-200 ${isOpen ? 'rotate-90 opacity-100' : ''}`} />
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent>
                              <SidebarMenuSub className="ml-5 mt-0.5 border-l-2 border-general-border">
                                {businessSubItems.map((subItem) => {
                                  const subItemHref = `/business/${business.UniqueId}/${subItem.slug}`
                                  const reportsPath = `/business/${business.UniqueId}/reports`
                                  const isActive = pathname === subItemHref || (subItem.slug === 'analytics' && pathname.startsWith(reportsPath))
                                  return (
                                    <SidebarMenuSubItem key={subItem.slug}>
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={isActive}
                                        className="w-full cursor-pointer py-4 text-general-muted-foreground hover:bg-general-border hover:text-general-unofficial-foreground-alt data-[active=true]:bg-general-border data-[active=true]:text-general-unofficial-foreground-alt"
                                      >
                                        <Link href={subItemHref}>
                                          <span>{subItem.label}</span>
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
              {/* Blur fade effect at bottom */}
              <div
                className={blurEffectClassName}
                style={blurEffectStyle}
              />
            </div>
          </SidebarGroup>
        </SidebarContent>
        {/* <SidebarSeparator /> */}
        <div className="px-4">
          <Separator className="bg-general-border" />
        </div>

        <SidebarFooter className="pt-3 pb-0 shrink-0 px-4">
          <div className="mb-1">
            <p className="text-sm font-medium text-general-muted-foreground">{userName}</p>
          </div>
          <SidebarMenu className="">
            {footerItems.map((item) => (
              <FooterAction
                key={item.label}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={item.href ? pathname === item.href : false}
                onClick={item.onClick}
                className={item.className}
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
