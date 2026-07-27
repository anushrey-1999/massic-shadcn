"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { normalizeDomainForFavicon } from "@/utils/utils";

const FAVICON_URL = "https://www.google.com/s2/favicons?domain=";

type Props = {
  website?: string | null;
  businessName?: string | null;
  isLoading?: boolean;
  className?: string;
};

export function PublicBusinessFavicon({ website, businessName, isLoading = false, className }: Props) {
  const [imgError, setImgError] = React.useState(false);
  const normalizedDomain = normalizeDomainForFavicon(website || undefined);
  const fallbackInitial = businessName?.trim().charAt(0).toUpperCase() || "M";

  if (isLoading) {
    return (
      <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm", className)}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
      </div>
    );
  }

  if (!normalizedDomain || imgError) {
    return (
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white text-lg font-medium text-neutral-700 shadow-sm",
          className
        )}
      >
        {fallbackInitial}
      </div>
    );
  }

  return (
    <div className={cn("flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm", className)}>
      <img
        src={`${FAVICON_URL}${normalizedDomain}&sz=96`}
        alt=""
        width={40}
        height={40}
        className="h-full w-full object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  );
}
