"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bold,
  Copy,
  ExternalLink,
  Italic,
  Loader2,
  Link2,
  Monitor,
  List,
  ListOrdered,
  Quote,
  Smartphone,
  Strikethrough,
  Tablet,
  Underline,
  X,
  Globe,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWebActionContentQuery, useWebPageActions, type WebActionType } from "@/hooks/use-web-page-actions";
import { copyToClipboard } from "@/utils/clipboard";
import { cleanEscapedContent } from "@/utils/content-cleaner";
import { InlineTipTapEditor } from "@/components/ui/inline-tiptap-editor";
import { ContentConverter } from "@/utils/content-converter";
import { cn } from "@/lib/utils";
import { useWordpressConnection } from "@/hooks/use-wordpress-connector";
import {
  useWordpressContentStatus,
  useWordpressPreviewLink,
  useWordpressPublish,
} from "@/hooks/use-wordpress-publishing";

function getTypeFromIntent(intent: string | null): WebActionType {
  return (intent || "").toLowerCase() === "informational" ? "blog" : "page";
}

export function WebBlogView({ businessId, pageId }: { businessId: string; pageId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const keyword = searchParams.get("keyword") || "";
  const type = getTypeFromIntent(intent);

  const { updateBlogContent, updatePageContent } = useWebPageActions();

  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const isInitialLoadRef = React.useRef(true);
  const lastStatusRef = React.useRef<string>("");
  const [pollingDisabled, setPollingDisabled] = React.useState(false);

  const [mainContent, setMainContent] = React.useState("");
  const [metaDescription, setMetaDescription] = React.useState("");
  const [citations, setCitations] = React.useState<string[]>([]);
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);
  const [lastPublishedData, setLastPublishedData] = React.useState<{
    contentId: string;
    wpId: number;
    permalink: string | null;
    editUrl: string | null;
    status: string;
    previewUrl?: string;
  } | null>(null);
  const [isEmbeddedPreviewOpen, setIsEmbeddedPreviewOpen] = React.useState(false);
  const [embeddedPreviewUrl, setEmbeddedPreviewUrl] = React.useState("");
  const [embeddedPreviewTitle, setEmbeddedPreviewTitle] = React.useState("Preview");
  const [isEmbeddedPreviewLoading, setIsEmbeddedPreviewLoading] = React.useState(false);
  const [showEmbedFallbackHint, setShowEmbedFallbackHint] = React.useState(false);
  const [previewViewport, setPreviewViewport] = React.useState<"desktop" | "tablet" | "mobile">("desktop");

  const lastSavedMainRef = React.useRef<string>("");
  const lastSavedMetaRef = React.useRef<string>("");

  const canonicalize = React.useCallback((value: string) => {
    return (value || "").replace(/\r\n/g, "\n").replace(/\u00A0/g, " ").trimEnd();
  }, []);

  const [mainEditor, setMainEditor] = React.useState<Editor | null>(null);

  const contentQuery = useWebActionContentQuery({
    type,
    businessId,
    pageId,
    enabled: !!businessId && !!pageId,
    pollingDisabled,
    pollingIntervalMs: 6000,
  });

  const data = contentQuery.data;
  const wpConnectionQuery = useWordpressConnection(businessId || null);
  const wpPublishMutation = useWordpressPublish();
  const wpPreviewMutation = useWordpressPreviewLink();
  const wpConnection = wpConnectionQuery.data?.connection || null;
  const isWpConnected = Boolean(wpConnectionQuery.data?.connected && wpConnection);

  React.useEffect(() => {
    if (!data) return;

    const status = (data?.status || "").toString().toLowerCase();
    const prevStatus = lastStatusRef.current;
    const wasPolling = prevStatus === "pending" || prevStatus === "processing";
    const isPolling = status === "pending" || status === "processing";
    const transitionedFromPollingToTerminal = wasPolling && !isPolling;

    const editorFocused = !!mainEditor?.isFocused;
    const shouldSyncFromServer =
      !editorFocused && (isInitialLoadRef.current || isPolling || transitionedFromPollingToTerminal);

    lastStatusRef.current = status;
    if (!shouldSyncFromServer) return;

    if (type === "blog") {
      const blogData = data?.output_data?.page?.blog;
      const rawBlog =
        typeof blogData === "string" ? blogData : (blogData?.blog_post || "");
      const rawMeta =
        typeof blogData === "object" && blogData !== null
          ? blogData?.meta_description || ""
          : "";
      const rawCitations =
        typeof blogData === "object" && blogData !== null && Array.isArray(blogData?.citations)
          ? blogData.citations
          : [];

      setMainContent(cleanEscapedContent(rawBlog));
      setMetaDescription(cleanEscapedContent(rawMeta));
      setCitations(Array.isArray(rawCitations) ? rawCitations : []);

      lastSavedMainRef.current = canonicalize(cleanEscapedContent(rawBlog));
      lastSavedMetaRef.current = canonicalize(cleanEscapedContent(rawMeta));
    } else {
      const rawPage = data?.output_data?.page?.page_content?.page_content || "";
      setMainContent(cleanEscapedContent(rawPage));
      setMetaDescription("");
      setCitations([]);

      lastSavedMainRef.current = canonicalize(cleanEscapedContent(rawPage));
      lastSavedMetaRef.current = "";
    }

    if (isInitialLoadRef.current) {
      window.setTimeout(() => {
        isInitialLoadRef.current = false;
        setIsInitialLoad(false);
      }, 250);
    }
  }, [data, type, mainEditor]);

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
  const outlineFromServer = cleanEscapedContent(data?.output_data?.page?.outline || "");
  const hasOutline = !!outlineFromServer && outlineFromServer.trim().length > 0;
  const hasFinalContent = !!mainContent && mainContent.trim().length > 0;

  const inferPage = data?.output_data?.page || {};
  const inferBlog = inferPage?.blog || {};
  const publishTitle = inferBlog?.meta_title || keyword || "Untitled";
  const publishContentId = inferPage?.page_id || pageId;
  const publishSlug = typeof inferPage?.slug === "string" ? inferPage.slug.replace(/^\/+/, "") : null;
  const publishType: "post" | "page" = type === "blog" ? "post" : "page";
  const contentStatusQuery = useWordpressContentStatus(
    wpConnection?.connectionId || null,
    publishContentId ? String(publishContentId) : null
  );
  const persistedContent = contentStatusQuery.data?.content || null;
  const persistedStatus = (persistedContent?.status || "").toLowerCase();
  const isPersistedLive = persistedStatus === "publish";
  const isPersistedDraftLike = Boolean(persistedContent && !isPersistedLive);

  const liveUrl = React.useMemo(() => {
    if (persistedContent?.permalink) return persistedContent.permalink;
    if (lastPublishedData?.permalink) return lastPublishedData.permalink;
    if (isPersistedLive && persistedContent?.wpId && wpConnection?.siteUrl) {
      return `${String(wpConnection.siteUrl).replace(/\/+$/, "")}/?p=${persistedContent.wpId}`;
    }
    return null;
  }, [
    isPersistedLive,
    lastPublishedData?.permalink,
    persistedContent?.permalink,
    persistedContent?.wpId,
    wpConnection?.siteUrl,
  ]);

  const openEmbeddedPreview = React.useCallback((url: string, title: string) => {
    if (!url) return;
    setEmbeddedPreviewUrl(url);
    setEmbeddedPreviewTitle(title);
    setIsEmbeddedPreviewLoading(true);
    setShowEmbedFallbackHint(false);
    setPreviewViewport("desktop");
    setIsEmbeddedPreviewOpen(true);
  }, []);

  React.useEffect(() => {
    if (!isEmbeddedPreviewOpen || !isEmbeddedPreviewLoading) return;

    const timer = window.setTimeout(() => {
      setShowEmbedFallbackHint(true);
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [isEmbeddedPreviewLoading, isEmbeddedPreviewOpen]);

  const buildPublishPayload = React.useCallback(
    (targetStatus: "draft" | "publish") => {
      const excerpt = (metaDescription || inferBlog?.meta_description || "").trim();
      return {
        connectionId: String(wpConnection?.connectionId || ""),
        status: targetStatus,
        workflowSource: "infer_ai" as const,
        workflowPayload: data || {},
        contentId: String(publishContentId),
        type: publishType,
        title: String(publishTitle),
        slug: publishSlug,
        contentMarkdown: mainContent,
        contentHtml: ContentConverter.markdownToHtml(mainContent),
        excerpt: excerpt || null,
        head: {
          title: String(publishTitle),
          meta: {
            description: excerpt || undefined,
          },
        },
      };
    },
    [
      data,
      inferBlog?.meta_description,
      mainContent,
      metaDescription,
      publishContentId,
      publishSlug,
      publishTitle,
      publishType,
      wpConnection?.connectionId,
    ]
  );

  const handleRedirectToChannels = React.useCallback(() => {
    router.push(`/business/${businessId}/web?tab=channels`);
    setIsPublishModalOpen(false);
  }, [businessId, router]);

  const handlePublishDraft = React.useCallback(async () => {
    if (!isWpConnected || !wpConnection?.connectionId) return;
    if (!hasFinalContent) return;

    const publishResult = await wpPublishMutation.mutateAsync(buildPublishPayload("draft"));
    const published = publishResult?.data;
    if (!published) return;

    setLastPublishedData({
      contentId: published.contentId,
      wpId: published.wpId,
      permalink: published.permalink || null,
      editUrl: published.editUrl || null,
      status: published.status || "draft",
    });
    toast.success("Draft pushed to WordPress");

    const previewResult = await wpPreviewMutation.mutateAsync({
      connectionId: wpConnection.connectionId,
      contentId: published.contentId,
      wpId: published.wpId,
    });

    const previewUrl = previewResult?.data?.previewUrl;
    if (previewUrl) {
      setLastPublishedData((prev) =>
        prev
          ? {
            ...prev,
            previewUrl,
          }
          : prev
      );
      openEmbeddedPreview(previewUrl, "WordPress Draft Preview");
      toast.success("Preview ready");
    }
    void contentStatusQuery.refetch();
  }, [
    buildPublishPayload,
    contentStatusQuery,
    hasFinalContent,
    isWpConnected,
    wpConnection?.connectionId,
    openEmbeddedPreview,
    wpPreviewMutation,
    wpPublishMutation,
  ]);

  const handlePublishLive = React.useCallback(async () => {
    if (!isWpConnected || !wpConnection?.connectionId) return;
    if (!hasFinalContent) return;
    if (!isPersistedDraftLike && !lastPublishedData?.wpId) {
      toast.error("Publish draft first to generate a preview");
      return;
    }

    const publishResult = await wpPublishMutation.mutateAsync(buildPublishPayload("publish"));
    const published = publishResult?.data;
    if (!published) return;

    setLastPublishedData((prev) => ({
      contentId: published.contentId,
      wpId: published.wpId,
      permalink: published.permalink || null,
      editUrl: published.editUrl || null,
      status: published.status || "publish",
      previewUrl: prev?.previewUrl,
    }));

    toast.success("Published live to WordPress");
    void contentStatusQuery.refetch();
    setIsPublishModalOpen(false);
  }, [
    buildPublishPayload,
    contentStatusQuery,
    hasFinalContent,
    isWpConnected,
    isPersistedDraftLike,
    lastPublishedData?.wpId,
    wpConnection?.connectionId,
    wpPublishMutation,
  ]);

  const handleOpenPreview = React.useCallback(async () => {
    const wpIdToUse = persistedContent?.wpId || lastPublishedData?.wpId;
    if (!wpConnection?.connectionId || !wpIdToUse) {
      toast.error("Draft not found for preview");
      return;
    }

    const previewResult = await wpPreviewMutation.mutateAsync({
      connectionId: wpConnection.connectionId,
      contentId: String(publishContentId),
      wpId: Number(wpIdToUse),
    });

    const previewUrl = previewResult?.data?.previewUrl;
    if (!previewUrl) return;

    setLastPublishedData((prev) =>
      prev
        ? {
          ...prev,
          previewUrl,
        }
        : {
          contentId: String(publishContentId),
          wpId: Number(wpIdToUse),
          permalink: persistedContent?.permalink || null,
          editUrl: null,
          status: persistedStatus || "draft",
          previewUrl,
        }
    );
    openEmbeddedPreview(previewUrl, "WordPress Draft Preview");
  }, [
    lastPublishedData?.wpId,
    persistedContent?.permalink,
    persistedContent?.wpId,
    persistedStatus,
    publishContentId,
    wpConnection?.connectionId,
    openEmbeddedPreview,
    wpPreviewMutation,
  ]);

  const handleCopyAll = async () => {
    if (mainEditor) {
      const htmlContent = mainEditor.getHTML();
      if (htmlContent && htmlContent.trim()) {
        try {
          if (typeof ClipboardItem !== "undefined") {
            const clipboardItem = new ClipboardItem({
              "text/html": new Blob([htmlContent], { type: "text/html" }),
              "text/plain": new Blob([mainEditor.getText()], { type: "text/plain" }),
            });
            await navigator.clipboard.write([clipboardItem]);
          } else {
            await navigator.clipboard.writeText(mainEditor.getText());
          }
          toast.success("Copied");
          return;
        } catch {
          try {
            await navigator.clipboard.writeText(mainEditor.getText());
            toast.success("Copied");
            return;
          } catch {
            toast.error("Copy failed");
            return;
          }
        }
      }
    }

    const ok = await copyToClipboard(mainContent || "");
    if (ok) toast.success("Copied");
    else toast.error("Copy failed");
  };

  const handleCopyMeta = async () => {
    const ok = await copyToClipboard(metaDescription || "");
    if (ok) toast.success("Copied");
    else toast.error("Copy failed");
  };

  const handleCopyCitations = async () => {
    const ok = await copyToClipboard((citations || []).join("\n"));
    if (ok) toast.success("Copied");
    else toast.error("Copy failed");
  };

  const handleSaveMainContent = async (markdown: string) => {
    if (isInitialLoad) return;

    const next = canonicalize(markdown);
    if (next === canonicalize(lastSavedMainRef.current)) return;

    try {
      if (type === "blog") {
        await updateBlogContent(businessId, pageId, {
          blog_post: next,
          meta_description: metaDescription,
        });
      } else {
        await updatePageContent(businessId, pageId, next);
      }
      lastSavedMainRef.current = next;
      setMainContent(next);
      toast.success("Changes Saved");
    } catch {
      toast.error("Failed to save changes to server");
    }
  };

  const handleMetaBlur = async () => {
    if (isInitialLoad) return;
    if (type !== "blog") return;

    const nextMeta = canonicalize(metaDescription);
    if (nextMeta === canonicalize(lastSavedMetaRef.current)) return;

    try {
      await updateBlogContent(businessId, pageId, {
        blog_post: mainContent,
        meta_description: nextMeta,
      });
      lastSavedMetaRef.current = nextMeta;
      toast.success("Changes Saved");
    } catch {
      toast.error("Failed to save changes to server");
    }
  };

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
            <Typography variant="h4">{type === "blog" ? "Blog" : "Page"}</Typography>
            {keyword ? (
              <Typography variant="muted" className="mt-1">
                {keyword}
              </Typography>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleCopyAll} disabled={isProcessing}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button
              className="gap-2"
              type="button"
              onClick={() => setIsPublishModalOpen(true)}
              disabled={isProcessing || !hasFinalContent}
            >
              <Globe className="h-4 w-4" />
              Publish
            </Button>
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
            <Typography className="mt-2">{data?.message || "There was a problem loading the content."}</Typography>
          </Card>
        ) : null}

        {!isProcessing && status !== "error" ? (
          <>
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 border rounded-md px-2 py-1">
                {[Bold, Italic, Underline, Strikethrough, Quote, List, ListOrdered, Link2].map((Icon, idx) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    size="icon"
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!mainEditor) return;

                      switch (idx) {
                        case 0:
                          mainEditor.chain().focus().toggleBold().run();
                          break;
                        case 1:
                          mainEditor.chain().focus().toggleItalic().run();
                          break;
                        case 2:
                          mainEditor.chain().focus().toggleUnderline().run();
                          break;
                        case 3:
                          mainEditor.chain().focus().toggleStrike().run();
                          break;
                        case 4:
                          mainEditor.chain().focus().toggleBlockquote().run();
                          break;
                        case 5:
                          mainEditor.chain().focus().toggleBulletList().run();
                          break;
                        case 6:
                          mainEditor.chain().focus().toggleOrderedList().run();
                          break;
                        case 7: {
                          const url = window.prompt("Enter URL:");
                          if (url) {
                            mainEditor.chain().focus().setLink({ href: url }).run();
                          }
                          break;
                        }
                      }
                    }}
                    disabled={!mainEditor}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>

              <InlineTipTapEditor
                content={mainContent}
                onEditorReady={setMainEditor}
                onSave={handleSaveMainContent}
                placeholder={type === "blog" ? "Write your blog content here..." : "Write your page content here..."}
              />
            </Card>

            {type === "blog" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Typography variant="h6">Meta Description</Typography>
                    <Button variant="ghost" size="icon" onClick={handleCopyMeta} type="button">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    onBlur={handleMetaBlur}
                    placeholder="Write your meta description here..."
                    className="min-h-[120px]"
                  />
                </Card>

                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Typography variant="h6">Suggested Citations</Typography>
                    <Button variant="ghost" size="icon" onClick={handleCopyCitations} type="button">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {(citations || []).length > 0 ? citations.map((c) => `• ${c}`).join("\n") : ""}
                  </div>
                </Card>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Publish to Channel</DialogTitle>
            <DialogDescription>
              Publish this {typeLabel} to WordPress. Draft publish is recommended first for preview.
            </DialogDescription>
          </DialogHeader>

          {!isWpConnected ? (
            <div className="rounded-md border bg-background p-4 space-y-3">
              <Typography className="text-sm">No WordPress channel is connected for this business.</Typography>
              <Button onClick={handleRedirectToChannels}>Connect WordPress</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="p-4 space-y-2">
                <Typography variant="h6">Connected WordPress</Typography>
                <Typography className="text-sm text-muted-foreground">{wpConnection?.siteUrl}</Typography>
                <Typography className="text-xs text-muted-foreground">Site ID: {wpConnection?.siteId}</Typography>
              </Card>

              <Card className="p-4 space-y-2">
                <Typography variant="h6">Publish Payload</Typography>
                <Typography className="text-sm">
                  <span className="font-medium">Content ID:</span> {publishContentId}
                </Typography>
                <Typography className="text-sm">
                  <span className="font-medium">Type:</span> {publishType}
                </Typography>
                <Typography className="text-sm line-clamp-2">
                  <span className="font-medium">Title:</span> {publishTitle}
                </Typography>
                {publishSlug ? (
                  <Typography className="text-sm">
                    <span className="font-medium">Slug:</span> {publishSlug}
                  </Typography>
                ) : null}
              </Card>

              {lastPublishedData ? (
                <Card className="p-4 space-y-2">
                  <Typography variant="h6">Last Publish Result</Typography>
                  <Typography className="text-sm">
                    <span className="font-medium">WP ID:</span> {lastPublishedData.wpId}
                  </Typography>
                  <Typography className="text-sm">
                    <span className="font-medium">Status:</span> {lastPublishedData.status}
                  </Typography>
                  {lastPublishedData.previewUrl ? (
                    <Button
                      variant="outline"
                      onClick={() => openEmbeddedPreview(lastPublishedData.previewUrl || "", "WordPress Draft Preview")}
                    >
                      Preview Draft
                    </Button>
                  ) : null}
                </Card>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPublishModalOpen(false)}
              disabled={wpPublishMutation.isPending || wpPreviewMutation.isPending}
            >
              Close
            </Button>
            {isWpConnected ? (
              <>
                {isPersistedLive ? (
                  <Button
                    onClick={() => {
                      if (liveUrl) {
                        openEmbeddedPreview(liveUrl, "Published WordPress Blog");
                      }
                    }}
                    disabled={!liveUrl}
                  >
                    View Blog
                  </Button>
                ) : isPersistedDraftLike ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleOpenPreview}
                      disabled={!persistedContent?.wpId || wpPreviewMutation.isPending}
                    >
                      {wpPreviewMutation.isPending ? "Loading..." : "Preview Draft"}
                    </Button>
                    <Button
                      onClick={handlePublishLive}
                      disabled={!hasFinalContent || wpPublishMutation.isPending}
                    >
                      {wpPublishMutation.isPending ? "Publishing..." : "Publish Live"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handlePublishDraft}
                    disabled={
                      !hasFinalContent ||
                      contentStatusQuery.isLoading ||
                      wpPublishMutation.isPending ||
                      wpPreviewMutation.isPending
                    }
                  >
                    {wpPublishMutation.isPending || wpPreviewMutation.isPending ? "Publishing..." : "Publish Draft"}
                  </Button>
                )}
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmbeddedPreviewOpen} onOpenChange={setIsEmbeddedPreviewOpen}>
        <DialogContent
          className="w-[96vw] h-[90vh] max-w-[1400px] sm:max-w-[1400px] p-0 overflow-hidden"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Preview {embeddedPreviewTitle}</DialogTitle>
          <div className="h-full flex flex-col bg-background">
            <div className="shrink-0 border-b px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Typography variant="h6" className="truncate">{embeddedPreviewTitle}</Typography>
                <Typography className="text-xs text-muted-foreground truncate">{embeddedPreviewUrl}</Typography>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1 rounded-md border p-1 bg-muted/40">
                  <Button
                    size="sm"
                    variant={previewViewport === "desktop" ? "default" : "ghost"}
                    className="gap-1.5"
                    onClick={() => setPreviewViewport("desktop")}
                  >
                    <Monitor className="h-4 w-4" />
                    Desktop
                  </Button>
                  <Button
                    size="sm"
                    variant={previewViewport === "tablet" ? "default" : "ghost"}
                    className="gap-1.5"
                    onClick={() => setPreviewViewport("tablet")}
                  >
                    <Tablet className="h-4 w-4" />
                    Tablet
                  </Button>
                  <Button
                    size="sm"
                    variant={previewViewport === "mobile" ? "default" : "ghost"}
                    className="gap-1.5"
                    onClick={() => setPreviewViewport("mobile")}
                  >
                    <Smartphone className="h-4 w-4" />
                    Mobile
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    if (embeddedPreviewUrl) {
                      window.open(embeddedPreviewUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                  disabled={!embeddedPreviewUrl}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </Button>
                <DialogClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Close preview">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </div>

            <div className="relative flex-1 bg-muted/20">
              {isEmbeddedPreviewLoading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/75 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading preview...
                  </div>
                </div>
              ) : null}

              <div className="h-full w-full overflow-auto p-4 md:p-5">
                <div
                  className={cn(
                    "mx-auto h-full transition-all duration-300",
                    previewViewport === "desktop" && "w-full",
                    previewViewport === "tablet" && "w-full max-w-[900px]",
                    previewViewport === "mobile" && "w-full max-w-[430px]"
                  )}
                >
                  <iframe
                    title={embeddedPreviewTitle}
                    src={embeddedPreviewUrl}
                    className={cn(
                      "h-full w-full border-0 bg-white",
                      previewViewport !== "desktop" && "rounded-xl border shadow-sm"
                    )}
                    onLoad={() => setIsEmbeddedPreviewLoading(false)}
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              {showEmbedFallbackHint ? (
                <div className="absolute bottom-3 right-3 rounded-md border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm">
                  If preview is blocked, use "Open in New Tab".
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
