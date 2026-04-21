"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Clock } from "lucide-react";
import { useAccessRequestStatus } from "@/hooks/use-access-request-flow";
import { PRODUCT_CONFIG } from "@/config/access-request";
import { ProductIcon } from "@/components/organisms/access-request/ProductIcon";
import type { Product } from "@/types/access-request";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function getApiBaseUrl(): string {
  return (
    "http://localhost:4922/api/1"
    // process.env.NEXT_PUBLIC_NODE_API_URL ||
  );
}

export default function AccessRequestLandingPage() {
  const params = useParams();
  const token = params.token as string;
  const { data, isLoading, isError, error } = useAccessRequestStatus(token);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-general-primary" />
      </div>
    );
  }

  const isExpired =
    data?.requestStatus === "expired" ||
    (data?.steps?.[0] && new Date() > new Date(data.steps[0].createdAt));

  if (isError || (!data && !isLoading)) {
    const is410 = (error as any)?.response?.status === 410;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {is410 ? "Link Expired" : "Invalid Link"}
            </h2>
            <p className="text-sm text-gray-500">
              {is410
                ? "This access request link has expired. Please contact the agency for a new link."
                : "This access request link is invalid or no longer available."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data?.requestStatus === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Link Expired</h2>
            <p className="text-sm text-gray-500">
              This access request has expired. Please contact the agency for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data?.requestStatus === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">All Done!</h2>
            <p className="text-sm text-gray-500">
              All access requests have been completed. You can close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const products = data?.request?.products || data?.steps?.map((s) => s.product as Product) || [];
  const agencyEmail = data?.request?.agencyEmail || "the agency";
  const expiresAt = data?.request?.expiresAt;

  function handleContinue() {
    const baseUrl = getApiBaseUrl();
    window.location.href = `${baseUrl}/access-request/auth/google/start?token=${token}`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardContent className="pt-8 pb-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-xl bg-general-primary/10 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="currentColor" className="text-general-primary" />
                <path d="M8 16l6 6L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Grant Access</h1>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              Sign in with Google to grant access to your accounts. This is a
              one-time process.
            </p>
          </div>

          {/* Products list */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Access requested for
            </p>
            <div className="space-y-2">
              {products.map((product) => {
                const config = PRODUCT_CONFIG[product];
                return (
                  <div
                    key={product}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <ProductIcon product={product} size={24} />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {config?.label || product}
                      </span>
                    </div>
                    {!config?.automated && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-orange-200 text-orange-600 bg-orange-50"
                      >
                        Manual
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <Button
            className="w-full h-12 text-base font-medium"
            onClick={handleContinue}
          >
            <GoogleIcon />
            <span className="ml-2">Continue with Google</span>
          </Button>

          {/* Footer info */}
          <div className="text-center space-y-1.5">
            <p className="text-xs text-gray-500">
              Access will be granted to{" "}
              <span className="font-mono font-medium">{agencyEmail}</span>
            </p>
            {expiresAt && (
              <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
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
