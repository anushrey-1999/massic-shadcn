"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Copy, Eye, Sparkles } from "lucide-react";
import type { Editor } from "@tiptap/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { useWebActionContentQuery, useWebPageActions, type WebActionType } from "@/hooks/use-web-page-actions";
import { cleanEscapedContent } from "@/utils/content-cleaner";
import { resolvePageContent } from "@/utils/page-content-resolver";
import { InlineTipTapEditor } from "@/components/ui/inline-tiptap-editor";

function getTypeFromPageType(pageType: string | null, intent?: string | null): WebActionType {
  const pt = (pageType || "").toLowerCase();
  if (pt === "blog") return "blog";
  if (pt) return "page";
  return (intent || "").toLowerCase() === "informational" ? "blog" : "page";
}

export function WebOutlineView({ businessId, pageId }: { businessId: string; pageId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageType = searchParams.get("pageType");
  const intent = searchParams.get("intent");
  const keyword = searchParams.get("keyword") || "";
  const type = getTypeFromPageType(pageType, intent);

  const { startFinal, updateOutline } = useWebPageActions();

  const [loading, setLoading] = React.useState(false);
  const [outline, setOutline] = React.useState<string>("");
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const isInitialLoadRef = React.useRef(true);
  const lastStatusRef = React.useRef<string>("");
  const [pollingDisabled, setPollingDisabled] = React.useState(false);

  const [outlineEditor, setOutlineEditor] = React.useState<Editor | null>(null);

  const lastSavedOutlineRef = React.useRef<string>("");
  const canonicalize = React.useCallback((value: string) => {
    return (value || "").replace(/\r\n/g, "\n").replace(/\u00A0/g, " ").trimEnd();
  }, []);

  const contentQuery = useWebActionContentQuery({
    type,
    businessId,
    pageId,
    enabled: !!businessId && !!pageId,
    pollingDisabled,
    pollingIntervalMs: 6000,
  });

  const data = contentQuery.data;

  React.useEffect(() => {
    if (!data) return;

    const status = (data?.status || "").toString().toLowerCase();
    const prevStatus = lastStatusRef.current;
    const wasPolling = prevStatus === "pending" || prevStatus === "processing";
    const isPolling = status === "pending" || status === "processing";
    const transitionedFromPollingToTerminal = wasPolling && !isPolling;

    const editorFocused = !!outlineEditor?.isFocused;
    const shouldSyncFromServer =
      !editorFocused && (isInitialLoadRef.current || isPolling || transitionedFromPollingToTerminal);

    lastStatusRef.current = status;
    if (!shouldSyncFromServer) return;

    const rawOutline = data?.output_data?.page?.outline || "";
    const nextOutline = cleanEscapedContent(rawOutline);
    setOutline(nextOutline);
    lastSavedOutlineRef.current = canonicalize(nextOutline);

    if (isInitialLoadRef.current) {
      window.setTimeout(() => {
        isInitialLoadRef.current = false;
        setIsInitialLoad(false);
      }, 250);
    }
  }, [data, outlineEditor]);

  React.useEffect(() => {
    const status = (data?.status || "").toString().toLowerCase();
    if (status !== "pending") {
      setPollingDisabled(false);
    }
  }, [data?.status]);

  React.useEffect(() => {
    if (!data) return;
    const status = (data?.status || "").toString().toLowerCase();
    if (status !== "pending") return;

    const timeout = window.setTimeout(() => {
      setPollingDisabled(true);
      toast.warning("Generation seems to be stuck. Please try again.");
    }, 300000);

    return () => window.clearTimeout(timeout);
  }, [data?.status]);

  const status = (data?.status || "").toString().toLowerCase();
  const isProcessing = status === "pending" || status === "processing";

  const typeLabel = type === "blog" ? "blog" : "page";
  const finalContent =
    type === "blog"
      ? cleanEscapedContent(
          (typeof data?.output_data?.page?.blog === "string"
            ? data?.output_data?.page?.blog
            : data?.output_data?.page?.blog?.blog_post) || ""
        )
      : resolvePageContent(data);
  const hasFinalContent = !!finalContent && finalContent.trim().length > 0;
  const hasOutline = !!outline && outline.trim().length > 0;
  const isGeneratingFinal = hasOutline && !hasFinalContent;

  const handleCopy = async () => {
    if (outlineEditor) {
      const htmlContent = outlineEditor.getHTML();
      if (htmlContent && htmlContent.trim()) {
        try {
          if (typeof ClipboardItem !== "undefined") {
            const clipboardItem = new ClipboardItem({
              "text/html": new Blob([htmlContent], { type: "text/html" }),
              "text/plain": new Blob([outlineEditor.getText()], { type: "text/plain" }),
            });
            await navigator.clipboard.write([clipboardItem]);
          } else {
            await navigator.clipboard.writeText(outlineEditor.getText());
          }
          toast.success("Copied");
          return;
        } catch {
          try {
            await navigator.clipboard.writeText(outlineEditor.getText());
            toast.success("Copied");
            return;
          } catch {
            toast.error("Copy failed");
            return;
          }
        }
      }
    }

    try {
      await navigator.clipboard.writeText(outline || "");
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleGenerateFinal = async () => {
    if (isProcessing) return;
    if (!outline) {
      toast.error("Please generate an outline first before creating the final output.");
      return;
    }

    setLoading(true);
    try {
      await startFinal(type, businessId, pageId);
      await contentQuery.refetch();
      toast.success(type === "blog" ? "Final blog generation started." : "Final page generation started.");
    } catch (error: any) {
      if (error?.response?.status === 403) {
        toast.error(type === "blog" ? "You've reached your blog generation limit for this billing period." : "You've reached your page generation limit for this billing period.");
      } else {
        toast.error("Failed to generate final output.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOutline = async (markdown: string) => {
    if (isInitialLoad) return;

    const next = canonicalize(markdown);
    if (next === canonicalize(lastSavedOutlineRef.current)) return;

    try {
      await updateOutline(type, businessId, pageId, next);
      lastSavedOutlineRef.current = next;
      setOutline(next);
      toast.success("Changes Saved");
    } catch {
      toast.error("Failed to save changes to server");
    }
  };

  const handleViewFinal = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", "final");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const viewFinalLabel = type === "blog" ? "View Blog" : "View Page";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Typography variant="muted" className="text-xs">
            {searchParams.get("totalPages") ? `${searchParams.get("totalPages")} total pages` : ""}
          </Typography>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <Typography variant="h4">{type === "blog" ? "Blog Outline" : "Page Outline"}</Typography>
            {keyword ? (
              <Typography variant="muted" className="mt-1">
                {keyword}
              </Typography>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            {hasFinalContent ? (
              <Button className="gap-2" variant="default" onClick={handleViewFinal}>
                <Eye className="h-4 w-4" />
                {viewFinalLabel}
              </Button>
            ) : (
              <Button className="gap-2" onClick={handleGenerateFinal} disabled={loading || isProcessing}>
                <Sparkles className="h-4 w-4" />
                {loading ? "Generating..." : type === "blog" ? "Generate Blog" : "Generate Page"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {isProcessing ? (
          <Card className="p-4">
            <Typography>
              We’re generating your content. This may take 1-3 minutes. Please wait
              <span className="dot-animate"> ...</span>
            </Typography>
            <style>{`
              .dot-animate { display: inline-block; width: 1.5em; text-align: left; }
              .dot-animate::after { content: ''; animation: dots 1.2s steps(3, end) infinite; }
              @keyframes dots { 0%, 20% { content: ''; } 40% { content: '.'; } 60% { content: '..'; } 80%, 100% { content: '...'; } }
            `}</style>
          </Card>
        ) : null}

        {status === "error" ? (
          <Card className="p-4">
            <Typography variant="h5" className="text-destructive">
              Error Loading Content
            </Typography>
            <Typography className="mt-2">{data?.message || "There was a problem loading the outline."}</Typography>
          </Card>
        ) : null}

        {!isProcessing && status !== "error" ? (
          <Card className="p-4">
            <InlineTipTapEditor
              content={outline}
              onEditorReady={setOutlineEditor}
              onSave={handleSaveOutline}
              placeholder={type === "blog" ? "Write your blog outline here..." : "Write your page outline here..."}
            />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
