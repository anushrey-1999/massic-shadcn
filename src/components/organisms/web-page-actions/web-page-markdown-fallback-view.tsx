"use client";

import { WebBlogView } from "@/components/organisms/web-page-actions/web-blog-view";

export function WebPageMarkdownFallbackView({ businessId, pageId }: { businessId: string; pageId: string }) {
  // Reuses the legacy page markdown editor flow exactly as before.
  return <WebBlogView businessId={businessId} pageId={pageId} />;
}
