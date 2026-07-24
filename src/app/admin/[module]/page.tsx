import { notFound } from "next/navigation"
import { AdminModuleView } from "@/features/admin/modules/admin-module-view"
import type { AdminModuleKey } from "@/features/admin/types"

const modules = new Set<AdminModuleKey>(["network-performance", "growth", "api-cost", "industry", "category-insights", "platform-totals", "subscription"])

export default async function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  if (!modules.has(module as AdminModuleKey)) notFound()
  return <AdminModuleView module={module as AdminModuleKey} />
}
