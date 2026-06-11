import featureActionRegistry from "@/config/role-feature-actions.json";
import {
  ANALYST_RESTRICTED_MESSAGE,
  type AccountRole,
  type Permission,
  type PermissionMap,
} from "@/lib/permissions";

export type FeatureActionKey =
  | "web.generateOutline"
  | "web.generatePage"
  | "web.publish"
  | "web.refine"
  | "web.unifiedGenerate"
  | "social.generate"
  | "actions.createPlan"
  | "actions.refinePlan"
  | "actions.regeneratePlan"
  | "actions.acceptPlan"
  | "actions.autofillProfile"
  | "technicalAudit.generate"
  | "technicalAudit.regenerate"
  | "contentSeries.generate"
  | "themes.generate"
  | "reviews.campaigns.create"
  | "reviews.campaigns.edit"
  | "reviews.customers.create"
  | "reviews.customers.edit"
  | "reviews.customers.delete"
  | "reviews.customers.approve"
  | "reviews.customers.sendNow"
  | "reviews.replies.send"
  | "reviews.replies.update"
  | "reports.generate"
  | "reports.schedule"
  | "reports.pitchSnapshot"
  | "reports.pitchDetailed"
  | "ads.generate"
  | "strategy.generateMeetingPrep";

export interface FeatureActionConfig {
  label: string;
  permission: Permission;
  blockedFor?: AccountRole[];
  visibleWhenRestricted?: boolean;
  restrictedMessage?: string;
}

type FeatureActionRegistry = Record<string, Record<string, FeatureActionConfig>>;

const registry = featureActionRegistry as FeatureActionRegistry;

export function getFeatureActionConfig(actionKey: FeatureActionKey): FeatureActionConfig {
  const [feature, ...actionParts] = actionKey.split(".");
  const actionName = actionParts.join(".");
  const config = registry[feature]?.[actionName];

  if (!config) {
    throw new Error(`Unknown feature action: ${actionKey}`);
  }

  return config;
}

export function getFeatureActionRestrictedMessage(actionKey: FeatureActionKey) {
  return getFeatureActionConfig(actionKey).restrictedMessage || ANALYST_RESTRICTED_MESSAGE;
}

export function canPerformFeatureAction({
  actionKey,
  permissions,
  role,
}: {
  actionKey: FeatureActionKey;
  permissions: PermissionMap;
  role: AccountRole;
}) {
  const config = getFeatureActionConfig(actionKey);

  if (config.blockedFor?.includes(role)) {
    return false;
  }

  return Boolean(permissions[config.permission]);
}

export function isFeatureActionVisibleWhenRestricted(actionKey: FeatureActionKey) {
  return getFeatureActionConfig(actionKey).visibleWhenRestricted !== false;
}
