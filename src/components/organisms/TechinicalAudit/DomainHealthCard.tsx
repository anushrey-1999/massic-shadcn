"use client";

import * as React from "react";
import { Check, CircleAlert, RotateCw } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import type { TechAuditDomainHealthItem } from "@/hooks/use-tech-audit";

function getTone(item: TechAuditDomainHealthItem) {
  if (item.passing) {
    return {
      iconBg: "bg-emerald-100",
      iconFg: "text-emerald-600",
      valueFg: "text-emerald-600",
    };
  }
  return { iconBg: "bg-red-100", iconFg: "text-red-600", valueFg: "text-red-600" };
}

function getValueLabel(item: TechAuditDomainHealthItem) {
  return item.passing ? "Yes" : "No";
}

function getStatusIcon(item: TechAuditDomainHealthItem) {
  return item.passing ? Check : CircleAlert;
}

export function DomainHealthCard({
  domain,
  items,
  lastUpdatedLabel,
  onRegenerate,
  regenerateDisabled,
}: {
  domain: string;
  items: TechAuditDomainHealthItem[];
  lastUpdatedLabel: string;
  onRegenerate?: () => void;
  regenerateDisabled?: boolean;
}) {
  const [regenerateOpen, setRegenerateOpen] = React.useState(false);

  return (
    <Card className="rounded-xl border border-border bg-general-primary-foreground shadow-none py-0 flex flex-col gap-0">
      <div className="flex items-center justify-between border-b border-border px-3 py-4">
        <Typography
          variant="p"
          className="text-base font-mono text-general-foreground"
        >
          {domain || "—"}
        </Typography>

        <div className="flex items-center gap-3">
          <Typography
            variant="p"
            className="text-base font-mono text-general-muted-foreground"
          >
            {lastUpdatedLabel}
          </Typography>
          <Button
            type="button"
            className="gap-2"
            onClick={() => setRegenerateOpen(true)}
            disabled={regenerateDisabled}
            variant="default"
            size="sm"
          >
            <RotateCw className="h-4 w-4" />
            Regenerate
          </Button>
        </div>
      </div>

      <div className="w-full">
        <div className="flex w-full">
          {items.map((item, idx) => {
            const tone = getTone(item);
            const value = getValueLabel(item);
            const StatusIcon = getStatusIcon(item);

            return (
              <div
                key={item.key}
                className={cn(
                  "flex flex-col gap-0.5 p-3",
                  "min-w-0 flex-1",
                  idx !== items.length - 1 && "border-r border-border"
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full",
                      tone.iconBg,
                      tone.iconFg
                    )}
                  >
                    <StatusIcon className="h-4 w-4" />
                  </div>
                  <Typography variant="p" className="text-base font-medium text-general-foreground">
                    {item.label}
                  </Typography>
                </div>

                <div className="pl-[33px]">
                  <Typography
                    variant="p"
                    className={cn("flex items-center gap-2 text-base font-mono", tone.valueFg)}
                  >
                    {value}
                  </Typography>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-4 rounded-xl border border-border bg-white p-6 sm:max-w-[640px]"
        >
          <DialogHeader className="gap-0">
            <DialogTitle className="font-sans text-2xl font-semibold tracking-[-0.48px] text-general-foreground">
              Regenerate Technical Audit?
            </DialogTitle>
          </DialogHeader>

          <Separator />

          <div className="space-y-8">
            <div className="space-y-2 font-sans">
              <p className="text-sm leading-normal tracking-[0.07px] text-[rgba(0,0,0,0.87)]">
                Regenerating will request a fresh technical audit for this business.
                Your current results will stay visible until the new audit starts.
              </p>
              <p className="text-xs leading-normal tracking-[0.18px] text-general-muted-foreground">
                If your included technical-audit usage is exhausted, we’ll ask you to apply
                execution credits before the audit runs.
              </p>
            </div>

            <Button
              type="button"
              className="h-10 w-full rounded-lg font-sans text-sm font-medium"
              disabled={regenerateDisabled}
              onClick={() => {
                onRegenerate?.();
                setRegenerateOpen(false);
              }}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

