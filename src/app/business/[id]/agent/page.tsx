import { MassicAgentShell } from "@/components/massic-agent/massic-agent-shell";
export const metadata = { title: "Massic Agent" };
export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MassicAgentShell businessId={id} />;
}
