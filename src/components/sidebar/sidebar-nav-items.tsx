'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { normalizeDomainForFavicon } from '@/utils/utils'

const FAVICON_URL = 'https://www.google.com/s2/favicons?domain='

export const SIDEBAR_ITEM_CLASS =
  'py-4 cursor-pointer hover:bg-general-border hover:text-general-unofficial-foreground-alt data-[active=true]:bg-general-border data-[active=true]:text-general-unofficial-foreground-alt'

interface BusinessIconProps {
  website?: string
  name?: string
}

export function BusinessIcon({ website, name }: BusinessIconProps) {
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

export function NavItem({ href, icon: Icon, label, isActive, isCollapsed }: NavItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={cn(SIDEBAR_ITEM_CLASS, isCollapsed ? 'justify-center pl-0' : 'pl-3')}
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

export function FooterAction({ href, icon: Icon, label, isActive, onClick, className, isCollapsed }: FooterActionProps) {
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
