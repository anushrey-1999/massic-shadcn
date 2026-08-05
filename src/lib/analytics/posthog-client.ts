import posthog, { type CaptureResult } from "posthog-js";

const POSTHOG_API_HOST = "https://us.i.posthog.com";
const POSTHOG_UI_HOST = "https://us.posthog.com";
const POSTHOG_SESSION_REPLAY_SAMPLE_RATE = 0.2;

const PUBLIC_OR_SENSITIVE_ROUTE_PREFIXES = [
  "/admin",
  "/email",
  "/google-access",
  "/login",
  "/r",
  "/signin-google",
  "/signup",
  "/snapshot",
  "/team-signup",
];

const FEATURE_ALIASES: Record<string, string> = {
  "organic-deepdive": "analytics",
  reports: "analytics",
  indexing: "analytics",
  chatbot: "ask_massic",
  "technical-audit": "technical_audit",
};

const URL_PROPERTY_KEYS = [
  "$current_url",
  "$initial_current_url",
  "$referrer",
  "$initial_referrer",
  "$session_entry_url",
  "$external_click_url",
] as const;

export interface MassicAnalyticsUser {
  userId: string;
  agencyId: string;
  accountRole?: string;
  roleName?: string;
  userType?: string;
  isTeamMember: boolean;
}

export interface MassicRouteContext {
  feature: string;
  routeTemplate: string;
  businessId?: string;
  replayAllowed: boolean;
}

function normalizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

function toRouteTemplateSegment(value: string): string {
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return ":id";
  }

  return normalizeSegment(value);
}

function normalizeIdentifierInPath(pathname: string): string {
  return pathname.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    ":id",
  );
}

function sanitizeUrl(value: unknown): unknown {
  if (typeof value !== "string" || !value) return value;

  try {
    const base =
      typeof window === "undefined" ? POSTHOG_UI_HOST : window.location.origin;
    const url = new URL(value, base);
    return `${url.origin}${normalizeIdentifierInPath(url.pathname)}`;
  } catch {
    return normalizeIdentifierInPath(value.split(/[?#]/, 1)[0]);
  }
}

function sanitizeEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null;

  const properties = { ...event.properties };
  for (const property of URL_PROPERTY_KEYS) {
    if (property in properties) {
      properties[property] = sanitizeUrl(properties[property]);
    }
  }

  if (typeof properties.$pathname === "string") {
    properties.$pathname = normalizeIdentifierInPath(properties.$pathname);
  }

  return { ...event, properties };
}

export function isPostHogEnabled(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN)
  );
}

export function initializePostHog(): void {
  if (!isPostHogEnabled()) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    api_host: POSTHOG_API_HOST,
    ui_host: POSTHOG_UI_HOST,
    defaults: "2025-05-24",
    autocapture: {
      dom_event_allowlist: ["click", "change", "submit"],
      element_allowlist: [
        "a",
        "button",
        "form",
        "input",
        "select",
        "textarea",
        "label",
      ],
      capture_copied_text: false,
    },
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
    opt_out_capturing_by_default: true,
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
      recordHeaders: false,
      recordBody: false,
      sampleRate: POSTHOG_SESSION_REPLAY_SAMPLE_RATE,
    },
    mask_all_element_attributes: true,
    mask_all_text: true,
    mask_personal_data_properties: true,
    disable_capture_url_hashes: true,
    save_campaign_params: false,
    save_referrer: false,
    before_send: sanitizeEvent,
  });
}

export function identifyMassicUser(user: MassicAnalyticsUser): void {
  if (!isPostHogEnabled()) return;

  posthog.opt_in_capturing();
  posthog.identify(user.userId, {
    account_role: user.accountRole,
    role_name: user.roleName,
    user_type: user.userType,
    is_team_member: user.isTeamMember,
  });
  posthog.group("agency", user.agencyId, {
    user_type: user.userType,
  });
  posthog.register({
    application: "massic",
    environment: "production",
    agency_id: user.agencyId,
    account_role: user.accountRole,
    user_type: user.userType,
    is_team_member: user.isTeamMember,
  });
}

export function clearMassicAnalyticsIdentity(): void {
  if (!isPostHogEnabled()) return;

  posthog.stopSessionRecording();
  posthog.reset();
  posthog.opt_out_capturing();
}

export function getMassicRouteContext(
  pathname: string,
): MassicRouteContext | null {
  if (
    PUBLIC_OR_SENSITIVE_ROUTE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return {
      feature: "agency_dashboard",
      routeTemplate: "/",
      replayAllowed: true,
    };
  }

  if (segments[0] === "business" && segments[1]) {
    const rawFeature = segments[2] || "overview";
    const feature = FEATURE_ALIASES[rawFeature] || normalizeSegment(rawFeature);
    const remainder = segments
      .slice(3)
      .map(toRouteTemplateSegment)
      .filter(Boolean);
    return {
      feature,
      businessId: segments[1],
      routeTemplate: ["/business/:business_id", rawFeature, ...remainder].join(
        "/",
      ),
      replayAllowed: feature !== "profile",
    };
  }

  if (segments[0] === "pitches") {
    const hasBusinessId = Boolean(
      segments[1] && segments[1] !== "create-pitch",
    );
    const rawFeature = hasBusinessId
      ? segments[2] || "overview"
      : segments[1] || "overview";
    return {
      feature: `pitches_${normalizeSegment(rawFeature)}`,
      businessId: hasBusinessId ? segments[1] : undefined,
      routeTemplate: hasBusinessId
        ? `/pitches/:business_id/${normalizeSegment(rawFeature)}`
        : `/pitches/${normalizeSegment(rawFeature)}`,
      replayAllowed: true,
    };
  }

  const feature =
    segments[0] === "create-business"
      ? "business_onboarding"
      : normalizeSegment(segments[0]);

  return {
    feature,
    routeTemplate: `/${segments.map(normalizeSegment).join("/")}`,
    replayAllowed: feature !== "settings",
  };
}

export function captureMassicRoute(context: MassicRouteContext): void {
  if (!isPostHogEnabled()) return;

  if (context.businessId) {
    posthog.register({ business_id: context.businessId });
  } else {
    posthog.unregister("business_id");
  }
  posthog.register({ feature: context.feature });

  if (context.replayAllowed) {
    posthog.startSessionRecording();
  } else {
    posthog.stopSessionRecording();
  }

  const currentUrl =
    typeof window === "undefined"
      ? context.routeTemplate
      : `${window.location.origin}${context.routeTemplate}`;

  const properties = {
    feature: context.feature,
    business_id: context.businessId,
    route_template: context.routeTemplate,
    $current_url: currentUrl,
    $pathname: context.routeTemplate,
  };

  posthog.capture("$pageview", properties);
  posthog.capture("massic_feature_viewed", properties);
}
