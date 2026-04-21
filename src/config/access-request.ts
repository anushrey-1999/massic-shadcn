import type { Product } from "@/types/access-request";

export const PRODUCT_CONFIG: Record<
  Product,
  {
    label: string;
    shortLabel: string;
    description: string;
    automated: boolean;
    roles: { value: string; label: string }[];
    defaultRole: string;
  }
> = {
  ga4: {
    label: "Google Analytics 4",
    shortLabel: "GA4",
    description: "Access to Analytics accounts and properties",
    automated: true,
    roles: [
      { value: "viewer", label: "Viewer" },
      { value: "analyst", label: "Analyst" },
      { value: "editor", label: "Editor" },
      { value: "admin", label: "Admin" },
    ],
    defaultRole: "viewer",
  },
  gtm: {
    label: "Google Tag Manager",
    shortLabel: "GTM",
    description: "Access to Tag Manager accounts and containers",
    automated: true,
    roles: [
      { value: "read", label: "Read" },
      { value: "edit", label: "Edit" },
      { value: "approve", label: "Approve" },
      { value: "publish", label: "Publish" },
    ],
    defaultRole: "read",
  },
  gbp: {
    label: "Google Business Profile",
    shortLabel: "GBP",
    description: "Access to Business Profile accounts",
    automated: true,
    roles: [
      { value: "owner", label: "Owner" },
      { value: "manager", label: "Manager" },
      { value: "site_manager", label: "Site Manager" },
    ],
    defaultRole: "manager",
  },
  gsc: {
    label: "Google Search Console",
    shortLabel: "GSC",
    description: "Access to Search Console properties (requires manual steps)",
    automated: false,
    roles: [{ value: "full", label: "Full" }],
    defaultRole: "full",
  },
};

export const ALL_PRODUCTS: Product[] = ["ga4", "gtm", "gbp", "gsc"];

export const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  pending: {
    label: "Pending",
    variant: "outline",
    className: "border-gray-300 text-gray-600 bg-gray-50",
  },
  in_progress: {
    label: "In Progress",
    variant: "outline",
    className: "border-blue-300 text-blue-700 bg-blue-50",
  },
  completed: {
    label: "Completed",
    variant: "outline",
    className: "border-green-300 text-green-700 bg-green-50",
  },
  partially_completed: {
    label: "Partial",
    variant: "outline",
    className: "border-yellow-300 text-yellow-700 bg-yellow-50",
  },
  expired: {
    label: "Expired",
    variant: "outline",
    className: "border-red-300 text-red-700 bg-red-50",
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    className: "border-red-300 text-red-700 bg-red-50",
  },
  manual_required: {
    label: "Manual Required",
    variant: "outline",
    className: "border-orange-300 text-orange-700 bg-orange-50",
  },
};
