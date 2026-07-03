"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { toastPermissionDenied } from "@/lib/toast-permission-denied";
import {
  ACCOUNT_ROLES,
  ANALYST_RESTRICTED_MESSAGE,
  getDefaultPermissions,
  type AccountRole,
  type Permission,
  type PermissionMap,
} from "@/lib/permissions";
import {
  canPerformFeatureAction,
  getFeatureActionRestrictedMessage,
  type FeatureActionKey,
} from "@/lib/role-feature-actions";

export function useCurrentUserRole(): AccountRole {
  const user = useAuthStore((state) => state.user);
  return (user?.accountRole || (user?.isTeamMember ? ACCOUNT_ROLES.ANALYST : ACCOUNT_ROLES.OWNER)) as AccountRole;
}

export function usePermissions(): PermissionMap {
  const user = useAuthStore((state) => state.user);
  const role = useCurrentUserRole();
  const defaults = getDefaultPermissions(role);

  return {
    canManageTeam: Boolean(user?.canManageTeam ?? defaults.canManageTeam),
    canManageBilling: Boolean(user?.canManageBilling ?? defaults.canManageBilling),
    canManageSettings: Boolean(user?.canManageSettings ?? defaults.canManageSettings),
    canManageLinkedBusinesses: Boolean(user?.canManageLinkedBusinesses ?? defaults.canManageLinkedBusinesses),
    canGenerateContent: Boolean(user?.canGenerateContent ?? defaults.canGenerateContent),
    canUseAccessRequests: Boolean(user?.canUseAccessRequests ?? defaults.canUseAccessRequests),
    canGenerateReports: Boolean(user?.canGenerateReports ?? defaults.canGenerateReports),
    canViewLinkedBusinesses: Boolean(user?.canViewLinkedBusinesses ?? defaults.canViewLinkedBusinesses),
  };
}

export function useCan(permission: Permission): boolean {
  const permissions = usePermissions();
  return Boolean(permissions[permission]);
}

export function useCanFeatureAction(actionKey: FeatureActionKey): boolean {
  const permissions = usePermissions();
  const role = useCurrentUserRole();
  return canPerformFeatureAction({ actionKey, permissions, role });
}

export function useRoleGuard({
  allowedRoles,
  fallbackPath = "/",
}: {
  allowedRoles: AccountRole[];
  fallbackPath?: string;
}) {
  const role = useCurrentUserRole();
  const router = useRouter();
  const allowed = allowedRoles.includes(role);

  useEffect(() => {
    if (!allowed) {
      router.replace(fallbackPath);
    }
  }, [allowed, fallbackPath, router]);

  return allowed;
}

export function useRestrictedAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => TResult,
  permission: Permission,
  message = ANALYST_RESTRICTED_MESSAGE
) {
  const can = useCan(permission);

  return useCallback((...args: TArgs) => {
    if (!can) {
      toastPermissionDenied(message);
      return undefined;
    }
    return action(...args);
  }, [action, can, message]);
}

export function useFeatureActionGuard(
  actionKey: FeatureActionKey,
  message = getFeatureActionRestrictedMessage(actionKey)
) {
  const can = useCanFeatureAction(actionKey);

  return useCallback(() => {
    if (!can) {
      toastPermissionDenied(message);
      return false;
    }
    return true;
  }, [can, message]);
}

export function useRestrictedFeatureAction<TArgs extends unknown[], TResult>(
  actionKey: FeatureActionKey,
  action: (...args: TArgs) => TResult,
  message = getFeatureActionRestrictedMessage(actionKey)
) {
  const guard = useFeatureActionGuard(actionKey, message);

  return useCallback((...args: TArgs) => {
    if (!guard()) {
      return undefined;
    }
    return action(...args);
  }, [action, guard]);
}
