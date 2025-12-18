"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { useWebActionContentQuery, type WebActionType } from "@/hooks/use-web-page-actions";
import { cleanEscapedContent } from "@/utils/content-cleaner";
import { WebBlogView } from "@/components/organisms/web-page-actions/web-blog-view";
import { WebOutlineView } from "@/components/organisms/web-page-actions/web-outline-view";

function getTypeFromIntent(intent: string | null): WebActionType {
  return (intent || "").toLowerCase() === "informational" ? "blog" : "page";
}

function getFinalContent(type: WebActionType, data: any): string {
  if (type === "blog") {
    return cleanEscapedContent(data?.output_data?.page?.blog?.blog_post || "");
  }

  return cleanEscapedContent(data?.output_data?.page?.page_content || "");
}

export function WebPageView({ businessId, pageId }: { businessId: string; pageId: string }) {
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const mode = searchParams.get("mode");
  const type = getTypeFromIntent(intent);

  const contentQuery = useWebActionContentQuery({
    type,
    businessId,
    pageId,
    enabled: !mode && !!businessId && !!pageId,
    pollingIntervalMs: 6000,
  });

  if (mode === "outline") {
    return <WebOutlineView businessId={businessId} pageId={pageId} />;
  }

  if (mode === "final") {
    return <WebBlogView businessId={businessId} pageId={pageId} />;
  }

  const data = contentQuery.data;
  const finalContent = React.useMemo(() => getFinalContent(type, data), [type, data]);
  const hasFinal = !!finalContent && finalContent.trim().length > 0;

  return hasFinal ? <WebBlogView businessId={businessId} pageId={pageId} /> : <WebOutlineView businessId={businessId} pageId={pageId} />;
}
