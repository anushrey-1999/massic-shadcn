import { AgentAccessGuard } from "@/components/massic-agent/agent-access-guard";
import { MassicAgentShell } from "@/components/massic-agent/massic-agent-shell";
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";

export const metadata = { title: "Massic Agent" };
export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <EntitlementsGuard
        entitlement="massicAgent"
        businessId={id}
        alertMessage="Upgrade to Growth to access Massic Agent."
      >
        <AgentAccessGuard businessId={id}>
          <MassicAgentShell businessId={id} />
        </AgentAccessGuard>
      </EntitlementsGuard>
    </div>
  );
}
