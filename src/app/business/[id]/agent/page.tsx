import { MassicAgentShell } from "@/components/massic-agent/massic-agent-shell";
export const metadata = { title: "Massic Agent" };
export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <MassicAgentShell businessId={id} />
    </div>
  );
}
