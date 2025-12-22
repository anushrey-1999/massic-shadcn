"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlansWrapper } from "../../molecules/settings/PlansWrapper";
import { DataTable } from "@/components/filter-table";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";
import { PlanModal, PlanData } from "../../molecules/settings/PlanModal";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { useExecutionCredits } from "@/hooks/use-execution-credits";
import { useBusinessStore, BusinessProfile } from "@/store/business-store";
import { useSubscription, SubscribeParams } from "@/hooks/use-subscription";
import { ChevronRight, Loader2 } from "lucide-react";
import { Typography } from "@/components/ui/typography";

// Helper to calculate linked businesses count for plans
const getLinkedCount = (profiles: BusinessProfile[], planName: string) => {
  return profiles
    .filter(
      (p) =>
        p.SubscriptionItems?.status === "active" &&
        p.SubscriptionItems?.plan_type?.toLowerCase() === planName.toLowerCase()
    )
    .length.toString();
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
      {
        text: "Google Search Console, GA4, and Google Business Profiles integrations",
      },
      {
        text: "Full performance breakdown: goals, clicks, impressions, funnel views, and more",
      },
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
      {
        text: "Up to 30 web content pieces/month (blogs, service pages, landing pages)",
      },
      {
        text: "Up to 30 platform-ready social posts/month aligned to strategy",
      },
      { text: "Review campaigns: monitor, generate, and respond" },
    ],
    isRecommended: true,
    isGradient: true,
  },
];

export function BillingSettings() {
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    null
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { profiles } = useBusinessStore();
  const {
    loading: subscriptionLoading,
    handleSubscribeToPlan,
    data: subscriptionData,
  } = useSubscription();
  const {
    loading: creditsLoading,
    creditsBalance,
    purchaseCredits,
    refetchData: refetchCredits,
  } = useExecutionCredits();

  const loading = subscriptionLoading || creditsLoading;

  // Dynamic plans data based on current subscriptions
  const plansStats = useMemo(
    () => [
      {
        planName: "Starter",
        price: "49",
        businessesLinked: getLinkedCount(profiles, "starter"),
        iconName: "ChartLine",
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
        iconName: "Puzzle",
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
        iconName: "Zap",
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
        iconName: "Gem",
        cardBackground: "#F5F5F5",
        isGradientPlanName: false,
        hasBorder: false,
        isRecommended: false,
        isAddOn: true,
      },
    ],
    [profiles, creditsBalance]
  );

  const handleManagePlan = useCallback((businessId: string) => {
    setSelectedBusinessId(businessId);
    setPlanModalOpen(true);
  }, []);

  const handleClosePlanModal = () => {
    setPlanModalOpen(false);
    setSelectedBusinessId(null);
  };

  const onSelectPlan = async (
    planName: string,
    action: "UPGRADE" | "DOWNGRADE" | "SUBSCRIBE"
  ) => {
    if (!selectedBusinessId) return;
    const business = profiles.find((b) => b.UniqueId === selectedBusinessId);
    if (!business) return;

    await handleSubscribeToPlan({
      business,
      planName,
      action,
      closeAllModals: handleClosePlanModal,
    });
  };

  const columns = useMemo<ColumnDef<BusinessProfile>[]>(
    () => [
      {
        accessorKey: "Name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Business Name" disableHide />
        ),
        enableSorting: true,
        cell: ({ row }) => {
          return <div className="text-left">{row.original.Name}</div>;
        },
      },
      {
        id: "plan",
        accessorFn: (row) => {
          const isWhitelisted =
            subscriptionData?.whitelisted === true ||
            subscriptionData?.status === "whitelisted";
          if (isWhitelisted) return "Whitelisted";
          return row.SubscriptionItems?.plan_type
            ? row.SubscriptionItems.plan_type.charAt(0).toUpperCase() +
                row.SubscriptionItems.plan_type.slice(1)
            : "No Plan";
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Plan" disableHide />
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const isWhitelisted =
            subscriptionData?.whitelisted === true ||
            subscriptionData?.status === "whitelisted";

          if (isWhitelisted) {
            return (
              // <div className="flex items-center gap-3">
              //   <div className="flex flex-col gap-1">
              //     <span className="text-sm font-medium text-green-600">Whitelisted</span>
              //     <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              //       Unlimited Access
              //     </span>
              //   </div>

              // </div>

              <div className="border border-general-border rounded-lg px-2 py-[5.5px] flex items-center justify-between">
                <Typography variant="p" className="leading-none text-green-600">
                  Whitelisted
                </Typography>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            );
          }

          const planName = row.original.SubscriptionItems?.plan_type
            ? row.original.SubscriptionItems.plan_type.charAt(0).toUpperCase() +
              row.original.SubscriptionItems.plan_type.slice(1)
            : "No Plan";

          return (
            // <div className="flex items-center gap-3">
            //   <div className="flex flex-col gap-1">
            //     <span className="text-sm font-medium text-green-600">
            //       {planName}
            //     </span>
            //     {row.original.SubscriptionItems?.status === "active" && (
            //       <span className="text-xs text-muted-foreground">Active</span>
            //     )}
            //   </div>
            //   <Button
            //     variant="outline"
            //     size="sm"
            //     onClick={() => handleManagePlan(row.original.UniqueId)}
            //   >
            //     Manage
            //   </Button>
            // </div>

            <div
              onClick={() => handleManagePlan(row.original.UniqueId)}
              className="border border-general-border rounded-lg px-2 py-[5.5px] flex items-center justify-between"
            >
              <Typography
                variant="p"
                className={`leading-none ${
                  planName === "Growth" ? "text-green-600" : ""
                }`}
              >
                {planName}
              </Typography>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          );
        },
      },
    ],
    [subscriptionData, handleManagePlan]
  );

  const table = useReactTable({
    data: profiles,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const name = row.original.Name?.toLowerCase() || "";
      const planType =
        row.original.SubscriptionItems?.plan_type?.toLowerCase() || "";
      return name.includes(search) || planType.includes(search);
    },
    initialState: {
      pagination: {
        pageSize: 100,
      },
    },
  });

  return (
    <div className="flex gap-5 bg-white p-4 rounded-lg h-[calc(100vh-12rem)]">
      {/* Left Section - Payment & Billing */}
      <div className="flex-1 h-full overflow-auto">
        <Card className="border-none shadow-none py-0">
          <CardContent className="p-0">
            {loading && profiles.length === 0 ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <DataTable
                table={table}
                isLoading={loading}
                emptyMessage="No businesses found."
                disableHorizontalScroll={true}
                className="h-[calc(100vh-14rem)]"
              >
                <div
                  role="toolbar"
                  aria-orientation="horizontal"
                  className="flex w-full items-start justify-between gap-2 p-1"
                >
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <DataTableSearch
                      value={globalFilter}
                      onChange={setGlobalFilter}
                      placeholder="Search businesses, plans..."
                    />
                  </div>
                </div>
              </DataTable>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Section - Plans */}
      <div className="w-[520px] shrink-0 overflow-auto">
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
          const business = profiles.find(
            (b) => b.UniqueId === selectedBusinessId
          );
          if (!business?.SubscriptionItems) return "No Plan";
          if (
            business.SubscriptionItems.status === "active" &&
            business.SubscriptionItems.plan_type
          ) {
            return (
              business.SubscriptionItems.plan_type.charAt(0).toUpperCase() +
              business.SubscriptionItems.plan_type.slice(1).toLowerCase()
            );
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
