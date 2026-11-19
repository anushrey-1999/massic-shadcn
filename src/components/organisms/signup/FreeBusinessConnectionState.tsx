"use client";

import Link from "next/link";

import { GoogleIcon } from "@/components/organisms/access-request/GoogleIcon";
import { ProductIcon } from "@/components/organisms/access-request/ProductIcon";
import { Button } from "@/components/ui/button";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { GOOGLE_SOURCE_ORDER, GOOGLE_SOURCES } from "@/lib/google-sources";

interface FreeBusinessConnectionStateProps {
  businessId: string;
  businessName: string;
  onConnect: () => void;
}

/** Analytics placeholder for a business with no Google source connected yet. */
export function FreeBusinessConnectionState({
  businessId,
  businessName,
  onConnect,
}: FreeBusinessConnectionStateProps) {
  return (
    <section className="animate-in fade-in-0 slide-in-from-bottom-1 flex w-full max-w-4xl flex-col gap-4 p-7 duration-300">
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-general-foreground">
          Welcome, {businessName || "there"}
        </h2>
        <p className="text-sm text-general-muted-foreground">
          Connect at least one Google source to see your numbers. Each takes
          about a minute.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {GOOGLE_SOURCE_ORDER.map((source) => (
          <div
            key={source}
            className="flex flex-col gap-3 rounded-lg border border-general-border bg-white p-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-general-secondary">
                <ProductIcon product={source} size={16} />
              </span>
              <h3 className="text-sm font-medium text-general-foreground">
                {GOOGLE_SOURCES[source].label}
              </h3>
            </div>
            <p className="flex-1 text-xs text-general-muted-foreground">
              See {GOOGLE_SOURCES[source].unlocks}.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onConnect}
            >
              <GoogleIcon className="size-4" />
              Connect with Google
            </Button>
          </div>
        ))}
      </div>
      <BusinessSummary businessId={businessId} businessName={businessName} />
    </section>
  );
}

function BusinessSummary({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const { data: job } = useJobByBusinessId(businessId);
  const details = [
    job?.primary_category,
    job?.secondary_category,
    job?.location,
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-general-secondary px-4 py-3">
      <p className="min-w-0 text-xs text-general-muted-foreground">
        <span className="font-medium text-general-foreground">
          {job?.business_name || businessName}
        </span>
        {details.map((detail) => ` · ${detail}`).join("")}
      </p>
      <Button asChild variant="ghost" size="sm">
        <Link href={`/business/${businessId}/profile`}>Edit profile</Link>
      </Button>
    </div>
  );
}
