"use client";

import React from "react";
import { useRoleGuard } from "@/hooks/use-permissions";
import type { AccountRole } from "@/lib/permissions";

interface RoleGuardProps {
  allowedRoles: AccountRole[];
  fallbackPath?: string;
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, fallbackPath, children }: RoleGuardProps) {
  const allowed = useRoleGuard({ allowedRoles, fallbackPath });
  if (!allowed) return null;
  return <>{children}</>;
}
