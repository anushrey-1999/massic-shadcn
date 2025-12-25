"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ExpandablePillsProps {
  items: string[];
  maxCollapsedItems?: number;
  className?: string;
  pillVariant?: "default" | "secondary" | "outline" | "destructive";
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function ExpandablePills({
  items,
  maxCollapsedItems: _maxCollapsedItems = 2,
  className,
  pillVariant = "outline",
  expanded,
  onExpandedChange,
}: ExpandablePillsProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = React.useState(false);

  const isControlled = typeof expanded === "boolean";
  const isExpanded = isControlled ? expanded : uncontrolledExpanded;

  const setIsExpanded = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledExpanded(next);
      onExpandedChange?.(next);
    },
    [isControlled, onExpandedChange]
  );

  if (!items || items.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn("h-7 px-2 gap-1 font-medium shadow-none", className)}
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(true);
        }}
      >
        <span className="text-xs">{items.length}</span>
        <ChevronDown className="h-2 w-2 text-general-border-three" />
      </Button>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1 items-start", className)}>
      {items.map((item) => (
        <Badge key={item} variant={pillVariant} className=" ">
          {item}
        </Badge>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-5 w-5 p-0 shadow-none"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(false);
        }}
      >
        <ChevronUp className="h-2 w-2 text-general-border-three" />
      </Button>
    </div>
  );
}
