"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  access_denied: {
    title: "Access Denied",
    description:
      "You declined the permission request. You can try again by clicking the original link.",
  },
  auth_failed: {
    title: "Authentication Failed",
    description:
      "Something went wrong during the Google sign-in process. Please try again.",
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "auth_failed";
  const errorInfo = ERROR_MESSAGES[reason] || {
    title: "Something Went Wrong",
    description: reason || "An unexpected error occurred. Please try again or contact the agency.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardContent className="pt-8 pb-8 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-gray-900">
              {errorInfo.title}
            </h1>
            <p className="text-sm text-gray-500">{errorInfo.description}</p>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>

          <p className="text-xs text-gray-400">
            If the problem persists, please contact the agency that sent you the
            link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccessRequestErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
