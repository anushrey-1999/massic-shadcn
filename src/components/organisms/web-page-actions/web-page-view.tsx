"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { useWebActionContentQuery, type WebActionType } from "@/hooks/use-web-page-actions";
import {
  resolveBlogFinalContent,
  resolveFormattedBlogHtml,
  resolveFormattedPageHtml,
  resolvePageContent,
} from "@/utils/page-content-resolver";
import { detectPageContentFormat } from "@/utils/page-content-format";
import { WebBlogView } from "@/components/organisms/web-page-actions/web-blog-view";
import { WebOutlineView } from "@/components/organisms/web-page-actions/web-outline-view";
import { WebBlogHtmlView, WebPageHtmlView } from "@/components/organisms/web-page-actions/web-page-html-view";
import { WebPageMarkdownFallbackView } from "@/components/organisms/web-page-actions/web-page-markdown-fallback-view";
import { UnsupportedWebPageTypeState } from "@/components/organisms/web-page-actions/unsupported-web-page-type-state";
import { getWebPageContentType } from "@/lib/web-page-types";

function getFinalContent(type: WebActionType, data: any): string {
  if (type === "blog") {
    return resolveBlogFinalContent(data);
  }

  return resolvePageContent(data);
}

function SupportedWebPageView({
  businessId,
  pageId,
  type,
}: {
  businessId: string;
  pageId: string;
  type: WebActionType;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");

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
  const hasFormattedPageHtml = React.useMemo(() => !!resolveFormattedPageHtml(data), [data]);
  const hasFormattedBlogHtml = React.useMemo(() => !!resolveFormattedBlogHtml(data), [data]);

  React.useEffect(() => {
    if (mode === "outline" && hasFinal) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("mode");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [mode, hasFinal, searchParams, router]);

  if (mode === "outline" && !hasFinal) {
    return <WebOutlineView businessId={businessId} pageId={pageId} type={type} />;
  }

  if (mode === "final" || hasFinal) {
    if (type === "page") {
      if (hasFormattedPageHtml || pageContentFormat === "html") {
        return <WebPageHtmlView businessId={businessId} pageId={pageId} />;
      }
      return <WebPageMarkdownFallbackView businessId={businessId} pageId={pageId} type={type} />;
    }
    if (hasFormattedBlogHtml) {
      return <WebBlogHtmlView businessId={businessId} pageId={pageId} />;
    }
    return <WebBlogView businessId={businessId} pageId={pageId} type={type} />;
  }

  return <WebOutlineView businessId={businessId} pageId={pageId} type={type} />;
}

export function WebPageView({ businessId, pageId }: { businessId: string; pageId: string }) {
  const searchParams = useSearchParams();
  const type = getWebPageContentType(searchParams.get("pageType"));

  if (!type) return <UnsupportedWebPageTypeState />;

  return <SupportedWebPageView businessId={businessId} pageId={pageId} type={type} />;
}
