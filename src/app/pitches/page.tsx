import React from 'react'
import { getPageMetadata } from "@/config/seo";
import { Typography } from "@/components/ui/typography";

export const metadata = {
  ...getPageMetadata("pitches"),
}

const page = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Typography variant="h2" className="text-muted-foreground">
        Coming soon...
      </Typography>
    </div>
  )
}

export default page
