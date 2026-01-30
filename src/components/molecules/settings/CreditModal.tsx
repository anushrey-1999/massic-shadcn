"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, ArrowLeft, Gem, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface CreditModalProps {
  open: boolean;
  onClose: () => void;
  errorMessage?: string;
  currentBalance?: number;
  autoTopupEnabled?: boolean;
  autoTopupThreshold?: number;
  onPurchaseCredits?: (params?: { quantity: number }) => Promise<void>;
  description?: string;
  alertMessage?: string;
}

export function CreditModal({
  open,
  onClose,
  errorMessage,
  currentBalance = 0,
  autoTopupEnabled = false,
  autoTopupThreshold = 0,
  onPurchaseCredits,
  description = "Need extra content or campaigns this month? Use Execution Credits to instantly scale blogs and posts.",
  alertMessage,
}: CreditModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
    setQuantity(value);
  };

  const handlePurchaseCredits = async () => {
    if (!onPurchaseCredits) return;
    setLoading(true);
    try {
      await onPurchaseCredits({ quantity });
      // Modal closing is usually handled after external action or we can keep it open
      // In this flow, we redirect to checkout so closing might not matter as page will unload
    } catch (error) {
      console.error("Failed to purchase credits:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalCredits = quantity * 100;
  const totalPrice = quantity * 100; // $1 per credit

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md bg-transparent border-none p-0 gap-3 shadow-none"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          Purchase Execution Credits
        </DialogTitle>
        <div className="flex items-start gap-3 -mt-12">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 bg-white shadow-sm shrink-0 h-12"
            onClick={onClose}
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Button>
          {alertMessage && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 min-h-12 flex-1">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-800 flex-1 break-words">{alertMessage}</p>
            </div>
          )}
        </div>

        <div className="rounded-lg p-6 bg-white">
          <div className="">
            {/* Current Credits Balance */}
            <div className="mb-4 p-3 rounded-lg bg-[#F0F8F8] ">
              <p className="text-sm font-medium text-general-primary">
                Current Balance: {currentBalance} credits
              </p>
              {autoTopupEnabled && (
                <p className="text-xs text-general-primary mt-1">
                  Auto-topup enabled (threshold: {autoTopupThreshold} credits)
                </p>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-[#FFF3E0] border border-[#FFB74D]">
                <p className="text-sm font-medium text-[#E65100]">
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 justify-between w-full">
                <div className="flex items-center gap-2">
                  <Gem />
                  <h3 className="text-2xl font-semibold text-general-foreground">
                    {totalCredits} Execution Credits
                  </h3>
                </div>
                <p className="text-base font-mono text-general-muted-foreground">
                  ${totalPrice}
                </p>
              </div>

              {/* <div className="flex items-center gap-2">
                <Label htmlFor="quantity" className="text-sm font-medium text-[#0F4343]">
                  Quantity:
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={10}
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="w-16 text-center"
                />
              </div> */}
            </div>

            <Separator className="my-3 bg-general-border" />

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

            <p className="text-sm text-primary py-4">
              {description}
            </p>
            {/* <p className="text-xs text-[#666666] mb-4">
              Credits are workspace-wide, don't expire, and can be used by any
              business in your agency.
            </p> */}

            <div className="flex flex-col gap-2">
              {[
                { text: "1 social post", credits: "3 credits" },
                { text: "1 blog post", credits: "5 credits" },
                { text: "1 snapshot pitch", credits: "10 credits" },
                { text: "1 detailed pitch", credits: "100 credits" },
              ].map((row) => (
                <div
                  key={row.text}
                  className="flex justify-between items-center p-3 rounded-lg bg-foreground-light "
                >
                  <span className="text-base font-medium text-general-foreground">
                    {row.text}
                  </span>
                  <span className="text-base font-mono text-general-muted-foreground">{row.credits}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-4">
              <Button
                onClick={handlePurchaseCredits}
                disabled={loading}
                variant="default"
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  `Buy Credits`
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
