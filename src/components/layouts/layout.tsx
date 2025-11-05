import AppSidebar from '@/components/sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import React from 'react'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider className="h-screen overflow-hidden flex">
      <AppSidebar />
      <SidebarInset className="overflow-y-auto flex-1">
        <div className="min-h-full bg-foreground-light">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

