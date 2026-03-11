import type * as React from "react";
import {
  BarChart3,
  LetterText,
  Settings2,
  ShieldAlert,
  Unlink,
  Zap,
} from "lucide-react";

export type Impact = "high" | "medium" | "low";

export type CategoryKey =
  | "technical"
  | "links"
  | "content"
  | "performance"
  | "security"
  | "accessibility";

export type AuditIssue = {
  id: string;
  title: string;
  category: CategoryKey;
  description: string;
  impact: Impact;
  affectedPages: string[];
  solutionSteps: string[];
};

export const CATEGORY_META: Record<
  CategoryKey,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  technical: { label: "Technical", icon: Settings2 },
  links: { label: "Broken Links", icon: Unlink },
  content: { label: "Content", icon: LetterText },
  performance: { label: "Performance", icon: Zap },
  security: { label: "Security", icon: ShieldAlert },
  accessibility: { label: "Accessibility", icon: BarChart3 },
};

