import { AdminAgencySnapshot } from "@/features/admin/agencies/admin-agency-snapshot"

export default async function AgencySnapshotPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminAgencySnapshot id={id} /> }
