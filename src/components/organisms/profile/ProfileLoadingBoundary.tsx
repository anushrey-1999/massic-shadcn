"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error";

/** Reveal a hydrated profile once; refreshes must not unmount user drafts. */
export function ProfileLoadingBoundary({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean;
  error?: unknown;
  onRetry: () => Promise<unknown>;
  children: ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const ready = !loading && !error;
  useEffect(() => {
    if (ready) setRevealed(true);
  }, [ready]);

  if (revealed || ready) return <>{children}</>;
  if (error) {
    return (
      <div
        role="alert"
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center"
      >
        <p className="text-sm font-medium">Couldn't load the profile</p>
        <p className="max-w-md text-sm text-general-muted-foreground">
          {apiErrorMessage(error)}
        </p>
        <Button
          variant="outline"
          disabled={retrying}
          onClick={async () => {
            setRetrying(true);
            try {
              await onRetry();
            } finally {
              setRetrying(false);
            }
          }}
        >
          {retrying ? "Retrying…" : "Retry"}
        </Button>
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-12"
    >
      <Loader size="lg" />
      <p className="text-sm text-general-muted-foreground">Loading profile…</p>
    </div>
  );
}
