"use client";

import type * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentPlanWidget } from "./agent-plan-widget";
import type { WidgetPart } from "./types";

type Props = {
  businessId: string;
  part: WidgetPart;
  onClose: () => void;
  width: number;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
};

function artifactTitle(part: WidgetPart): string {
  if (part.resource.type === "webpage_plan") {
    return `Plan #${String(part.resource.id)}`;
  }
  return `${part.widget || "Artifact"} #${String(part.resource.id)}`;
}

export function AgentArtifactPanel({
  businessId,
  part,
  onClose,
  width,
  onResizeStart,
}: Props) {
  return (
    <aside
      className="relative flex h-full min-w-[360px] max-w-[760px] shrink-0 flex-col border-l border-border bg-background"
      style={{ width }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize artifact panel"
        tabIndex={0}
        onPointerDown={onResizeStart}
        className="absolute -left-1 top-0 z-10 h-full w-2 cursor-col-resize touch-none hover:bg-general-primary/20"
      />
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Artifact
          </p>
          <h2 className="truncate text-sm font-semibold text-foreground">
            {artifactTitle(part)}
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close artifact"
          className="shrink-0 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        {part.resource.type === "webpage_plan" ? (
          <AgentPlanWidget
            businessId={businessId}
            part={part}
            className="mt-0 h-full"
          />
        ) : (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            This artifact type is not supported yet.
          </div>
        )}
      </div>
    </aside>
  );
}
