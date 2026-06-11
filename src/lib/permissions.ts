export const ACCOUNT_ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  ANALYST: "ANALYST",
} as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[keyof typeof ACCOUNT_ROLES];

export const ANALYST_RESTRICTED_MESSAGE =
  "Analysts have view-only access for this workflow. Ask an Admin or Owner to create, generate, publish, or change content.";

export const PERMISSIONS = {
  canManageTeam: "canManageTeam",
  canManageBilling: "canManageBilling",
  canManageSettings: "canManageSettings",
  canManageLinkedBusinesses: "canManageLinkedBusinesses",
  canGenerateContent: "canGenerateContent",
  canUseAccessRequests: "canUseAccessRequests",
  canGenerateReports: "canGenerateReports",
  canViewLinkedBusinesses: "canViewLinkedBusinesses",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export type PermissionMap = Record<Permission, boolean>;

export function isOwnerOrAdmin(role?: string | null) {
  return role === ACCOUNT_ROLES.OWNER || role === ACCOUNT_ROLES.ADMIN;
}

export function getDefaultPermissions(role?: string | null): PermissionMap {
  const elevated = isOwnerOrAdmin(role || ACCOUNT_ROLES.OWNER);

  return {
    canManageTeam: elevated,
    canManageBilling: elevated,
    canManageSettings: elevated,
    canManageLinkedBusinesses: elevated,
    canGenerateContent: elevated,
    canUseAccessRequests: true,
    canGenerateReports: true,
    canViewLinkedBusinesses: true,
  };
}
