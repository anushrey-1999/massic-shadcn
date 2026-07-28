'use client'

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Home, LineChart, Settings, LogOut, Plus, Search, ChevronRight, X, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLogout } from '@/hooks/use-auth'
import { useBusinessProfileById, useBusinessProfiles } from '@/hooks/use-business-profiles'
import { useAuthStore } from '@/store/auth-store'
import { useBusinessStore } from '@/store/business-store'
import { useScrollBlurEffect } from '@/hooks/use-scroll-blur-effect'
import { toast } from 'sonner'
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
import { useCan } from '@/hooks/use-permissions'

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
  isCollapsed?: boolean
}

function NavItem({ href, icon: Icon, label, isActive, isCollapsed }: NavItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={cn(
          'py-4 cursor-pointer hover:bg-general-border hover:text-general-unofficial-foreground-alt data-[active=true]:bg-general-border data-[active=true]:text-general-unofficial-foreground-alt',
          isCollapsed ? 'justify-center pl-0' : 'pl-3'
        )}
      >
        <Link href={href}>
          <Icon className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span className="font-medium text-general-unofficial-foreground-alt">{label}</span>}
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
  isCollapsed?: boolean
}

function FooterAction({ href, icon: Icon, label, isActive, onClick, className, isCollapsed }: FooterActionProps) {
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
          className={cn(
            `group py-4 cursor-pointer w-full hover:bg-general-border data-[active=true]:bg-general-border ${className ?? ''}`,
            isCollapsed ? 'justify-center pl-0' : 'pl-3'
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span className={labelClassName}>{label}</span>}
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className={cn(
            `group py-4 cursor-pointer hover:bg-general-border data-[active=true]:bg-general-border ${className ?? ''}`,
            isCollapsed ? 'justify-center pl-0' : 'pl-3'
          )}
        >
          <Link href={href!}>
            <Icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className={labelClassName}>{label}</span>}
          </Link>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  )
}


export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useLogout()
  const { user } = useAuthStore()
  const canManageLinkedBusinesses = useCan('canManageLinkedBusinesses')

  const businessesScrollRef = useRef<HTMLDivElement>(null)

  const [isCollapsed, setIsCollapsed] = useState(false)

  const [flyoutBusinessId, setFlyoutBusinessId] = useState<string | null>(null)
  const [flyoutTop, setFlyoutTop] = useState(0)
  const flyoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openFlyout = useCallback((uniqueId: string, el: HTMLElement) => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current)
    const rect = el.getBoundingClientRect()
    const flyoutHeight = 300
    const viewportHeight = window.innerHeight
    const spaceBelow = viewportHeight - rect.top
    
    let topPosition = rect.top
    if (spaceBelow < flyoutHeight && rect.top > flyoutHeight) {
      topPosition = Math.max(16, rect.bottom - flyoutHeight)
    }
    
    setFlyoutTop(topPosition)
    setFlyoutBusinessId(uniqueId)
  }, [])

  const scheduleFlyoutClose = useCallback(() => {
    flyoutTimeoutRef.current = setTimeout(() => setFlyoutBusinessId(null), 150)
  }, [])

  const cancelFlyoutClose = useCallback(() => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current)
  }, [])

  useEffect(() => () => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current)
  }, [])

  const {
    profiles,
    sidebarDataLoading,
    expandedBusinessId,
  } = useBusinessProfiles()

  const setExpandedBusinessId = useBusinessStore((state) => state.setExpandedBusinessId)
  useEffect(() => {
    if (!expandedBusinessId || sidebarDataLoading) return;
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

  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { handleScroll, blurEffectClassName, blurEffectStyle } = useScrollBlurEffect({ fadeZone: 60 })

  const navItems = [
    {
      href: '/',
      icon: Home,
      label: 'Home',
    },
    {
      href: '/pitches',
      icon: LineChart,
      label: 'Pitches',
    },
  ]

  const isNavItemActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const userName = user?.username || user?.email || 'User'

  const businessSubItems = [
    { label: 'Analytics', slug: 'analytics' },
    { label: 'Strategy', slug: 'strategy' },
    { label: 'Actions', slug: 'actions' },
    { label: 'Web', slug: 'web' },
    { label: 'Technical Audit', slug: 'technical-audit' },
    { label: 'Social', slug: 'social' },
    { label: 'Ads', slug: 'ads' },
    { label: 'Reviews', slug: 'reviews' },
    { label: 'Profile', slug: 'profile' },
  ]

  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles

    return profiles.filter(business =>
      (business.Name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (business.DisplayName?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [profiles, searchQuery])

  const isBusinessRoute = pathname.startsWith('/business/')
  const pitchBusinessId = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean)
    if (parts[0] !== 'pitches') return null
    if (!parts[1] || parts[1] === 'create-pitch') return null
    return parts[1]
  }, [pathname])
  const isPitchBusinessRoute = pitchBusinessId !== null

  const { profileData: pitchProfileById, profileDataLoading: pitchProfileByIdLoading } =
    useBusinessProfileById(pitchBusinessId)

  const pitchBusinessSubItems = [
    { label: 'Reports', slug: 'reports' },
    { label: 'Strategy', slug: 'strategy' },
    { label: 'Web', slug: 'web' },
    { label: 'Social', slug: 'social' },
    { label: 'Profile', slug: 'profile' },
  ] as const

  const pitchBusinessProfile = useMemo(() => {
    if (!pitchBusinessId) return null
    return profiles.find((p) => p.UniqueId === pitchBusinessId) ?? pitchProfileById ?? null
  }, [pitchBusinessId, profiles, pitchProfileById])

  const getPitchSubItemHref = (slug: (typeof pitchBusinessSubItems)[number]['slug']) => {
    if (!pitchBusinessId) return '/pitches'
    if (slug === 'reports') {
      return `/pitches/${pitchBusinessId}/reports?view=cards`
    }
    return `/pitches/${pitchBusinessId}/${slug}`
  }

  const isPitchSubItemActive = (slug: (typeof pitchBusinessSubItems)[number]['slug']) => {
    if (!pitchBusinessId) return false
    if (slug === 'reports') {
      return (
        pathname.startsWith(`/pitches/${pitchBusinessId}/reports`) ||
        pathname.startsWith(`/pitches/${pitchBusinessId}/summary`)
      )
    }
    return pathname.startsWith(`/pitches/${pitchBusinessId}/${slug}`)
  }

  useEffect(() => {

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

  const isFullyVisible = (container: HTMLElement, target: HTMLElement) => {
    const cTop = container.scrollTop
    const cBottom = cTop + container.clientHeight
    const tTop = target.offsetTop
    const tBottom = tTop + target.offsetHeight
    return tTop >= cTop && tBottom <= cBottom
  }

  const smoothScrollToCenter = (container: HTMLElement, target: HTMLElement, duration = 650) => {
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
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
      }, 0)
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
    {
      icon: LogOut,
      label: 'Logout',
      onClick: handleLogout,
      className: 'text-general-muted-foreground',
    },
  ]

  return (
    <>
      <div className="relative h-svh shrink-0">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
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
        <SidebarContent className="flex-1 flex flex-col overflow-hidden gap-0">
          <SidebarGroup className={cn('shrink-0 py-0 pb-3', isCollapsed ? 'px-1' : 'px-4')}>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {navItems.map((item) => {
                  if (item.href !== '/pitches') {
                    return (
                      <NavItem
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        isActive={isNavItemActive(item.href)}
                        isCollapsed={isCollapsed}
                      />
                    )
                  }

                  const businessLabel =
                    pitchBusinessProfile?.Name ||
                    pitchBusinessProfile?.DisplayName ||
                    (pitchProfileByIdLoading ? 'Loading…' : 'Business')

                  return (
                    <React.Fragment key={item.href}>
                      <NavItem
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        isActive={isPitchBusinessRoute ? false : isNavItemActive(item.href)}
                        isCollapsed={isCollapsed}
                      />

                      {isPitchBusinessRoute ? (
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            isActive={false}
                            className={cn(
                              'py-4 cursor-pointer hover:bg-general-border hover:text-general-unofficial-foreground-alt data-[active=true]:bg-general-border data-[active=true]:text-general-unofficial-foreground-alt',
                              isCollapsed ? 'justify-center pl-0' : 'pl-3'
                            )}
                          >
                            <Link href={getPitchSubItemHref('reports')}>
                              <div className={cn('flex items-center gap-2', !isCollapsed && 'min-w-0 flex-1')}>
                                <BusinessIcon
                                  website={pitchBusinessProfile?.Website}
                                  name={pitchBusinessProfile?.Name || pitchBusinessProfile?.DisplayName}
                                />
                                {!isCollapsed && (
                                  <span
                                    className="truncate font-medium text-general-unofficial-foreground-alt"
                                    title={businessLabel}
                                  >
                                    {businessLabel}
                                  </span>
                                )}
                              </div>
                            </Link>
                          </SidebarMenuButton>

                          {!isCollapsed && (
                            <SidebarMenuSub className="ml-5 mt-0.5 border-l-2 border-general-border">
                              {pitchBusinessSubItems.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.slug}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isPitchSubItemActive(subItem.slug)}
                                    className="w-full cursor-pointer py-4 text-general-muted-foreground hover:bg-general-border hover:text-general-unofficial-foreground-alt data-[active=true]:bg-general-border data-[active=true]:text-general-unofficial-foreground-alt"
                                  >
                                    <Link href={getPitchSubItemHref(subItem.slug)}>
                                      <span>{subItem.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          )}
                        </SidebarMenuItem>
                      ) : null}
                    </React.Fragment>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className={cn(isCollapsed ? 'px-1' : 'px-4')}>
            <Separator className="bg-general-border" />
          </div>

          <SidebarGroup className="flex-1 flex flex-col overflow-hidden py-3 p-0">
            {!isCollapsed && (
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
                      {canManageLinkedBusinesses && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push('/create-business')}
                          className="h-6 w-6 bg-foreground-light hover:bg-sidebar-accent/80 rounded-sm"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
            )}
            <div className="relative flex-1 overflow-hidden">
              <SidebarGroupContent
                ref={businessesScrollRef}
                className="flex-1 overflow-y-auto py-0 h-full px-0"
                onScroll={handleScroll}
              >
                <SidebarMenu className={cn('gap-1 pb-3', isCollapsed ? 'px-1' : 'px-4')}>
                  {sidebarDataLoading ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <SidebarMenuItem key={i}>
                          <div className={cn('flex items-center gap-2', isCollapsed && 'justify-center')}>
                            <Skeleton className="h-4 w-4 rounded-xs shrink-0" />
                            {!isCollapsed && <Skeleton className="h-4 w-24" />}
                          </div>
                        </SidebarMenuItem>
                      ))}
                    </>
                  ) : filteredProfiles.length === 0 ? (
                    !isCollapsed ? (
                      <SidebarMenuItem>
                        <div className="text-sm text-muted-foreground">
                          {searchQuery ? 'No matching businesses found' : 'No businesses found'}
                        </div>
                      </SidebarMenuItem>
                    ) : null
                  ) : (
                    <>
                      {isCollapsed && canManageLinkedBusinesses && (
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            onClick={() => router.push('/create-business')}
                            className="py-4 cursor-pointer hover:bg-general-border hover:text-general-unofficial-foreground-alt justify-center pl-0"
                          >
                            <Plus className="h-5 w-5 shrink-0" />
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                      {filteredProfiles.map((business) => {
                      const isOpen = expandedBusinessId === business.UniqueId
                      return (
                        <Collapsible
                          key={business.UniqueId}
                          open={isCollapsed ? false : isOpen}
                          onOpenChange={(open) => toggleBusiness(business.UniqueId, open)}
                        >
                          <SidebarMenuItem>
                            <div
                              className="relative"
                              onMouseEnter={(e) => isCollapsed && openFlyout(business.UniqueId, e.currentTarget)}
                              onMouseLeave={() => isCollapsed && scheduleFlyoutClose()}
                            >
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                  isActive={isCollapsed && pathname.startsWith(`/business/${business.UniqueId}/`)}
                                  data-business-id={business.UniqueId}
                                  className={cn(
                                    'py-4 group/business w-full cursor-pointer overflow-hidden rounded-md data-[active=true]:bg-general-border',
                                    isCollapsed ? 'justify-center pl-0' : 'pl-3 justify-between'
                                  )}
                                >
                                  <div className={cn('flex items-center gap-2', !isCollapsed && 'min-w-0 flex-1')}>
                                    <BusinessIcon website={business.Website} name={business.Name} />
                                    {!isCollapsed && (
                                      <span className="truncate font-medium text-general-unofficial-foreground-alt" title={business.Name || business.DisplayName}>
                                        {business.Name || business.DisplayName}
                                      </span>
                                    )}
                                  </div>
                                  {!isCollapsed && (
                                    <ChevronRight className={`shrink-0 ml-auto h-4 w-4 text-general-border-three opacity-0 group-hover/business:opacity-100 transition-all duration-200 ${isOpen ? 'rotate-90 opacity-100' : ''}`} />
                                  )}
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                            </div>
                            {!isCollapsed && (
                              <CollapsibleContent>
                                <SidebarMenuSub className="ml-5 mt-0.5 border-l-2 border-general-border">
                                  {businessSubItems.map((subItem) => {
                                    const subItemHref = `/business/${business.UniqueId}/${subItem.slug}`
                                    const reportsPath = `/business/${business.UniqueId}/reports`
                                    const organicDeepdivePath = `/business/${business.UniqueId}/organic-deepdive`
                                    const itemBasePath = `/business/${business.UniqueId}/${subItem.slug}`
                                    let isActive = false
                                    if (subItem.slug === 'analytics') {
                                      isActive =
                                        pathname === subItemHref ||
                                        pathname.startsWith(reportsPath) ||
                                        pathname.startsWith(organicDeepdivePath)
                                    } else if (subItem.slug === 'profile') {
                                      isActive = pathname === subItemHref
                                    } else {
                                      isActive = pathname.startsWith(itemBasePath)
                                    }
                                    
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
                            )}
                          </SidebarMenuItem>
                        </Collapsible>
                      )
                    })}
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
              <div
                className={blurEffectClassName}
                style={blurEffectStyle}
              />
            </div>
          </SidebarGroup>
        </SidebarContent>
        <div className={cn(isCollapsed ? 'px-1' : 'px-4')}>
          <Separator className="bg-general-border" />
        </div>

        <SidebarFooter className={cn('pt-3 pb-0 shrink-0', isCollapsed ? 'px-1' : 'px-4')}>
          {!isCollapsed && (
            <div className="mb-1">
              <p className="text-sm font-medium text-general-muted-foreground">{userName}</p>
            </div>
          )}
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
                isCollapsed={isCollapsed}
              />
            ))}
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {isCollapsed && flyoutBusinessId && typeof document !== 'undefined' && createPortal(
        (() => {
          const business = profiles.find((b) => b.UniqueId === flyoutBusinessId)
          if (!business) return null
          return (
            <div
              className="fixed z-50 bg-white border border-general-border rounded-lg shadow-lg py-2 min-w-[180px] max-h-[calc(100vh-32px)] overflow-y-auto"
              style={{ left: 'calc(3.5rem + 6px)', top: flyoutTop }}
              onMouseEnter={cancelFlyoutClose}
              onMouseLeave={scheduleFlyoutClose}
            >
              <div className="px-3 py-1.5 flex items-center gap-2">
                <BusinessIcon website={business.Website} name={business.Name} />
                <p className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                  {business.Name || business.DisplayName}
                </p>
              </div>
              <div className="h-px bg-general-border mx-2 mb-1 mt-1" />
              {businessSubItems.map((subItem) => {
                const subItemHref = `/business/${business.UniqueId}/${subItem.slug}`
                const reportsPath = `/business/${business.UniqueId}/reports`
                const organicDeepdivePath = `/business/${business.UniqueId}/organic-deepdive`
                let isActive = false
                if (subItem.slug === 'analytics') {
                  isActive =
                    pathname === subItemHref ||
                    pathname.startsWith(reportsPath) ||
                    pathname.startsWith(organicDeepdivePath)
                } else if (subItem.slug === 'profile') {
                  isActive = pathname === subItemHref
                } else {
                  isActive = pathname.startsWith(subItemHref)
                }
                return (
                  <Link
                    key={subItem.slug}
                    href={subItemHref}
                    onClick={() => setFlyoutBusinessId(null)}
                    className={cn(
                      'flex items-center px-3 py-1.5 text-sm rounded-md mx-1 cursor-pointer transition-colors',
                      isActive
                        ? 'bg-general-border font-medium text-general-unofficial-foreground-alt'
                        : 'text-general-muted-foreground hover:bg-general-border hover:text-general-unofficial-foreground-alt'
                    )}
                  >
                    {subItem.label}
                  </Link>
                )
              })}
            </div>
          )
        })(),
        document.body
      )}

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
