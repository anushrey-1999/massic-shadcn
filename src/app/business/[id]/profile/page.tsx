import ProfileTemplate from '@/components/templates/ProfileTemplate'
import React from 'react'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BusinessProfilePage({ params }: PageProps) {
  const { id } = await params
  return (
    <ProfileTemplate businessId={id}  />
  )
}

