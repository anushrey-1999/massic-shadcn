import React from 'react'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BusinessAnalyticsPage({ params }: PageProps) {
  const { id } = await params
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Analytics - {id}</h1>
      <p className="text-muted-foreground">Analytics page for {id}</p>
    </div>
  )
}

