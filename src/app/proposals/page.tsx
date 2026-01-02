
import React from 'react'
import { getPageMetadata } from "@/config/seo";

export const metadata = {
  ...getPageMetadata("proposals"),
}

const page = () => {
  return (
    <div>proposal page</div>
  )
}

export default page