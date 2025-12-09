"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  planName: string;
  price: string;
  onClick: () => void;
  businessesLinked: string;
  cardBackground?: string;
  isGradientPlanName?: boolean;
  hasBorder?: boolean;
  isRecommended?: boolean;
  isAddOn?: boolean;
}

export function PlanCard({
  planName,
  price,
  onClick,
  businessesLinked,
  cardBackground = "#F5F5F5",
  isGradientPlanName = false,
  isAddOn = false,
  hasBorder = false,
  isRecommended = false,
}: PlanCardProps) {
  return (
    <Card
      className={cn(
        "p-3",
        hasBorder && "border-[#338484]",
        isAddOn && "border-[#0000000F]"
      )}
      style={{ backgroundColor: cardBackground }}
    >
      <div className="flex justify-between items-center pb-1 border-b border-[#0000000F] mb-1">
        <span className="text-xs font-medium text-[#00000099]">
          {isAddOn ? "Add-On" : "Plan"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClick}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <h3
          className={cn(
            "text-xl font-semibold",
            isGradientPlanName
              ? "bg-gradient-to-r from-[#338484] via-[#5BA5A5] to-[#8BC6C6] bg-clip-text text-transparent"
              : isAddOn
                ? "text-[#0F4343]"
                : "text-[#338484]"
          )}
        >
          {planName}
        </h3>

        {isRecommended && (
          <Badge
            className="bg-gradient-to-r from-[#338484] to-[#8BC6C6] text-white text-[10px] font-normal uppercase px-1.5 py-0.5 rounded"
          >
            RECOMMENDED
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="text-xs text-[#00000099]">
          {isAddOn ? `$${price}` : `${price}/mo per business`}
        </span>

        {!isAddOn ? (
          <Badge
            variant="outline"
            className="bg-[#00000014] text-[#000000DE] text-xs font-normal px-2.5 py-1 rounded-full"
          >
            {businessesLinked} businesses linked
          </Badge>
        ) : (
          <Badge
            className="bg-[#F0F8F8] text-[#0F4343] border border-[#E0F0F0] text-xs font-medium px-2.5 py-1 rounded-full"
          >
            {businessesLinked}
          </Badge>
        )}
      </div>
    </Card>
  );
}

