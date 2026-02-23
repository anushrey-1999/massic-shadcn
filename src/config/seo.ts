import type { Metadata } from "next";

type PageMeta = {
  title: string;
  description: string;
};

export const siteMeta = {
  name: "Massic",
  description:
    "Massic helps you manage business analytics, strategy, web, social, ads, and tasks in one workspace.",
  titleTemplate: "%s | Massic",
} as const;

export const pageMeta = {
  dashboard: {
    title: "Dashboard",
    description: siteMeta.description,
  },
  login: {
    title: "Login",
    description: "Sign in to your Massic account to access your workspace.",
  },
  signup: {
    title: "Sign Up",
    description: "Create a Massic account to get started with your workspace.",
  },
  connectGoogle: {
    title: "Connect Google",
    description: "Connect your Google account to sync data with Massic.",
  },
  createBusiness: {
    title: "Create Business",
    description: "Create a new business profile to start analysis and recommendations.",
  },
  tasks: {
    title: "Tasks",
    description: "Manage and filter tasks with advanced filtering capabilities.",
  },
  settings: {
    title: "Settings",
    description: "Manage your account, workspace, and integrations in Massic.",
  },
  proposals: {
    title: "Proposals",
    description: "View and manage proposals for your clients and businesses.",
  },
  pitches: {
    title: "Pitches",
    description: "View and manage pitches for your clients and businesses.",
  },
  businessAnalytics: {
    title: "Business Analytics",
    description: "View analytics and performance insights for your business.",
  },
  businessProfile: {
    title: "Business Profile",
    description: "View and update business profile details, locations, offerings, and CTAs.",
  },
  businessStrategy: {
    title: "Strategy",
    description: "Explore strategy topics, audience insights, and competitive landscape for your business.",
  },
  businessReviews: {
    title: "Reviews",
    description: "Monitor and manage customer reviews for your business.",
  },
  businessWeb: {
    title: "Web",
    description: "Review new pages and web optimization analysis for your business.",
  },
  businessWebPageView: {
    title: "Web Page View",
    description: "View details and actions for a specific web page.",
  },
  businessTechnicalAudit: {
    title: "Technical Audit",
    description: "Review technical SEO health, categories, and issues for your business.",
  },
  businessSocial: {
    title: "Social",
    description: "Analyze social channels, campaigns, and relevance for your business.",
  },
  businessAds: {
    title: "Ads",
    description: "Review digital and TV/radio ads insights for your business.",
  },
  businessChat: {
    title: "Chat",
    description: "Open Ask Massic chat for this business.",
  },
  askMassic: {
    title: "Ask Massic",
    description: "Chat with Ask Massic for AI assistance on your business.",
  },
} as const satisfies Record<string, PageMeta>;

export function getPageMetadata(key: keyof typeof pageMeta): Metadata {
  const meta = pageMeta[key];
  return {
    title: meta.title,
    description: meta.description,
  };
}
