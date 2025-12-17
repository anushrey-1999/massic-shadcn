"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlansWrapper } from "../../molecules/settings/PlansWrapper";
import { DataTable } from "@/components/ui/table";
import { PlanModal, PlanData } from "../../molecules/settings/PlanModal";
import type { ColumnDef } from "@tanstack/react-table";
import { useExecutionCredits } from "@/hooks/use-execution-credits";
import { useBusinessStore, BusinessProfile } from "@/store/business-store";
import { useSubscription, SubscribeParams } from "@/hooks/use-subscription";
import { Loader2 } from "lucide-react";

// Helper to calculate linked businesses count for plans
const getLinkedCount = (profiles: BusinessProfile[], planName: string) => {
  return profiles.filter(p =>
    p.SubscriptionItems?.status === 'active' &&
    p.SubscriptionItems?.plan_type?.toLowerCase() === planName.toLowerCase()
  ).length.toString();
};

const defaultPlansData: PlanData[] = [
  {
    name: "Starter",
    price: "$49/mo per business",
    tags: ["ANALYTICS"],
    description:
      "Get the visibility you need to track growth at scale. Perfect for agencies and businesses who want always-on SEO insights without the noise.",
    features: [
      { text: "Unified, real-time analytics" },
      { text: "Google Search Console, GA4, and Google Business Profiles integrations" },
      { text: "Full performance breakdown: goals, clicks, impressions, funnel views, and more" },
      { text: "AI traffic tracking from major LLMs" },
      { text: "Local SEO visibility & review monitoring" },
    ],
    isGradient: false,
  },
  {
    name: "Core",
    price: "$299/mo per business",
    tags: ["ANALYTICS", "STRATEGY"],
    description:
      "Client-ready strategies, built automatically. Ideal for agencies who want research, planning, and campaign direction without the manual work.",
    features: [
      { text: "Topics plan tailored to your business" },
      { text: "Audience profiles" },
      { text: "Web strategy (page recommendations + deep content plan)" },
      { text: "Social strategy (platform-specific campaign planning)" },
    ],
    isGradient: false,
  },
  {
    name: "Growth",
    price: "$499/mo per business",
    tags: ["ANALYTICS", "STRATEGY", "CONTENT", "REVIEWS"],
    description:
      "Turn strategies into action — automatically. Ideal for agencies who want content, campaigns, and review management without adding more staff.",
    features: [
      { text: "Topics, audience profiles, web and social strategy" },
      { text: "Up to 30 web content pieces/month (blogs, service pages, landing pages)" },
      { text: "Up to 30 platform-ready social posts/month aligned to strategy" },
      { text: "Review campaigns: monitor, generate, and respond" },
    ],
    isRecommended: true,
    isGradient: true,
  },
];

export function BillingSettings() {
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  const { profiles } = useBusinessStore();
  const { loading: subscriptionLoading, handleSubscribeToPlan, data: subscriptionData } = useSubscription();
  const { loading: creditsLoading, creditsBalance, purchaseCredits, refetchData: refetchCredits } = useExecutionCredits();

  const loading = subscriptionLoading || creditsLoading;

  // Dynamic plans data based on current subscriptions
  const plansStats = useMemo(() => [
    {
      planName: "Starter",
      price: "49",
      businessesLinked: getLinkedCount(profiles, "starter"),
      cardBackground: "#F5F5F5",
      isGradientPlanName: false,
      hasBorder: false,
      isRecommended: false,
      isAddOn: false,
    },
    {
      planName: "Core",
      price: "299",
      businessesLinked: getLinkedCount(profiles, "core"),
      cardBackground: "#F5F5F5",
      isGradientPlanName: false,
      hasBorder: false,
      isRecommended: false,
      isAddOn: false,
    },
    {
      planName: "Growth",
      price: "499",
      businessesLinked: getLinkedCount(profiles, "growth"),
      cardBackground: "#F5F5F5",
      isGradientPlanName: true,
      hasBorder: true,
      isRecommended: true,
      isAddOn: false,
    },
    {
      planName: "100 Execution Credits",
      price: "100",
      businessesLinked: `${creditsBalance?.current_balance || 0} credits`,
      cardBackground: "#F5F5F5",
      isGradientPlanName: false,
      hasBorder: false,
      isRecommended: false,
      isAddOn: true,
    },
  ], [profiles, creditsBalance]);

  const handleManagePlan = (businessId: string) => {
    setSelectedBusinessId(businessId);
    setPlanModalOpen(true);
  };

  const handleClosePlanModal = () => {
    setPlanModalOpen(false);
    setSelectedBusinessId(null);
  };

  const onSelectPlan = async (planName: string, action: 'UPGRADE' | 'DOWNGRADE' | 'SUBSCRIBE') => {
    if (!selectedBusinessId) return;
    const business = profiles.find(b => b.UniqueId === selectedBusinessId);
    if (!business) return;

    await handleSubscribeToPlan({
      business,
      planName,
      action,
      closeAllModals: handleClosePlanModal
    });
  };

  const columns = useMemo<ColumnDef<BusinessProfile>[]>(
    () => [
      {
        accessorKey: "Name",
        header: "Business Name",
        enableSorting: true,
        cell: ({ row }) => {
          return (
            <div className="text-left">{row.original.Name}</div>
          );
        },
      },
      {
        accessorKey: "SubscriptionItems.plan_type",
        header: "Plan",
        enableSorting: true,
        cell: ({ row }) => {
          // Check if whitelisted using the hook data we already have in the component
          // We need to access subscriptionData here. 
          // Since columns is memoized, we need to pass subscriptionData to it or use it from closure if dependencies update.
          // However, useSubscription is called at top level. We can assume 'loading' and 'handleSubscribeToPlan' came from it.
          // Let's get 'data' from useSubscription in the component and add it to dependencies.

          const isWhitelisted = subscriptionData?.whitelisted === true || subscriptionData?.status === 'whitelisted';

          if (isWhitelisted) {
            return (
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-green-600">Whitelisted</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Unlimited Access
                  </span>
                </div>
              </div>
            );
          }

          const planName = row.original.SubscriptionItems?.plan_type
            ? row.original.SubscriptionItems.plan_type.charAt(0).toUpperCase() + row.original.SubscriptionItems.plan_type.slice(1)
            : "No Plan";

          return (
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-green-600">{planName}</span>
                {row.original.SubscriptionItems?.status === 'active' &&
                  <span className="text-xs text-muted-foreground">Active</span>
                }
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleManagePlan(row.original.UniqueId)}
              >
                Manage
              </Button>
            </div>
          );
        },
      },
    ],
    [subscriptionData]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-5">
      {/* Left Section - Payment & Billing */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Plans</CardTitle>
            <CardDescription>
              Manage plans for your businesses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && profiles.length === 0 ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <div className="[&_table]:table-fixed [&_table]:w-full [&_th:first-child]:w-[60%] [&_th:last-child]:w-auto">
                <DataTable columns={columns} data={profiles} />
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Right Section - Plans */}
      <div>
        <PlansWrapper
          plansData={plansStats}
          modalPlansData={defaultPlansData}
          currentCreditBalance={creditsBalance?.current_balance || 0}
          onPurchaseCredits={purchaseCredits}
          onCreditsRefresh={refetchCredits}
        />
      </div>

      <PlanModal
        open={planModalOpen}
        onClose={handleClosePlanModal}
        plansData={defaultPlansData}
        currentPlan={(() => {
          const business = profiles.find(b => b.UniqueId === selectedBusinessId);
          if (!business?.SubscriptionItems) return "No Plan";
          if (business.SubscriptionItems.status === 'active' && business.SubscriptionItems.plan_type) {
            return business.SubscriptionItems.plan_type.charAt(0).toUpperCase() + business.SubscriptionItems.plan_type.slice(1).toLowerCase();
          }
          return "No Plan";
        })()}
        showFooterButtons={true}
        onSelectPlan={onSelectPlan}
        loading={loading}
      />
    </div>
  );
}
