"use client";

import { ArrowLeft, Gem, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ApplyCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyCredits: () => void;
  creditsBalance: number;
  creditsToApply: number;
  reportType: "snapshot" | "detailed";
  isApplying?: boolean;
}

export function ApplyCreditsModal({
  open,
  onOpenChange,
  onApplyCredits,
  creditsBalance,
  creditsToApply,
  reportType,
  isApplying = false,
}: ApplyCreditsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px] p-0 overflow-visible bg-transparent border-none shadow-none"
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>Apply Execution Credits</DialogTitle>
        </VisuallyHidden>

        <div className="flex items-center gap-3 -mt-12">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 bg-white shadow-sm h-12"
            onClick={() => onOpenChange(false)}
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Button>
        </div>

        <div className="bg-white rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gem className="h-6 w-6" />
              <h3 className="text-2xl font-semibold text-general-foreground tracking-tight">
                Execution Credits
              </h3>
            </div>
            <p className="text-base font-mono text-general-muted-foreground">
              {creditsBalance} credits remaining
            </p>
          </div>

          <Separator className="bg-general-border" />

          <div className="flex flex-col gap-4">
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-general-foreground text-[10px] px-2 py-[4.5px]"
              >
                Pitches
              </Badge>
              <Badge
                variant="outline"
                className="text-general-foreground text-[10px] px-2 py-[4.5px]"
              >
                Content
              </Badge>
              <Badge
                variant="outline"
                className="text-general-foreground text-[10px] px-2 py-[4.5px]"
              >
                Reviews
              </Badge>
            </div>

            <p className="text-sm text-primary">
              More prospects in the pipeline? Execution Credits help surface clear opportunity and upside.
            </p>

            <div className="flex flex-col gap-2">
              {[
                { label: "1 social post", credits: "3 credits", type: null },
                { label: "1 blog post", credits: "5 credits", type: null },
                { label: "1 snapshot pitch", credits: "10 credits", type: "snapshot" as const },
                { label: "1 detailed pitch", credits: "100 credits", type: "detailed" as const },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex justify-between items-center p-3 rounded-xl ${item.type === reportType
                      ? "bg-general-primary/10 border border-general-primary"
                      : "bg-foreground-light"
                    }`}
                >
                  <span className="text-base font-medium text-general-foreground">
                    {item.label}
                  </span>
                  <span className="text-base font-mono text-general-muted-foreground">
                    {item.credits}
                  </span>
                </div>
              ))}
            </div>

            <Button
              onClick={onApplyCredits}
              disabled={isApplying || creditsBalance < creditsToApply}
              variant="default"
              className="w-full"
            >
              {isApplying ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                `Apply ${creditsToApply} Credits`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
