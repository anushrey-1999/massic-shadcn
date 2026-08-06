"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  captureMassicRoute,
  clearMassicAnalyticsIdentity,
  getMassicRouteContext,
  identifyMassicUser,
  isPostHogEnabled,
} from "@/lib/analytics/posthog-client";
import { useAuthStore } from "@/store/auth-store";

export function PostHogAnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const activeIdentityRef = useRef<string | null>(null);
  const lastRouteRef = useRef<string | null>(null);

  const userId = user?.userUniqueId || user?.id;
  const agencyId = user?.accountUniqueId || user?.uniqueId || user?.UniqueId;

  useEffect(() => {
    if (!isPostHogEnabled()) return;

    if (!isAuthenticated || !userId || !agencyId) {
      if (activeIdentityRef.current) {
        clearMassicAnalyticsIdentity();
        activeIdentityRef.current = null;
        lastRouteRef.current = null;
      }
      return;
    }

    const identityKey = `${userId}:${agencyId}`;
    if (activeIdentityRef.current !== identityKey) {
      identifyMassicUser({
        userId: String(userId),
        agencyId: String(agencyId),
        accountRole: user.accountRole,
        roleName: user.rolename,
        userType: user.userType,
        isTeamMember: Boolean(user.isTeamMember),
      });
      activeIdentityRef.current = identityKey;
      lastRouteRef.current = null;
    }
  }, [agencyId, isAuthenticated, user, userId]);

  useEffect(() => {
    if (!isPostHogEnabled() || !isAuthenticated || !userId || !agencyId) return;

    const context = getMassicRouteContext(pathname);
    if (!context) return;

    const routeKey = `${userId}:${agencyId}:${pathname}`;
    if (lastRouteRef.current === routeKey) return;

    captureMassicRoute(context);
    lastRouteRef.current = routeKey;
  }, [agencyId, isAuthenticated, pathname, userId]);

  return <>{children}</>;
}
