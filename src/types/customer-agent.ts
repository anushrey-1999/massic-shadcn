import { z } from "zod";

// Mirrors ThemeConfig / WidgetContent / VisibilityRules in massic-widget's
// @massic/widget-protocol. Keep both in sync; seedseo validates the same shape.
export const THEME_PRESETS = ["clean", "soft", "sharp", "bold"] as const;
export const THEME_MODES = ["light", "dark", "auto"] as const;
export const CORNER_STYLES = ["sharp", "rounded", "soft"] as const;
export const THEME_FONTS = ["system", "inter", "source-sans-3", "atkinson", "lora"] as const;
export const MOTION_LEVELS = ["subtle", "expressive", "off"] as const;
export const LAUNCHER_STYLES = ["icon", "logo", "pill"] as const;
export const SUGGESTED_QUESTIONS_MAX = 4;

export type ThemePreset = (typeof THEME_PRESETS)[number];
export type ThemeFont = (typeof THEME_FONTS)[number];

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color, like #1A6B4A.");
const offset = z.number().int().min(0, "Use 0 or more.").max(200, "Use 200 or less.");
const optionalText = (max: number) => z.string().max(max, `Use ${max} characters or fewer.`).nullable();

export const launcherSchema = z.object({
  style: z.enum(LAUNCHER_STYLES),
  label: optionalText(40),
  position: z.enum(["right", "left"]),
  offset_x: offset,
  offset_y: offset,
  hide_on_mobile: z.boolean(),
});

export const themeConfigSchema = z.object({
  preset: z.enum(THEME_PRESETS),
  mode: z.enum(THEME_MODES),
  accent: hexColor,
  corners: z.enum(CORNER_STYLES).nullable(),
  font: z.enum(THEME_FONTS),
  motion: z.enum(MOTION_LEVELS),
  visitor_bubble: z.enum(["neutral", "accent"]),
  launcher: launcherSchema,
  show_powered_by: z.boolean(),
});

export const widgetContentSchema = z.object({
  status_text: z.string().max(60, "Use 60 characters or fewer."),
  greeting: z.string().trim().min(1, "Add a greeting.").max(200, "Use 200 characters or fewer."),
  suggested_questions: z
    .array(z.string().trim().min(1, "Remove empty questions.").max(120, "Use 120 characters or fewer."))
    .max(SUGGESTED_QUESTIONS_MAX),
  quick_actions: z.object({ call: z.boolean(), book: z.boolean(), quote: z.boolean() }),
  teaser: z.object({
    enabled: z.boolean(),
    text: optionalText(80),
    delay_seconds: z.number().int().min(0).max(120),
  }),
});

export const visibilitySchema = z.object({
  include_paths: z.array(z.string().max(200)),
  exclude_paths: z.array(z.string().max(200)),
});

export const appearanceSchema = z.object({
  theme: themeConfigSchema,
  content: widgetContentSchema,
  visibility: visibilitySchema,
});

export type ThemeConfig = z.infer<typeof themeConfigSchema>;
export type WidgetContent = z.infer<typeof widgetContentSchema>;
export type VisibilityRules = z.infer<typeof visibilitySchema>;
export type AppearanceValues = z.infer<typeof appearanceSchema>;

export const AGENT_TONES = ["friendly", "professional", "concise"] as const;
export const AGENT_GOALS = ["book", "call", "quote"] as const;
const optionalHttpsUrl = z
  .string()
  .trim()
  .max(2048, "Use a shorter link.")
  .regex(/^https:\/\/[^\s/$.?#][^\s]*$/i, "Use a full https:// link.")
  .nullable();

export const behaviorSchema = z
  .object({
    tone: z.enum(AGENT_TONES),
    goal: z.enum(AGENT_GOALS),
    booking_url: optionalHttpsUrl,
    quote_url: optionalHttpsUrl,
    topics_to_avoid: z.array(z.string().trim().min(1).max(120, "Keep each topic under 120 characters.")).max(20),
    escalation: z.object({
      on_request: z.boolean(),
      on_low_confidence: z.boolean(),
      on_complaint: z.boolean(),
      instructions: z.string().max(500, "Use 500 characters or fewer."),
    }),
  })
  .refine((behavior) => behavior.goal !== "book" || Boolean(behavior.booking_url), {
    path: ["booking_url"],
    message: "Add a booking link to make booking the main goal.",
  });

export const behaviorFormSchema = z.object({
  behavior: behaviorSchema,
});

export type AgentTone = (typeof AGENT_TONES)[number];
export type AgentGoal = (typeof AGENT_GOALS)[number];
export type BehaviorValues = z.infer<typeof behaviorFormSchema>;

/** Read-only business facts the widget shows; owned by the business Profile. */
export type CustomerAgentBusiness = {
  name: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  /** Profile website, used to suggest the first allowed domain. */
  website?: string | null;
};

export type CustomerAgentConfig = AppearanceValues &
  BehaviorValues & {
    site_id: string;
    site_key: string;
    enabled: boolean;
    domains: string[];
    business: CustomerAgentBusiness;
  };

export type CustomerAgentUpdate = Partial<
  Pick<
    CustomerAgentConfig,
    "enabled" | "domains" | "theme" | "content" | "visibility" | "behavior"
  >
>;

export type InstallStatus = {
  installs: { origin: string; last_seen_at: string }[];
};

export type WidgetSession = {
  token: string;
  expires_at: string;
  visitor_id: string;
  conversation_id: string | null;
};
