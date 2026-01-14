import { Suspense } from 'react'
import { LoginClient } from './LoginClient'
import { getPageMetadata } from "@/config/seo";

export const metadata = {
  ...getPageMetadata("login"),
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  )
}

