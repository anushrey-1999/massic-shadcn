"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/molecules/EmptyState";
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";
import { PageHeader } from "@/components/molecules/PageHeader";
import { AgentStatusCard } from "@/components/organisms/customer-agent/AgentStatusCard";
import { AppearanceTab } from "@/components/organisms/customer-agent/AppearanceTab";
import { KnowledgeTab } from "@/components/organisms/customer-agent/KnowledgeTab";
import { CustomerAgentOnboarding } from "@/components/organisms/customer-agent/onboarding/CustomerAgentOnboarding";
import { TestAgentDialog } from "@/components/organisms/customer-agent/TestAgentDialog";
import { useUnsavedChangesContext } from "@/components/providers/unsaved-changes-provider";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomerAgent, useVisitorAgentInstall } from "@/hooks/use-customer-agent";
import { businessPageUrl, pickAppearance, previewConfig } from "@/lib/customer-agent";
import type { CustomerAgentConfig } from "@/types/customer-agent";

const TABS = [
  { value: "knowledge", label: "Knowledge" },
  { value: "appearance", label: "Appearance" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function isTab(value: string | null): value is TabValue {
  return TABS.some((tab) => tab.value === value);
}

interface CustomerAgentTemplateProps {
  businessId: string;
  businessName: string;
}

interface ManageViewProps {
  businessId: string;
  config: CustomerAgentConfig;
  update: ReturnType<typeof useCustomerAgent>["update"];
  onRefreshInstallation: () => void;
}

/** After setup: status up top, then the settings that can change any time. */
function ManageView({ businessId, config, update, onRefreshInstallation }: ManageViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { requestNavigation } = useUnsavedChangesContext();
  const siteKey = useVisitorAgentInstall(businessId).siteKey.data;
  const [testOpen, setTestOpen] = useState(false);
  const testConfig = useMemo(() => previewConfig(config, pickAppearance(config)), [config]);

  const requestedTab = searchParams.get("tab");
  const activeTab: TabValue = isTab(requestedTab) ? requestedTab : "knowledge";

  const handleTabChange = useCallback(
    (value: string) => {
      if (value === activeTab) return;
      requestNavigation(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", value);
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [activeTab, pathname, requestNavigation, router, searchParams]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0">
        <AgentStatusCard
          businessId={businessId}
          config={config}
          onTest={() => setTestOpen(true)}
          onRefreshInstallation={onRefreshInstallation}
        />
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="max-w-full shrink-0 justify-start overflow-x-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="knowledge" className="mt-4 min-h-0 flex-1 overflow-auto">
          <KnowledgeTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="appearance" className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
          <AppearanceTab businessId={businessId} config={config} update={update} />
        </TabsContent>
      </Tabs>
      {siteKey && (
        <TestAgentDialog
          open={testOpen}
          onOpenChange={setTestOpen}
          config={testConfig}
          siteId={config.site_id}
          siteKey={siteKey.key}
          pageUrl={businessPageUrl(config.business.website)}
        />
      )}
    </div>
  );
}

export function CustomerAgentTemplate({ businessId, businessName }: CustomerAgentTemplateProps) {
  const agent = useCustomerAgent(businessId);
  const refreshMutate = agent.refreshInstallation.mutate;
  const refreshInstallation = useCallback(() => refreshMutate(), [refreshMutate]);

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Customer Agent", href: `/business/${businessId}/customer-agent` },
    ],
    [businessId, businessName]
  );

  const renderBody = () => {
    if (agent.isLoading) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <MassicAmoebaLoader size={32} label="Loading Customer Agent" />
        </div>
      );
    }
    if (!agent.config) {
      return (
        <EmptyState
          className="min-h-[50vh]"
          title="Couldn't load Customer Agent"
          description="Check your connection and try again."
          buttons={[{ label: "Try again", onClick: () => void agent.refetch() }]}
        />
      );
    }
    if (!agent.config.onboarding.completed_at) {
      return (
        <CustomerAgentOnboarding
          businessId={businessId}
          config={agent.config}
          agent={agent}
          onRefreshInstallation={refreshInstallation}
        />
      );
    }
    return (
      <ManageView
        businessId={businessId}
        config={agent.config}
        update={agent.update}
        onRefreshInstallation={refreshInstallation}
      />
    );
  };

  return (
    <div className="flex h-screen flex-col">
      <PageHeader breadcrumbs={breadcrumbs} />
      <EntitlementsGuard entitlement="customerAgent" businessId={businessId}>
        <div className="flex min-h-0 w-full max-w-[1224px] flex-1 flex-col p-5">{renderBody()}</div>
      </EntitlementsGuard>
    </div>
  );
}
