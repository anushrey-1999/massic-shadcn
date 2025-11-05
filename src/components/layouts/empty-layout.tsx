import React from 'react'

export default function EmptyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen overflow-hidden">
      <main className="h-full overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

