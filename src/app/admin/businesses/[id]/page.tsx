import { AdminBusinessSnapshot } from "@/features/admin/businesses/admin-business-snapshot"

export default async function BusinessSnapshotPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminBusinessSnapshot id={id} /> }
