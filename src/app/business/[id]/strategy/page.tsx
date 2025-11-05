import React from 'react'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BusinessStrategyPage({ params }: PageProps) {
  const { id } = await params
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Strategy - {id}</h1>
      <p className="text-muted-foreground">Strategy page for {id}</p>
    </div>
  )
}

