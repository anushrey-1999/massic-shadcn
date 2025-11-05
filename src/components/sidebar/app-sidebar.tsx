'use client'

import React, { useState, useEffect } from 'react'
import { Home, LineChart, Settings, Bell, LogOut, Plus, Search, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
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
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive: boolean
}

function FooterAction({ href, icon: Icon, label, isActive }: FooterActionProps) {
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

export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

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

  // User/Agency name - TODO: Replace with actual user data
  const userName = 'Dhruv Garg'

  // Businesses data - TODO: Replace with actual data
  const [openBusinessId, setOpenBusinessId] = useState<string | null>(null)

  const businesses = [
    { id: 'business-1', name: 'Business 1', initial: 'B1' },
    { id: 'business-2', name: 'Business 2', initial: 'B2' },
    { id: 'business-3', name: 'Business 3', initial: 'B3' },
    { id: 'business-4', name: 'Business 4', initial: 'B4' },
    { id: 'business-5', name: 'Business 5', initial: 'B5' },
    { id: 'business-6', name: 'Business 6', initial: 'B6' },
    { id: 'business-7', name: 'Business 7', initial: 'B7' },
    { id: 'business-8', name: 'Business 8', initial: 'B8' },
  ]

  const businessSubItems = [
    { label: 'Analytics', slug: 'analytics' },
    { label: 'Strategy', slug: 'strategy' },
    { label: 'Actions', slug: 'actions' },
    { label: 'Reviews', slug: 'reviews' },
    { label: 'Profile', slug: 'profile' },
  ]

  // Check if current pathname is a business route
  const isBusinessRoute = pathname.startsWith('/business/')

  // Close business accordion when navigating away from business routes
  useEffect(() => {
    if (!isBusinessRoute) {
      setOpenBusinessId(null)
    } else {
      // Extract business ID from pathname (e.g., /business/business-1/strategy -> business-1)
      const businessIdMatch = pathname.match(/^\/business\/(business-\d+)/)
      if (businessIdMatch) {
        setOpenBusinessId(businessIdMatch[1])
      }
    }
  }, [pathname, isBusinessRoute])

  const toggleBusiness = (id: string, open: boolean) => {
    setOpenBusinessId(open ? id : null)
    // When opening, navigate to analytics page
    if (open) {
      router.push(`/business/${id}/analytics`)
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
      href: '/logout',
      icon: LogOut,
      label: 'Logout',
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
              {businesses.map((business) => {
                const isOpen = openBusinessId === business.id
                // Check if any sub-item of this business is active
                const hasActiveSubItem = businessSubItems.some((subItem) => {
                  const subItemHref = `/business/${business.id}/${subItem.slug}`
                  return pathname === subItemHref
                })
                return (
                  <Collapsible
                    key={business.id}
                    open={isOpen}
                    onOpenChange={(open) => toggleBusiness(business.id, open)}
                  >
                    <SidebarMenuItem>
                      <div className="relative">
                        {hasActiveSubItem && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-black dark:bg-white rounded-r-full z-10" />
                        )}
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            isActive={hasActiveSubItem}
                            className="py-4.5 pl-4 group/business w-full justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-4 w-4 items-center justify-center rounded-xs border border-dashed border-black dark:border-white text-[9px]  text-sidebar-foreground">
                                {business.initial}
                              </div>
                              <span>{business.name}</span>
                            </div>
                            <ChevronRight className={`ml-auto h-4 w-4 opacity-0 group-hover/business:opacity-100 transition-all duration-200 ${isOpen ? 'rotate-90 opacity-100' : ''}`} />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <SidebarMenuSub className="ml-5 border-l-2 border-sidebar-border">
                          {businessSubItems.map((subItem) => {
                            const subItemHref = `/business/${business.id}/${subItem.slug}`
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
              })}
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
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname === item.href}
            />
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

