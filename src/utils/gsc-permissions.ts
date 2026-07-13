export type GscPermissionLevel =
  | "siteOwner"
  | "siteFullUser"
  | "siteRestrictedUser"
  | "siteUnverifiedUser";

const GSC_PERMISSION_LABELS: Record<GscPermissionLevel, string> = {
  siteOwner: "Owner",
  siteFullUser: "Full user",
  siteRestrictedUser: "Restricted user",
  siteUnverifiedUser: "Unverified",
};

export function hasRequiredGscAccess(
  permissionLevel: string | null | undefined
): boolean {
  return (
    permissionLevel === "siteOwner" ||
    permissionLevel === "siteFullUser" ||
    permissionLevel === "siteRestrictedUser"
  );
}

export function formatGscPermissionLevel(
  permissionLevel: string | null | undefined
): string {
  if (!permissionLevel) return "Access unknown";
  return GSC_PERMISSION_LABELS[permissionLevel as GscPermissionLevel] || "Access unknown";
}
