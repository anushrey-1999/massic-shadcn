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
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWebActionContentQuery, useWebPageActions, type WebActionType } from "@/hooks/use-web-page-actions";
import { copyToClipboard } from "@/utils/clipboard";
import { cleanEscapedContent } from "@/utils/content-cleaner";
import { resolvePageContent } from "@/utils/page-content-resolver";
import { InlineTipTapEditor } from "@/components/ui/inline-tiptap-editor";
import { ContentConverter } from "@/utils/content-converter";
import { buildStyledMassicHtml, getMassicCssText } from "@/utils/massic-html-copy";
import { detectPageContentFormat } from "@/utils/page-content-format";
import { normalizeWordpressBlogEditableSlug, normalizeWordpressSlugPath, wordpressSlugToDisplay } from "@/utils/wordpress-slug";
import { cn } from "@/lib/utils";
import { useWordpressConnection } from "@/hooks/use-wordpress-connector";
import {
  type WordpressSlugConflictInfo,
  WordpressPublishError,
  useWordpressContentStatus,
  useWordpressPreviewLink,
  useWordpressPublish,
  useWordpressSlugCheck,
  useWordpressUnpublish,
} from "@/hooks/use-wordpress-publishing";

function getTypeFromPageType(pageType: string | null, intent?: string | null): WebActionType {
  const pt = (pageType || "").toLowerCase();
  if (pt === "blog") return "blog";
  if (pt) return "page";
  return (intent || "").toLowerCase() === "informational" ? "blog" : "page";
}

export function WebBlogView({ businessId, pageId }: { businessId: string; pageId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageType = searchParams.get("pageType");
  const intent = searchParams.get("intent");
  const keyword = searchParams.get("keyword") || "";
  const type = getTypeFromPageType(pageType, intent);

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
    slug?: string | null;
    previewUrl?: string;
  } | null>(null);
  const [isEmbeddedPreviewOpen, setIsEmbeddedPreviewOpen] = React.useState(false);
  const [embeddedPreviewUrl, setEmbeddedPreviewUrl] = React.useState("");
  const [embeddedPreviewTitle, setEmbeddedPreviewTitle] = React.useState("Preview");
  const [isEmbeddedPreviewLoading, setIsEmbeddedPreviewLoading] = React.useState(false);
  const [showEmbedFallbackHint, setShowEmbedFallbackHint] = React.useState(false);
  const [previewViewport, setPreviewViewport] = React.useState<"desktop" | "tablet" | "mobile">("desktop");
  const [confirmPublishAction, setConfirmPublishAction] = React.useState<"draft" | "live" | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [editableSlug, setEditableSlug] = React.useState("");
  const [isSlugEdited, setIsSlugEdited] = React.useState(false);
  const [slugCheckResult, setSlugCheckResult] = React.useState<{
    slug: string;
    publishUrl: string | null;
    exists: boolean;
    sameMappedContent: boolean;
    conflict: WordpressSlugConflictInfo | null;
    suggestedSlug?: string | null;
    mappedToDifferentContent: boolean;
    mappedContentId: string | null;
  } | null>(null);
  const [slugCheckError, setSlugCheckError] = React.useState<string | null>(null);
  const [isSlugChecking, setIsSlugChecking] = React.useState(false);
  const [isAutoResolvingSlug, setIsAutoResolvingSlug] = React.useState(false);

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
  const { mutateAsync: slugCheckMutateAsync } = useWordpressSlugCheck();
  const wpPreviewMutation = useWordpressPreviewLink();
  const wpUnpublishMutation = useWordpressUnpublish();
  const wpConnection = wpConnectionQuery.data?.connection || null;
  const isWpConnected = Boolean(wpConnectionQuery.data?.connected && wpConnection);
  const lastAutoSlugCheckKeyRef = React.useRef("");

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
      const rawPage = resolvePageContent(data);
      setMainContent(rawPage);
      setMetaDescription("");
      setCitations([]);

      lastSavedMainRef.current = canonicalize(rawPage);
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
  const contentFormat = React.useMemo(() => detectPageContentFormat(mainContent), [mainContent]);
  const isHtmlContent = contentFormat === "html";

  const inferPage = data?.output_data?.page || {};
  const inferBlog = inferPage?.blog || {};
  const publishTitle = inferBlog?.meta_title || keyword || "Untitled";
  const publishContentId = inferPage?.page_id || pageId;
  const inferSlug = React.useMemo(
    () => (typeof inferPage?.slug === "string" ? String(inferPage.slug).trim() : ""),
    [inferPage?.slug]
  );
  const generatedSlugFallback = React.useMemo(
    () => normalizeWordpressSlugPath(publishTitle || keyword || ""),
    [keyword, publishTitle]
  );
  const generatedSlug = React.useMemo(() => {
    if (inferSlug) return normalizeWordpressBlogEditableSlug(inferSlug);
    return normalizeWordpressBlogEditableSlug(generatedSlugFallback);
  }, [generatedSlugFallback, inferSlug]);
  const normalizedEditableSlug = React.useMemo(() => normalizeWordpressBlogEditableSlug(editableSlug), [editableSlug]);
  const hasInvalidBlogSlug = React.useMemo(
    () => Boolean(normalizedEditableSlug && normalizedEditableSlug.includes("/")),
    [normalizedEditableSlug]
  );
  const normalizedSlugForPublish = React.useMemo(() => {
    if (!normalizedEditableSlug || hasInvalidBlogSlug) return "";
    return normalizedEditableSlug;
  }, [hasInvalidBlogSlug, normalizedEditableSlug]);
  const publishType: "post" | "page" = type === "blog" ? "post" : "page";
  const contentStatusQuery = useWordpressContentStatus(
    wpConnection?.connectionId || null,
    publishContentId ? String(publishContentId) : null
  );
  const persistedContent = contentStatusQuery.data?.content || null;
  const persistedStatus = (persistedContent?.status || "").toLowerCase();
  const isPersistedTrashed = persistedStatus === "trash";
  const persistedSlug = React.useMemo(
    () => normalizeWordpressBlogEditableSlug(persistedContent?.slug || ""),
    [persistedContent?.slug]
  );
  const effectiveModalSlug = React.useMemo(() => {
    if (!isPersistedTrashed && persistedSlug) return persistedSlug;
    if (!isPersistedTrashed && lastPublishedData?.slug) return normalizeWordpressBlogEditableSlug(lastPublishedData.slug);
    if (generatedSlug) return generatedSlug;
    return generatedSlugFallback;
  }, [generatedSlug, generatedSlugFallback, isPersistedTrashed, lastPublishedData?.slug, persistedSlug]);
  const isPersistedLive = persistedStatus === "publish";
  const isPersistedDraftLike = Boolean(persistedContent && !isPersistedLive && !isPersistedTrashed);
  const hasSlugConflict = Boolean(slugCheckResult?.exists && !slugCheckResult?.sameMappedContent && slugCheckResult?.conflict);
  const slugConflictReason = slugCheckResult?.conflict?.reason || null;
  const isPublishBusy =
    wpPublishMutation.isPending ||
    wpPreviewMutation.isPending ||
    wpUnpublishMutation.isPending;
  const isSlugInputBusy = isPublishBusy || isAutoResolvingSlug;
  const isSlugActionBusy = isPublishBusy || isSlugChecking || isAutoResolvingSlug;
  const publishStateLabel = isPersistedLive
    ? "Live"
    : isPersistedDraftLike
      ? "Draft"
      : isPersistedTrashed
        ? "In Trash"
        : "Not Published";
  const publishStateHint = isPersistedLive
    ? "This content is live on WordPress."
    : isPersistedDraftLike
      ? "A draft exists in WordPress."
      : isPersistedTrashed
        ? "This content was moved to trash."
        : "No WordPress post/page exists yet.";

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
  const publishUrlPreview = React.useMemo(() => {
    const siteUrl = String(wpConnection?.siteUrl || "").replace(/\/+$/, "");
    const slugForPreview = normalizedSlugForPublish || normalizeWordpressBlogEditableSlug(slugCheckResult?.slug || "");
    if (!siteUrl || !slugForPreview) {
      return null;
    }

    return `${siteUrl}/${slugForPreview}`;
  }, [normalizedSlugForPublish, slugCheckResult?.slug, wpConnection?.siteUrl]);

  React.useEffect(() => {
    if (!isPublishModalOpen) return;
    if (isSlugEdited) return;
    setEditableSlug(normalizeWordpressBlogEditableSlug(effectiveModalSlug));
  }, [effectiveModalSlug, isPublishModalOpen, isSlugEdited]);

  React.useEffect(() => {
    if (isPublishModalOpen) {
      // Freeze background content polling while publish modal is active.
      setPollingDisabled(true);
      return;
    }

    const editorFocused = !!mainEditor?.isFocused;
    if (!editorFocused) {
      setPollingDisabled(false);
    }
  }, [isPublishModalOpen, mainEditor]);

  React.useEffect(() => {
    if (!isPublishModalOpen || !isWpConnected || !wpConnection?.connectionId || !publishContentId) {
      return;
    }

    void contentStatusQuery.refetch();
  }, [isPublishModalOpen, isWpConnected, publishContentId, wpConnection?.connectionId]);

  React.useEffect(() => {
    if (isPublishModalOpen) return;
    setIsSlugEdited(false);
    setSlugCheckResult(null);
    setSlugCheckError(null);
    setIsAutoResolvingSlug(false);
    lastAutoSlugCheckKeyRef.current = "";
  }, [isPublishModalOpen]);

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

  const runSlugCheck = React.useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!isWpConnected || !wpConnection?.connectionId || !publishContentId) {
      return null;
    }

    if (!normalizedEditableSlug) {
      setSlugCheckResult(null);
      setSlugCheckError("Slug is required.");
      lastAutoSlugCheckKeyRef.current = "";
      return null;
    }

    if (hasInvalidBlogSlug) {
      setSlugCheckResult(null);
      setSlugCheckError("Blog slug must be a single segment (no nested '/' paths).");
      lastAutoSlugCheckKeyRef.current = "";
      return null;
    }

    const checkKey = `${wpConnection.connectionId}:${String(publishContentId)}:${publishType}:${normalizedSlugForPublish}`;
    if (!force && lastAutoSlugCheckKeyRef.current === checkKey) {
      return null;
    }

    if (!force) {
      lastAutoSlugCheckKeyRef.current = checkKey;
    }

    setIsSlugChecking(true);
    setSlugCheckError(null);

    try {
      const response = await slugCheckMutateAsync({
        connectionId: String(wpConnection.connectionId),
        contentId: String(publishContentId),
        type: publishType,
        slug: normalizedSlugForPublish,
      });

      const result = response?.data || null;
      setSlugCheckResult(result);
      return result;
    } catch (error: any) {
      const message = error?.message || "Failed to check slug in WordPress.";
      setSlugCheckResult(null);
      setSlugCheckError(message);
      return null;
    } finally {
      setIsSlugChecking(false);
    }
  }, [
    hasInvalidBlogSlug,
    isWpConnected,
    normalizedEditableSlug,
    normalizedSlugForPublish,
    publishContentId,
    publishType,
    slugCheckMutateAsync,
    wpConnection?.connectionId,
  ]);

  React.useEffect(() => {
    if (!isPublishModalOpen || !isWpConnected || !wpConnection?.connectionId || !publishContentId) {
      return;
    }

    if (!normalizedEditableSlug) {
      setSlugCheckResult(null);
      setSlugCheckError(isSlugEdited ? "Slug is required." : null);
      lastAutoSlugCheckKeyRef.current = "";
      return;
    }

    if (hasInvalidBlogSlug) {
      setSlugCheckResult(null);
      setSlugCheckError("Blog slug must be a single segment (no nested '/' paths).");
      lastAutoSlugCheckKeyRef.current = "";
      return;
    }

    const delayMs = isSlugEdited ? 350 : 0;
    const timer = window.setTimeout(() => {
      void runSlugCheck();
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    isPublishModalOpen,
    hasInvalidBlogSlug,
    isWpConnected,
    isSlugEdited,
    normalizedEditableSlug,
    publishContentId,
    runSlugCheck,
    wpConnection?.connectionId,
  ]);

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
        slug: normalizedSlugForPublish || null,
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
      publishTitle,
      publishType,
      normalizedSlugForPublish,
      wpConnection?.connectionId,
    ]
  );

  const handleRedirectToChannels = React.useCallback(() => {
    router.push(`/business/${businessId}/web?integrations=1`);
    setIsPublishModalOpen(false);
  }, [businessId, router]);

  const handlePublishDraft = React.useCallback(async () => {
    if (!isWpConnected || !wpConnection?.connectionId) return;
    if (!hasFinalContent) return;

    let publishResult;
    try {
      publishResult = await wpPublishMutation.mutateAsync(buildPublishPayload("draft"));
    } catch (error) {
      const publishError = error as WordpressPublishError;
      if (publishError?.code === "slug_conflict") {
        const details = publishError?.details || {};
        const conflictReason =
          typeof details?.reason === "string"
            ? details.reason
            : ((details?.conflict as WordpressSlugConflictInfo | null)?.reason || null);
        const conflictMessage = conflictReason === "parent_type_conflict"
          ? "This nested page path is blocked because a parent segment already belongs to non-page content."
          : "This slug already exists in WordPress. Use the suggested slug or edit manually.";
        setSlugCheckResult({
          slug: normalizedSlugForPublish,
          publishUrl: publishUrlPreview || null,
          exists: true,
          sameMappedContent: false,
          conflict: (details?.conflict as WordpressSlugConflictInfo) || null,
          suggestedSlug: typeof details?.suggestedSlug === "string" ? details.suggestedSlug : null,
          mappedToDifferentContent: false,
          mappedContentId: null,
        });
        setSlugCheckError(conflictMessage);
        toast.error(conflictReason === "parent_type_conflict" ? "Nested parent path conflict" : "Slug conflict: choose a unique slug");
      }
      return;
    }

    const published = publishResult?.data;
    if (!published) return;
    setLastPublishedData({
      contentId: published.contentId,
      wpId: published.wpId,
      permalink: published.permalink || null,
      editUrl: published.editUrl || null,
      status: published.status || "draft",
      slug: published.slug || normalizedSlugForPublish || null,
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

    let publishResult;
    try {
      publishResult = await wpPublishMutation.mutateAsync(buildPublishPayload("publish"));
    } catch (error) {
      const publishError = error as WordpressPublishError;
      if (publishError?.code === "slug_conflict") {
        const details = publishError?.details || {};
        const conflictReason =
          typeof details?.reason === "string"
            ? details.reason
            : ((details?.conflict as WordpressSlugConflictInfo | null)?.reason || null);
        const conflictMessage = conflictReason === "parent_type_conflict"
          ? "This nested page path is blocked because a parent segment already belongs to non-page content."
          : "This slug already exists in WordPress. Use the suggested slug or edit manually.";
        setSlugCheckResult({
          slug: normalizedSlugForPublish,
          publishUrl: publishUrlPreview || null,
          exists: true,
          sameMappedContent: false,
          conflict: (details?.conflict as WordpressSlugConflictInfo) || null,
          suggestedSlug: typeof details?.suggestedSlug === "string" ? details.suggestedSlug : null,
          mappedToDifferentContent: false,
          mappedContentId: null,
        });
        setSlugCheckError(conflictMessage);
        toast.error(conflictReason === "parent_type_conflict" ? "Nested parent path conflict" : "Slug conflict: choose a unique slug");
      }
      return;
    }

    const published = publishResult?.data;
    if (!published) return;
    setLastPublishedData((prev) => ({
      contentId: published.contentId,
      wpId: published.wpId,
      permalink: published.permalink || null,
      editUrl: published.editUrl || null,
      status: published.status || "publish",
      slug: published.slug || normalizedSlugForPublish || null,
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
          slug: persistedContent?.slug || normalizedSlugForPublish || null,
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

  const handleChangeWordpressStatus = React.useCallback(async (targetStatus: "draft" | "trash") => {
    if (!isWpConnected || !wpConnection?.connectionId) return;
    if (!publishContentId) return;

    const response = await wpUnpublishMutation.mutateAsync({
      connectionId: String(wpConnection.connectionId),
      contentId: String(publishContentId),
      targetStatus,
    });
    const unpublishData = response?.data;

    if (unpublishData) {
      setLastPublishedData((prev) =>
        prev
          ? {
            ...prev,
            status: unpublishData.status || targetStatus,
            permalink: null,
            previewUrl: undefined,
          }
          : prev
      );
    }

    setIsEmbeddedPreviewOpen(false);
    toast.success(targetStatus === "trash" ? "Deleted in WordPress (moved to trash)" : "Moved to draft in WordPress");
    await contentStatusQuery.refetch();
    if (targetStatus === "trash") {
      setIsPublishModalOpen(false);
    }
  }, [
    contentStatusQuery,
    isWpConnected,
    publishContentId,
    wpConnection?.connectionId,
    wpUnpublishMutation,
  ]);

  const handleCopyText = async () => {
    const textContent = mainEditor?.getText() || mainContent || "";
    const ok = await copyToClipboard(textContent);
    if (ok) toast.success("Text copied");
    else toast.error("Copy failed");
  };

  const handleCopyMarkdown = async () => {
    const ok = await copyToClipboard(mainContent || "");
    if (ok) toast.success("Copied");
    else toast.error("Copy failed");
  };

  const handleCopyHtml = async () => {
    const htmlContent = (mainEditor?.getHTML() || ContentConverter.markdownToHtml(mainContent || "") || "").trim();
    if (!htmlContent) {
      toast.error("Nothing to copy");
      return;
    }

    const baseCss = await getMassicCssText();
    const styledHtml = buildStyledMassicHtml(htmlContent, { baseCss });

    try {
      if (typeof ClipboardItem !== "undefined") {
        const clipboardItem = new ClipboardItem({
          "text/html": new Blob([styledHtml], { type: "text/html" }),
          "text/plain": new Blob([styledHtml], { type: "text/plain" }),
        });
        await navigator.clipboard.write([clipboardItem]);
      } else {
        await copyToClipboard(styledHtml);
      }
      toast.success("HTML copied with styles");
    } catch {
      const ok = await copyToClipboard(styledHtml);
      if (ok) toast.success("HTML copied with styles");
      else toast.error("Copy failed");
    }
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

  const confirmAndRunPublishAction = React.useCallback(async () => {
    const action = confirmPublishAction;
    setConfirmPublishAction(null);
    if (!action) return;

    if (!normalizedEditableSlug) {
      setSlugCheckError("Slug is required.");
      toast.error("Slug is required before publishing");
      return;
    }

    if (hasInvalidBlogSlug || !normalizedSlugForPublish) {
      setSlugCheckError("Blog slug must be a single segment (no nested '/' paths).");
      toast.error("Blog slug must be a single segment");
      return;
    }

    const check = await runSlugCheck({ force: true });
    if (!check) {
      return;
    }

    const hasBlockingConflict = Boolean(check.exists && !check.sameMappedContent && check.conflict);
    if (hasBlockingConflict) {
      const conflictReason = check?.conflict?.reason || null;
      const conflictMessage = conflictReason === "parent_type_conflict"
        ? "This nested page path is blocked because a parent segment already belongs to non-page content."
        : "This slug already exists in WordPress. Use the suggested slug or edit manually.";
      setSlugCheckError(conflictMessage);
      toast.error(conflictReason === "parent_type_conflict" ? "Nested parent path conflict" : "Slug conflict: choose a unique slug");
      return;
    }

    if (action === "draft") {
      await handlePublishDraft();
      return;
    }

    await handlePublishLive();
  }, [confirmPublishAction, handlePublishDraft, handlePublishLive, hasInvalidBlogSlug, normalizedEditableSlug, normalizedSlugForPublish, runSlugCheck]);

  const autoResolveSlug = React.useCallback(async () => {
    const suggestedSlug = slugCheckResult?.suggestedSlug || null;
    if (!suggestedSlug) {
      toast.error("No suggested slug available");
      return;
    }

    setIsAutoResolvingSlug(true);
    const normalizedSuggestion = normalizeWordpressBlogEditableSlug(suggestedSlug);
    setEditableSlug(normalizedSuggestion);
    setIsSlugEdited(true);
    setSlugCheckError(null);
    toast.success(`Slug updated to ${wordpressSlugToDisplay(normalizedSuggestion, "/untitled-content")}`);
    setIsAutoResolvingSlug(false);
  }, [slugCheckResult?.suggestedSlug]);

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
            {isHtmlContent ? (
              <>
                <Button variant="outline" className="gap-2" onClick={handleCopyHtml} disabled={isProcessing}>
                  <Copy className="h-4 w-4" />
                  Copy HTML
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleCopyText} disabled={isProcessing}>
                  <Copy className="h-4 w-4" />
                  Copy Text
                </Button>
              </>
            ) : (
              <Button variant="outline" className="gap-2" onClick={handleCopyMarkdown} disabled={isProcessing}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            )}
            <Button
              className="gap-2"
              type="button"
              onClick={() => setIsPublishModalOpen(true)}
              disabled={isProcessing || !hasFinalContent}
            >
              <Globe className="h-4 w-4" />
              Actions
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
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Publish to WordPress</DialogTitle>
            <DialogDescription>
              Choose what to do with this {typeLabel}.
            </DialogDescription>
          </DialogHeader>

          {!isWpConnected ? (
            <div className="rounded-md border bg-background p-4 space-y-3">
              <Typography className="text-sm">No WordPress channel connected.</Typography>
              <Button onClick={handleRedirectToChannels}>Connect WordPress</Button>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Typography className="text-sm font-medium truncate">{wpConnection?.siteUrl}</Typography>
                <Typography className="text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                  {publishStateLabel}
                </Typography>
              </div>
              <Typography className="text-sm text-muted-foreground">{publishStateHint}</Typography>
              <Typography className="text-sm line-clamp-2">{publishTitle}</Typography>
              <div className="space-y-1 pt-2">
                <Typography className="text-xs text-muted-foreground">Generated slug</Typography>
                <Typography className="text-sm font-mono break-all">{wordpressSlugToDisplay(effectiveModalSlug, "/untitled-content")}</Typography>
              </div>
              <div className="space-y-1 pt-2">
                <Typography className="text-xs text-muted-foreground">Publish slug</Typography>
                <Input
                  value={editableSlug}
                  onChange={(event) => {
                    setEditableSlug(normalizeWordpressBlogEditableSlug(event.target.value));
                    setIsSlugEdited(true);
                  }}
                  placeholder="enter-blog-slug"
                  disabled={isSlugInputBusy}
                />
              </div>
              <div className="space-y-1">
                <Typography className="text-xs text-muted-foreground">Publish route</Typography>
                <Typography className="text-sm font-mono break-all">{publishUrlPreview || "Unavailable"}</Typography>
              </div>
              {isSlugChecking ? (
                <Typography className="text-xs text-muted-foreground">Checking slug availability...</Typography>
              ) : null}
              {slugCheckError ? (
                <Typography className="text-xs text-destructive">{slugCheckError}</Typography>
              ) : null}
              {hasSlugConflict ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 space-y-2">
                  <div>
                    {slugConflictReason === "parent_type_conflict"
                      ? "This nested page path is blocked because a parent segment already belongs to non-page content. Change the parent path."
                      : "This slug already exists in WordPress. Publishing is blocked until you use a unique slug."}
                  </div>
                  {slugCheckResult?.suggestedSlug ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={autoResolveSlug}
                      disabled={isSlugActionBusy}
                    >
                      {isAutoResolvingSlug ? "Resolving..." : `Auto-resolve to ${wordpressSlugToDisplay(slugCheckResult?.suggestedSlug, "/next-available")}`}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPublishModalOpen(false)}
              disabled={isPublishBusy}
            >
              Cancel
            </Button>
            {isWpConnected ? (
              <>
                {isPersistedLive ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleChangeWordpressStatus("draft")}
                      disabled={wpUnpublishMutation.isPending}
                    >
                      {wpUnpublishMutation.isPending ? "Updating..." : "Move to Draft"}
                    </Button>
                    <Button
                      onClick={() => {
                        if (liveUrl) {
                          openEmbeddedPreview(liveUrl, "Published WordPress Blog");
                        }
                      }}
                      disabled={!liveUrl}
                    >
                      View Live
                    </Button>
                  </>
                ) : isPersistedDraftLike ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      disabled={wpUnpublishMutation.isPending}
                    >
                      {wpUnpublishMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleOpenPreview}
                      disabled={!persistedContent?.wpId || wpPreviewMutation.isPending}
                    >
                      {wpPreviewMutation.isPending ? "Loading..." : "Preview Draft"}
                    </Button>
                    <Button
                      onClick={() => setConfirmPublishAction("live")}
                      disabled={!hasFinalContent || !normalizedSlugForPublish || hasSlugConflict || isSlugChecking || wpPublishMutation.isPending}
                    >
                      {wpPublishMutation.isPending ? "Publishing..." : "Publish Live"}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setConfirmPublishAction("draft")}
                    disabled={
                      !hasFinalContent ||
                      !normalizedSlugForPublish ||
                      hasSlugConflict ||
                      isSlugChecking ||
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

      <AlertDialog open={confirmPublishAction !== null} onOpenChange={(open) => !open && setConfirmPublishAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmPublishAction === "live" ? "Publish Live to WordPress?" : "Publish Draft to WordPress?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPublishAction === "live"
                ? `This will update the live WordPress content at ${publishUrlPreview || "the selected route"}.`
                : `This will create or update the WordPress draft at ${publishUrlPreview || "the selected route"}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={confirmAndRunPublishAction} disabled={isPublishBusy}>
                {confirmPublishAction === "live" ? "Confirm Publish Live" : "Confirm Publish Draft"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete WordPress Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the WordPress content to trash. You can restore it later from WordPress admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={async () => {
                  setIsDeleteConfirmOpen(false);
                  await handleChangeWordpressStatus("trash");
                }}
                disabled={isPublishBusy}
              >
                Confirm Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
