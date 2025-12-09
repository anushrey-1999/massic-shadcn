"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlansWrapper } from "../../molecules/settings/PlansWrapper";
import { DataTable } from "@/components/ui/table";
import { PlanModal, PlanData } from "../../molecules/settings/PlanModal";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";

const plansData = [
  {
    planName: "Starter",
    price: "49",
    businessesLinked: "0",
    cardBackground: "#F5F5F5",
    isGradientPlanName: false,
    hasBorder: false,
    isRecommended: false,
    isAddOn: false,
  },
  {
    planName: "Core",
    price: "299",
    businessesLinked: "1",
    cardBackground: "#F5F5F5",
    isGradientPlanName: false,
    hasBorder: false,
    isRecommended: false,
    isAddOn: false,
  },
  {
    planName: "Growth",
    price: "499",
    businessesLinked: "0",
    cardBackground: "#F5F5F5",
    isGradientPlanName: true,
    hasBorder: true,
    isRecommended: true,
    isAddOn: false,
  },
  {
    planName: "100 Execution Credits",
    price: "100",
    businessesLinked: "358 credits",
    cardBackground: "#F5F5F5",
    isGradientPlanName: false,
    hasBorder: false,
    isRecommended: false,
    isAddOn: true,
  },
];

interface BusinessPlan {
  id: string;
  businessName: string;
  planName: string;
}

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
      {
        text: "Web strategy (page recommendations + deep content plan)",
      },
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

// Sample business data - replace with actual data from your API/store
const businessesData: BusinessPlan[] = [
  {
    id: "1",
    businessName: "Kanahiku",
    planName: "Growth",
  },
  {
    id: "2",
    businessName: "Business 2",
    planName: "Core",
  },
  {
    id: "3",
    businessName: "Business 3",
    planName: "Starter",
  },
];

export function BillingSettings() {
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  const handleManagePlan = (businessId: string) => {
    setSelectedBusinessId(businessId);
    setPlanModalOpen(true);
  };

  const handleClosePlanModal = () => {
    setPlanModalOpen(false);
    setSelectedBusinessId(null);
  };

  const columns = useMemo<ColumnDef<BusinessPlan>[]>(
    () => [
      {
        accessorKey: "businessName",
        header: "Business Name",
        enableSorting: true,
        cell: ({ row }) => {
          return (
            <div className="text-left">{row.original.businessName}</div>
          );
        },
      },
      {
        accessorKey: "planName",
        header: "Plan",
        enableSorting: true,
        cell: ({ row }) => {
          const planName = row.original.planName;
          return (
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-green-600">{planName}</span>
                <span className="text-xs text-muted-foreground">Current plan</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleManagePlan(row.original.id)}
              >
                Manage
              </Button>
            </div>
          );
        },
      },
    ],
    []
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
          <div className="[&_table]:table-fixed [&_table]:w-full [&_th:first-child]:w-[60%] [&_th:last-child]:w-auto">
            <DataTable columns={columns} data={businessesData} />
          </div>
        </CardContent>
      </Card>
 
      </div>

      {/* Right Section - Plans */}
      <div>
        <PlansWrapper plansData={plansData} modalPlansData={defaultPlansData} />
      </div>

      <PlanModal
        open={planModalOpen}
        onClose={handleClosePlanModal}
        plansData={defaultPlansData}
        currentPlan={selectedBusinessId ? businessesData.find(b => b.id === selectedBusinessId)?.planName : undefined}
        showFooterButtons={false}
      />
    </div>
  );
}

