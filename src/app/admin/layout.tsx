import { AdminRootLayout } from "@/features/admin/layout/admin-shell"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminRootLayout>{children}</AdminRootLayout>
}
