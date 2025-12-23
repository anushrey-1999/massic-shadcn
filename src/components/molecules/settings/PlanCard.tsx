"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { Typography } from "@/components/ui/typography";

interface PlanCardProps {
  planName: string;
  price: string;
  onClick: () => void;
  businessesLinked: string;
  iconName?: string;
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
  iconName,
  cardBackground = "#F5F5F5",
  isGradientPlanName = false,
  isAddOn = false,
  hasBorder = false,
  isRecommended = false,
}: PlanCardProps) {
  const IconComponent = iconName
    ? (Icons[iconName as keyof typeof Icons] as LucideIcon)
    : null;
  return (
    <Card
      className={cn(
        "shadow-none p-4 flex flex-col gap-2",
        isAddOn ? "bg-foreground-light" : "bg-white",
        hasBorder ? "border border-[#2E6A56]" : "border-none",
        isAddOn && !hasBorder && "border border-[#0000000F]"
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 justify-between w-full">
          <div className="flex items-center gap-2">
            {IconComponent && (
              <IconComponent
                className={cn(
                  "h-7 w-7",
                  isGradientPlanName
                    ? "text-[#2E6A56]"
                    : "text-general-foreground"
                )}
              />
            )}
            <h3
              className={cn(
                "text-2xl font-semibold",
                isGradientPlanName
                  ? "bg-linear-to-r from-[#2E6A56] to-[#56A48A] bg-clip-text text-transparent"
                  : "text-general-foreground"
              )}
            >
              {planName}
            </h3>
            {isRecommended && (
              <Badge className="bg-linear-to-r from-[#2E6A56] to-[#56A48A] text-white text-[10px] font-medium px-2 py-[4.5px] rounded-lg">
                Recommended!
              </Badge>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={onClick}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 ">
        <Badge variant="outline" className="px-2.5 py-1 rounded-full">
          <Typography variant="extraSmall" className="font-medium">
            {isAddOn ? `$${price}` : `${price}/mo per business`}
          </Typography>
        </Badge>

        {!isAddOn ? (
          <Badge
            variant="outline"
            className="bg-foreground-light  px-2.5 py-1 rounded-full border-none"
          >
            <Typography variant="extraSmall" className="font-medium">
              {businessesLinked} businesses linked
            </Typography>
          </Badge>
        ) : (
          <Badge className="bg-[#F0F8F8] text-[#0F4343] border border-[#E0F0F0] text-xs font-medium px-2.5 py-1 rounded-full">
            {businessesLinked}
          </Badge>
        )}
      </div>
    </Card>
  );
}
