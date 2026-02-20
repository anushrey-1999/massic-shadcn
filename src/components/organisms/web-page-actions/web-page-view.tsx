"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { useWebActionContentQuery, type WebActionType } from "@/hooks/use-web-page-actions";
import { cleanEscapedContent } from "@/utils/content-cleaner";
import { resolvePageContent } from "@/utils/page-content-resolver";
import { detectPageContentFormat } from "@/utils/page-content-format";
import { WebBlogView } from "@/components/organisms/web-page-actions/web-blog-view";
import { WebOutlineView } from "@/components/organisms/web-page-actions/web-outline-view";
import { WebPageHtmlView } from "@/components/organisms/web-page-actions/web-page-html-view";
import { WebPageMarkdownFallbackView } from "@/components/organisms/web-page-actions/web-page-markdown-fallback-view";

function getTypeFromPageType(pageType: string | null, intent?: string | null): WebActionType {
  const pt = (pageType || "").toLowerCase();
  if (pt === "blog") return "blog";
  if (pt) return "page";
  // Backward compatibility: old links used intent=informational for blog
  return (intent || "").toLowerCase() === "informational" ? "blog" : "page";
}

function getFinalContent(type: WebActionType, data: any): string {
  if (type === "blog") {
    return cleanEscapedContent(data?.output_data?.page?.blog?.blog_post || "");
  }

  return resolvePageContent(data);
}

export function WebPageView({ businessId, pageId }: { businessId: string; pageId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageType = searchParams.get("pageType");
  const intent = searchParams.get("intent");
  const mode = searchParams.get("mode");
  const type = getTypeFromPageType(pageType, intent);

  const contentQuery = useWebActionContentQuery({
    type,
    businessId,
    pageId,
    enabled: !!businessId && !!pageId,
    pollingIntervalMs: 6000,
  });

  const data = contentQuery.data;
  const finalContent = React.useMemo(() => getFinalContent(type, data), [type, data]);
  const hasFinal = !!finalContent && finalContent.trim().length > 0;
  const pageContentFormat = React.useMemo(() => detectPageContentFormat(finalContent), [finalContent]);

  React.useEffect(() => {
    if (mode === "outline" && hasFinal) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("mode");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [mode, hasFinal, searchParams, router]);

  if (mode === "outline" && !hasFinal) {
    return <WebOutlineView businessId={businessId} pageId={pageId} />;
  }

  if (mode === "final" || hasFinal) {
    if (type === "page") {
      if (pageContentFormat === "html") {
        return <WebPageHtmlView businessId={businessId} pageId={pageId} />;
      }
      return <WebPageMarkdownFallbackView businessId={businessId} pageId={pageId} />;
    }
    return <WebBlogView businessId={businessId} pageId={pageId} />;
  }

  return <WebOutlineView businessId={businessId} pageId={pageId} />;
}
