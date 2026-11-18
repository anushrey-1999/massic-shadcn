import AppSidebar from '@/components/sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import React from 'react'

export default function Layout({
  children,
  fill = false,
  hideSidebarOnMobile = false,
}: {
  children: React.ReactNode
  fill?: boolean
  hideSidebarOnMobile?: boolean
}) {
  return (
    <SidebarProvider className="h-screen overflow-hidden flex">
      {hideSidebarOnMobile ? (
        <div className="hidden shrink-0 md:block"><AppSidebar /></div>
      ) : <AppSidebar />}
      <SidebarInset className={cn('flex-1 bg-foreground-light', fill ? 'min-h-0 overflow-hidden' : 'overflow-y-auto')}>
        <div className={fill ? 'flex h-full min-h-0 flex-col overflow-hidden' : 'min-h-full'}>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

