"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface PlanFeature {
  text: string;
}

interface LongPlanCardProps {
  name: string;
  price: string;
  tags: string[];
  description: string;
  features: PlanFeature[];
  isRecommended?: boolean;
  isGradient?: boolean;
  currentPlan?: string;
  isTrialActive?: boolean;
  onSelectPlan?: (planName: string, action: "UPGRADE" | "DOWNGRADE" | "SUBSCRIBE") => void;
  isDescription?: boolean;
  isShowFooterButton?: boolean;
  loading?: boolean;
  globalLoading?: boolean;
}

export function LongPlanCard({
  name,
  price,
  tags,
  description,
  features,
  isRecommended = false,
  isGradient = false,
  currentPlan,
  isTrialActive = false,
  onSelectPlan,
  isDescription = true,
  isShowFooterButton = false,
  loading = false,
  globalLoading = false,
}: LongPlanCardProps) {
  const getActionForPlan = () => {
    if (!currentPlan) return null;
    if (isTrialActive) return "SUBSCRIBE" as const;
    if (currentPlan === name) return "CURRENT" as const;

    if (currentPlan === "No Plan") return "SUBSCRIBE" as const;

    const order = ["Starter", "Core", "Growth"] as const;
    const currentIndex = order.indexOf(currentPlan as any);
    const targetIndex = order.indexOf(name as any);
    return targetIndex > currentIndex ? ("UPGRADE" as const) : ("DOWNGRADE" as const);
  };

  const action = getActionForPlan();
  const isDisabled = globalLoading || loading || action === "CURRENT";

  const getFeatureTitle = () => {
    if (name === "Starter") return "Advanced Analytics";
    return `Everything in ${name === "Core" ? "Starter" : "Core"}, plus:`;
  };

  return (
    <Card
      className={cn(
        "p-4 flex flex-col h-full",
        isRecommended && "border-[#338484]"
      )}
      style={{ minHeight: isDescription ? "500px" : undefined }}
    >
      <div className="flex flex-col gap-1 pb-2.5 border-b border-[#0000000F] min-h-[80px] justify-between">
        <div className="flex items-center gap-3 flex-wrap min-h-[40px]">
          <h2
            className={cn(
              "text-2xl font-semibold",
              isGradient
                ? "bg-gradient-to-r from-[#338484] to-[#8BC6C6] bg-clip-text text-transparent"
                : "text-[#0F4343]"
            )}
          >
            {name}
          </h2>

          {isRecommended && (
            <Badge
              className="bg-gradient-to-r from-[#338484] to-[#8BC6C6] text-white text-[10px] font-medium uppercase px-1.5 py-0.5 rounded"
            >
              RECOMMENDED
            </Badge>
          )}
        </div>

        <p className="text-xl font-semibold text-[#00000099]">{price}</p>
      </div>

      <div className="flex gap-2 flex-wrap items-center border-b border-[#0000000F] py-2.5 mb-4">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="bg-white text-[#0F4343] border-[#0F4343] text-xs font-medium"
          >
            {tag}
          </Badge>
        ))}
      </div>

      <p className="text-sm text-[#000000DE] mb-4">{description}</p>

      {isDescription && (
        <div className="flex-1 flex flex-col bg-[#F6F8F8] rounded-lg p-3">
          <h3 className="text-base font-semibold text-[#000000DE] mb-3">
            {getFeatureTitle()}
          </h3>

          <ul className="space-y-1.5">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2.5 pb-1.5 border-b border-[#0000000F]">
                <Check className="h-5 w-5 text-[#0F4343] mt-0.5 shrink-0" />
                <span className="text-sm text-[#0F4343]">{feature.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isShowFooterButton && (
        <div className="mt-3">
          <Button
            disabled={isDisabled}
            onClick={() => {
              if (action && action !== "CURRENT" && onSelectPlan) {
                onSelectPlan(name, action);
              }
            }}
            className={cn(
              "w-full",
              name === "Growth" && action !== "CURRENT"
                ? "bg-gradient-to-r from-[#338484] to-[#8BC6C6] text-white border-none hover:opacity-90"
                : "bg-transparent text-[#0F4343] border border-[#0F4343] hover:bg-[#0F4343]/10"
            )}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {action === "CURRENT"
              ? "Current plan"
              : action === "SUBSCRIBE"
                ? "Subscribe"
                : action === "UPGRADE"
                  ? "Upgrade"
                  : "Downgrade"}
          </Button>
        </div>
      )}
    </Card>
  );
}

