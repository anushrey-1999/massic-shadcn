"use client";

import { createContext, useContext, type ReactNode } from "react";

import { GoogleIcon } from "@/components/organisms/access-request/GoogleIcon";
import { ProductIcon } from "@/components/organisms/access-request/ProductIcon";
import { Button } from "@/components/ui/button";
import {
  useBusinessConnections,
  type GoogleIntegration,
} from "@/hooks/use-business-connections";
import { GOOGLE_SOURCES, isGoogleSourceConnected } from "@/lib/google-sources";
import { cn } from "@/lib/utils";

interface GoogleSourceGateContextValue {
  businessId: string;
  onConnect: (source: GoogleIntegration) => void;
}

const GoogleSourceGateContext =
  createContext<GoogleSourceGateContextValue | null>(null);

/**
 * Turns on connect notices for every `GoogleSourceGate` below it. Pass `null`
 * to keep gates transparent, so pages opt in per audience.
 */
export function GoogleSourceGateProvider({
  value,
  children,
}: {
  value: GoogleSourceGateContextValue | null;
  children: ReactNode;
}) {
  return (
    <GoogleSourceGateContext.Provider value={value}>
      {children}
    </GoogleSourceGateContext.Provider>
  );
}

/** Sources that are gated and not connected; empty when gates are off. */
function useMissingGoogleSources(
  sources: readonly GoogleIntegration[],
): GoogleIntegration[] {
  const gate = useContext(GoogleSourceGateContext);
  const connections = useBusinessConnections(gate?.businessId);
  if (!gate || !connections.isResolved) return [];
  return sources.filter(
    (source) => !isGoogleSourceConnected(connections, source),
  );
}

/** Renders its children only when the source is connected. */
export function GoogleSourceGate({
  source,
  children,
}: {
  source: GoogleIntegration;
  children: ReactNode;
}) {
  const missing = useMissingGoogleSources([source]).length > 0;
  return missing ? null : <>{children}</>;
}

/** One connect notice per missing source, meant to sit above gated content. */
export function GoogleSourceNotices({
  sources,
  unlocks,
  className,
}: {
  sources: readonly GoogleIntegration[];
  /** Overrides the default "what you'll see" copy per source. */
  unlocks?: Partial<Record<GoogleIntegration, string>>;
  className?: string;
}) {
  const gate = useContext(GoogleSourceGateContext);
  const missing = useMissingGoogleSources(sources);
  if (!gate || missing.length === 0) return null;

  return (
    <div className={cn("px-7 pt-5", className)}>
      <div className="animate-in fade-in-0 divide-y divide-general-border rounded-lg border border-general-border bg-white duration-300">
        {missing.map((source) => (
          <GoogleSourceNotice
            key={source}
            source={source}
            unlocks={unlocks?.[source]}
            onConnect={() => gate.onConnect(source)}
          />
        ))}
      </div>
    </div>
  );
}

export function GoogleSourceNotice({
  source,
  unlocks,
  className,
  onConnect,
}: {
  source: GoogleIntegration;
  unlocks?: string;
  className?: string;
  onConnect: () => void;
}) {
  const config = GOOGLE_SOURCES[source];

  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-general-secondary">
        <ProductIcon product={source} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-general-foreground">
          {config.label} is not connected
        </p>
        <p className="text-xs text-general-muted-foreground">
          Connect it to see {unlocks ?? config.unlocks}.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={onConnect}
      >
        <GoogleIcon className="size-4" />
        Connect
      </Button>
    </div>
  );
}
