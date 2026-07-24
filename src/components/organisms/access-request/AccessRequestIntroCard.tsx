"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PRODUCT_CONFIG } from "@/config/access-request";
import type { Product } from "@/types/access-request";
import { Clock, Loader2 } from "lucide-react";
import { GoogleIcon } from "./GoogleIcon";
import { ProductIcon } from "./ProductIcon";

interface AccessRequestIntroCardProps {
  agencyEmail: string;
  agencyName: string;
  expiresAt?: string | null;
  isPreparingSession?: boolean;
  onContinue: () => void;
  products: Product[];
}

export function AccessRequestIntroCard({
  agencyEmail,
  agencyName,
  expiresAt,
  isPreparingSession = false,
  onContinue,
  products,
}: AccessRequestIntroCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardContent className="space-y-6 pb-8 pt-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-general-primary/10">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="currentColor" className="text-general-primary" />
                <path d="M8 16l6 6L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Help connect {agencyName} to Massic</h1>
            <p className="mx-auto max-w-xs text-sm text-gray-500">
              You do not need access to everything. Massic will check what your Google account can access and only
              ask you to help with the parts you control.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Access needed for</p>
            <div className="space-y-2">
              {products.map((product) => {
                const config = PRODUCT_CONFIG[product];

                return (
                  <div key={product} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                    <ProductIcon product={product} size={24} />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">
                        {config?.label || product}
                      </span>
                    </div>
                    {!config?.automated && config?.showManualBadge !== false && (
                      <Badge variant="outline" className="border-orange-200 bg-orange-50 text-[10px] text-orange-600">
                        Manual
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Button className="h-12 w-full text-base font-medium" disabled={isPreparingSession} onClick={onContinue}>
            {isPreparingSession ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon className="h-5 w-5" />}
            <span className="ml-2">{isPreparingSession ? "Preparing your access check" : "Continue with Google"}</span>
          </Button>

          <div className="space-y-1.5 text-center">
            <p className="text-xs text-gray-500">
              Massic access email: <span className="font-mono font-medium">{agencyEmail}</span>
            </p>
            {expiresAt && (
              <p className="flex items-center justify-center gap-1 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                Link expires{" "}
                {new Date(expiresAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
