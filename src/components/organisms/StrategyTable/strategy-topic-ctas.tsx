"use client";

import Link from "next/link";
import { ExternalLink, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { StrategyRow } from "@/types/strategy-types";

function buildWhatIsCoveredHref(businessId: string, row: StrategyRow): string {
  const params = new URLSearchParams();
  params.set("tab", "organic");
  params.set("topicName", row.topic);

  return `/business/${encodeURIComponent(businessId)}/analytics?${params.toString()}`;
}

function buildActionsToCoverHref(businessId: string, row: StrategyRow): string {
  const params = new URLSearchParams();
  params.set("topicName", row.topic);

  return `/business/${encodeURIComponent(businessId)}/strategy/topic?${params.toString()}`;
}

interface StrategyTopicCtasProps {
  businessId?: string;
  row: StrategyRow;
  className?: string;
}

export function StrategyTopicCtas({
  businessId,
  row,
  className,
}: StrategyTopicCtasProps) {
  const hasCoverage = Number(row.topic_cluster_topic_coverage || 0) > 0;
  if (!businessId) return null;

  const whatIsCoveredHref = buildWhatIsCoveredHref(businessId, row);
  const actionsToCoverHref = buildActionsToCoverHref(businessId, row);

  return (
    <div
      className={cn(
        "ml-2 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        className
      )}
    >
      {hasCoverage ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 rounded-[8px] text-muted-foreground hover:text-general-foreground"
            >
              <Link
                href={whatIsCoveredHref}
                aria-label="What is covered"
                onClick={(event) => event.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            What is covered
          </TooltipContent>
        </Tooltip>
      ) : null}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-[8px] text-muted-foreground hover:text-general-foreground"
          >
            <Link
              href={actionsToCoverHref}
              aria-label="Actions to cover"
              onClick={(event) => event.stopPropagation()}
            >
              <ListTodo className="h-4 w-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          Actions to cover
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
