import React from 'react'

export default function EmptyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen overflow-hidden bg-foreground-light">
      <main className="h-full overflow-y-auto bg-foreground-light">
        {children}
      </main>
    </div>
  )
}

