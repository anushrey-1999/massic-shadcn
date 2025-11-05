import React from 'react'

interface PageProps {
  params: {
    id: string
  }
}

export default function BusinessReviewsPage({ params }: PageProps) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Reviews - {params.id}</h1>
      <p className="text-muted-foreground">Reviews page for {params.id}</p>
    </div>
  )
}

