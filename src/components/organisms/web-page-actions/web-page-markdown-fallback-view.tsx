"use client";

import { WebBlogView } from "@/components/organisms/web-page-actions/web-blog-view";
import type { WebActionType } from "@/hooks/use-web-page-actions";

export function WebPageMarkdownFallbackView({
  businessId,
  pageId,
  type,
}: {
  businessId: string;
  pageId: string;
  type: WebActionType;
}) {
  return <WebBlogView businessId={businessId} pageId={pageId} type={type} />;
}
