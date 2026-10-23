"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/molecules/EmptyState";
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";
import { PageHeader } from "@/components/molecules/PageHeader";
import { AppearanceTab } from "@/components/organisms/customer-agent/AppearanceTab";
import { InstallTab } from "@/components/organisms/customer-agent/InstallTab";
import { KnowledgeTab } from "@/components/organisms/customer-agent/KnowledgeTab";
import { useUnsavedChangesContext } from "@/components/providers/unsaved-changes-provider";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomerAgent } from "@/hooks/use-customer-agent";

const TABS = [
  { value: "install", label: "Install" },
  { value: "appearance", label: "Appearance" },
  { value: "knowledge", label: "Knowledge" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function isTab(value: string | null): value is TabValue {
  return TABS.some((tab) => tab.value === value);
}

interface CustomerAgentTemplateProps {
  businessId: string;
  businessName: string;
}

export function CustomerAgentTemplate({ businessId, businessName }: CustomerAgentTemplateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { requestNavigation } = useUnsavedChangesContext();
  const agent = useCustomerAgent(businessId);

  const requestedTab = searchParams.get("tab");
  const activeTab: TabValue = isTab(requestedTab) ? requestedTab : "install";

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
    return (
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="max-w-full shrink-0 justify-start overflow-x-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="install" className="mt-4 min-h-0 flex-1 overflow-auto">
          <InstallTab businessId={businessId} config={agent.config} />
        </TabsContent>
        <TabsContent value="appearance" className="mt-4 min-h-0 flex-1 overflow-hidden">
          <AppearanceTab
            businessId={businessId}
            config={agent.config}
            update={agent.update}
          />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-4 min-h-0 flex-1 overflow-auto">
          <KnowledgeTab businessId={businessId} />
        </TabsContent>
      </Tabs>
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
