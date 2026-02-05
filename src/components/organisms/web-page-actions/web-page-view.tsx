"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";

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

  return cleanEscapedContent(data?.output_data?.page?.page_content?.page_content || "");
}

export function WebPageView({ businessId, pageId }: { businessId: string; pageId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const mode = searchParams.get("mode");
  const type = getTypeFromIntent(intent);

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
    return <WebBlogView businessId={businessId} pageId={pageId} />;
  }

  return <WebOutlineView businessId={businessId} pageId={pageId} />;
}
