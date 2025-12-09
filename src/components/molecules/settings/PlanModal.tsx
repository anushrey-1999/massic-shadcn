"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { LongPlanCard, PlanFeature } from "./LongPlanCard";
import { cn } from "@/lib/utils";

export interface PlanData {
  name: string;
  price: string;
  tags: string[];
  description: string;
  features: PlanFeature[];
  isRecommended?: boolean;
  isGradient?: boolean;
}

interface PlanModalProps {
  open: boolean;
  onClose: () => void;
  plansData?: PlanData[];
  currentPlan?: string;
  isTrialActive?: boolean;
  onSelectPlan?: (planName: string, action: "UPGRADE" | "DOWNGRADE" | "SUBSCRIBE") => void;
  showFooterButtons?: boolean;
  showAlertBar?: boolean;
  alertMessage?: string;
  alertSeverity?: "success" | "info" | "warning" | "error";
  isDescription?: boolean;
  loading?: boolean;
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

export function PlanModal({
  open,
  onClose,
  plansData,
  currentPlan,
  isTrialActive = false,
  onSelectPlan,
  isDescription = true,
  showFooterButtons = false,
  showAlertBar = false,
  alertMessage,
  alertSeverity = "info",
  loading = false,
}: PlanModalProps) {
  const plans = plansData || defaultPlansData;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="bg-transparent border-none p-0 gap-3"
        showCloseButton={false}
        style={{
          width: '90vw',
          maxWidth: 'min(90vw, 1200px)'
        }}
      >
        <DialogTitle className="sr-only">Select a Plan</DialogTitle>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-white hover:bg-[#DADBDD]"
            onClick={onClose}
          >
            <X className="h-4 w-4 text-[#4A4A4A]" />
          </Button>
        </div>

        {showAlertBar && alertMessage && (
          <div
            className={cn(
              "rounded-lg p-4 text-base font-medium",
              alertSeverity === "success" && "bg-green-50 text-green-800 border border-green-200",
              alertSeverity === "error" && "bg-red-50 text-red-800 border border-red-200",
              alertSeverity === "warning" && "bg-yellow-50 text-yellow-800 border border-yellow-200",
              alertSeverity === "info" && "bg-blue-50 text-blue-800 border border-blue-200"
            )}
          >
            {alertMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#F6F8F8] rounded-xl p-3">
          {plans.map((plan) => (
            <LongPlanCard
              key={plan.name}
              name={plan.name}
              price={plan.price}
              tags={plan.tags}
              description={plan.description}
              features={plan.features}
              isRecommended={plan.isRecommended}
              isGradient={plan.isGradient}
              currentPlan={currentPlan}
              isTrialActive={isTrialActive}
              onSelectPlan={onSelectPlan}
              isDescription={isDescription}
              isShowFooterButton={showFooterButtons}
              loading={loading}
              globalLoading={loading}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

