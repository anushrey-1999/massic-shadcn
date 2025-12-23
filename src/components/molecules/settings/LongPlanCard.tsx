"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Loader2, ChartLine, Puzzle, Zap, Gem } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlanFeature {
  text: string;
}

interface LongPlanCardProps {
  name: string;
  price: string;
  tags: string[];
  description: string;
  features: PlanFeature[];
  iconName?: string;
  isRecommended?: boolean;
  isGradient?: boolean;
  currentPlan?: string;
  isTrialActive?: boolean;
  onSelectPlan?: (
    planName: string,
    action: "UPGRADE" | "DOWNGRADE" | "SUBSCRIBE"
  ) => void;
  isDescription?: boolean;
  isShowFooterButton?: boolean;
  loading?: boolean;
  globalLoading?: boolean;
}

// Dynamic icon component
const IconComponent = ({
  iconName,
  planName,
}: {
  iconName?: string;
  planName?: string;
}) => {
  if (!iconName) return null;

  const iconMap = {
    ChartLine,
    Puzzle,
    Zap,
    Gem,
  };

  const Icon = iconMap[iconName as keyof typeof iconMap];

  if (!Icon) return null;

  // Make Growth plan icon green
  const iconColor =
    planName === "Growth" ? "text-general-primary" : "text-general-foreground";

  return <Icon className={`h-8 w-8 ${iconColor}`} />;
};

export function LongPlanCard({
  name,
  price,
  tags,
  description,
  features,
  iconName,
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
    return targetIndex > currentIndex
      ? ("UPGRADE" as const)
      : ("DOWNGRADE" as const);
  };

  const action = getActionForPlan();
  const isDisabled = globalLoading || loading || action === "CURRENT";

  const getFeatureTitle = () => {
    if (name === "Starter") return "Advanced Analytics";
    return `Everything in ${name === "Core" ? "Starter" : "Core"}, plus:`;
  };

  return (
    <Card
      className={cn("p-6 flex flex-col h-full gap-0 relative")}
      style={{ minHeight: isDescription ? "500px" : undefined }}
    >
      {isRecommended && (
        <Badge className="absolute -top-3 left-6 bg-linear-to-r from-[#2E6A56] to-[#56A48A] text-white text-[10px] font-medium px-2 py-1 rounded-lg z-10">
          Recommended
        </Badge>
      )}
      <div className="flex  items-center gap-1  border-b border-[#0000000F] pb-4 justify-between">
        <div className="flex items-center gap-2">
          <IconComponent iconName={iconName} planName={name} />
          <h2
            className={cn(
              "text-2xl font-semibold",
              isGradient
                ? "bg-linear-to-r from-[#2E6A56] to-[#56A48A] bg-clip-text text-transparent"
                : "text-general-foreground"
            )}
          >
            {name}
          </h2>
        </div>

        <p className="text-base font-mono text-general-muted-foreground">
          {price}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap items-center  py-4">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="bg-white text-general-foreground py-1 px-2 text-[10px] font-medium"
          >
            {tag}
          </Badge>
        ))}
      </div>

      <p className="text-sm text-primary mb-4">{description}</p>

      {isDescription && (
        <div className="flex-1 flex flex-col bg-foreground-light rounded-lg p-2">
          <h3 className="text-base font-medium text-general-foreground mb-3">
            {getFeatureTitle()}
          </h3>

          <ul className="space-y-1.5">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 pb-2">
                <Check className="h-5 w-5 text-general-border-three shrink-0" />
                <span className="text-sm text-general-foreground">
                  {feature.text}
                </span>
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
                ? "bg-linear-to-r from-[#2E6A56] to-[#56A48A] text-white border-none hover:opacity-90"
                : "bg-transparent text-general-foreground border border-general-border-three hover:bg-[#0F4343]/10"
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
