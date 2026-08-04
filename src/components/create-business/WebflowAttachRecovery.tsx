"use client";

import React from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileGateCard } from "@/components/templates/ProfileGateCard";
import { PlatformIcon } from "@/components/organisms/WebChannels/platform-icon";
import { CreateBusinessGateLayout } from "./CreateBusinessGateLayout";

export function WebflowAttachRecovery({
  message,
  isRetrying,
  onRetry,
  onContinue,
}: {
  message: string;
  isRetrying: boolean;
  onRetry: () => void | Promise<void>;
  onContinue: () => void;
}) {
  return (
    <CreateBusinessGateLayout>
      <ProfileGateCard
        title="Business created"
        description="Your profile is ready, but Webflow still needs to be attached."
        className="w-full max-w-[520px]"
      >
        <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <PlatformIcon platform="webflow" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-general-foreground">
              <AlertCircle className="size-4 shrink-0 text-destructive" />
              Webflow connection incomplete
            </p>
            <p className="mt-1 text-xs leading-5 text-general-muted-foreground">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onContinue}
            disabled={isRetrying}
          >
            Continue without Webflow
          </Button>
          <Button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="gap-2 bg-general-primary text-general-primary-foreground hover:bg-general-primary/90"
          >
            {isRetrying ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="size-4" />
                Retry Webflow connection
              </>
            )}
          </Button>
        </div>
      </ProfileGateCard>
    </CreateBusinessGateLayout>
  );
}
