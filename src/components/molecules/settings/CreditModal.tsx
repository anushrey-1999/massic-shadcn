"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface CreditModalProps {
  open: boolean;
  onClose: () => void;
  errorMessage?: string;
  currentBalance?: number;
  autoTopupEnabled?: boolean;
  autoTopupThreshold?: number;
}

export function CreditModal({
  open,
  onClose,
  errorMessage,
  currentBalance = 358,
  autoTopupEnabled = false,
  autoTopupThreshold = 0,
}: CreditModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
    setQuantity(value);
  };

  const handlePurchaseCredits = async () => {
    setLoading(true);
    try {
      // Handle purchase credits
      console.log("Purchase credits:", quantity * 100);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Close modal after purchase
      onClose();
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
        className="max-w-md bg-transparent border-none p-0 gap-3"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Purchase Execution Credits</DialogTitle>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-white hover:bg-[#DADBDD]"
            onClick={onClose}
          >
            <X className="h-4 w-4 text-[#4A4A4A]" />
          </Button>
        </div>

        <div className="bg-[#F6F8F8] rounded-xl p-1.5">
          <div className="border border-[#338484] rounded-xl p-4 bg-white">
            {/* Current Credits Balance */}
            <div className="mb-4 p-3 rounded-lg bg-[#F0F8F8] border border-[#E0F0F0]">
              <p className="text-sm font-medium text-[#0F4343]">
                Current Balance: {currentBalance} credits
              </p>
              {autoTopupEnabled && (
                <p className="text-xs text-[#338484] mt-1">
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
              <div>
                <h3 className="text-2xl font-semibold text-[#0F4343]">
                  {totalCredits} Execution Credits
                </h3>
                <p className="text-xl font-semibold text-[#338484] mt-1">
                  ${totalPrice}
                </p>
              </div>

              <div className="flex items-center gap-2">
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
              </div>
            </div>

            <Separator className="my-3 bg-[#00000014]" />

            <div className="flex gap-2 flex-wrap mb-2">
              <Badge
                variant="outline"
                className="text-[#0F4343] text-xs border-[#0F4343]"
              >
                PROPOSALS
              </Badge>
              <Badge
                variant="outline"
                className="text-[#0F4343] text-xs border-[#0F4343]"
              >
                CONTENT
              </Badge>
              <Badge
                variant="outline"
                className="text-[#0F4343] text-xs border-[#0F4343]"
              >
                REVIEWS
              </Badge>
            </div>

            <p className="text-sm text-[#000000DE] mb-1">
              Need more than your plan's monthly limits? Add Execution Credits to scale output instantly.
            </p>
            <p className="text-xs text-[#666666] mb-4">
              Credits are workspace-wide, don't expire, and can be used by any business in your agency.
            </p>

            <div className="flex flex-col gap-2">
              {[
                { text: "1 social post", credits: "3 credits" },
                { text: "1 blog post", credits: "5 credits" },
                { text: "1 proposal", credits: "50 credits" },
              ].map((row) => (
                <div
                  key={row.text}
                  className="flex justify-between items-center p-2.5 rounded-lg bg-[#EDEFF0] text-[#0F4343]"
                >
                  <span className="text-sm font-bold text-[#000000DE]">
                    {row.text}
                  </span>
                  <span className="text-sm text-[#022622]">{row.credits}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-4">
              <Button
                onClick={handlePurchaseCredits}
                disabled={loading}
                className="bg-[#0F4343] hover:bg-[#0C3636] text-white min-w-[120px]"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  `Buy ${totalCredits} Credits`
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

