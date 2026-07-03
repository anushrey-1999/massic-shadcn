"use client";

import React from "react";
import { useCurrentUserRole, usePermissions } from "@/hooks/use-permissions";
import type { AccountRole, Permission } from "@/lib/permissions";

interface PermissionGateProps {
  permission?: Permission;
  allowedRoles?: AccountRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  allowedRoles,
  fallback = null,
  children,
}: PermissionGateProps) {
  const role = useCurrentUserRole();
  const permissions = usePermissions();
  const hasPermission = permission ? permissions[permission] : true;
  const hasRole = allowedRoles ? allowedRoles.includes(role) : true;

  if (!hasPermission || !hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
