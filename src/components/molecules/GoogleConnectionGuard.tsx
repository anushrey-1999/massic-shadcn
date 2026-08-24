"use client";

import React from "react";
import { usePathname } from "next/navigation";

import { ConnectGoogleEmptyState } from "@/components/molecules/ConnectGoogleEmptyState";
import {
  useBusinessConnections,
  type BusinessConnectionsState,
  type GoogleIntegration,
} from "@/hooks/use-business-connections";

interface GoogleConnectionGuardProps {
  children: React.ReactNode;
  /** Integrations that unlock this route. The guard passes if any one is connected. */
  requires: GoogleIntegration[];
  /** Falls back to the business id in the URL when omitted. */
  businessId?: string;
  /** What the page shows, used in the empty-state copy. */
  subject?: string;
}

function isSatisfied(
  connections: BusinessConnectionsState,
  requires: GoogleIntegration[]
): boolean {
  return requires.some((requirement) => {
    if (requirement === "gsc") return connections.isGscConnected;
    if (requirement === "ga4") return connections.isGa4Connected;
    return connections.isGbpConnected;
  });
}

/**
 * Route-level counterpart to the per-hook connection gate.
 *
 * Replaces a page that would otherwise render nothing but empty charts and
 * failed requests with a prompt to link a Google account.
 */
export function GoogleConnectionGuard({
  children,
  requires,
  businessId,
  subject,
}: GoogleConnectionGuardProps) {
  const pathname = usePathname();
  const resolvedBusinessId =
    businessId || pathname.match(/^\/business\/([^/]+)/)?.[1] || null;

  const connections = useBusinessConnections(resolvedBusinessId);

  // Without a business there is nothing to gate; let the page handle it.
  if (!resolvedBusinessId) {
    return <>{children}</>;
  }

  // Render nothing rather than flashing the prompt before the profile resolves.
  if (!connections.isResolved) {
    return null;
  }

  if (isSatisfied(connections, requires)) {
    return <>{children}</>;
  }

  return <ConnectGoogleEmptyState requires={requires} subject={subject} />;
}
