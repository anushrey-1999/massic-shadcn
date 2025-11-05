import React from 'react'

interface PageProps {
  params: {
    id: string
  }
}

export default function BusinessProfilePage({ params }: PageProps) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Profile - {params.id}</h1>
      <p className="text-muted-foreground">Profile page for {params.id}</p>
    </div>
  )
}

