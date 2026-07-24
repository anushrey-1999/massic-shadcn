"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bold,
  Copy,
  ExternalLink,
  ImageIcon,
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { buildStyledMassicHtml, getMassicBlogPageCssText } from "@/utils/massic-html-copy";
import { detectPageContentFormat } from "@/utils/page-content-format";
import { normalizeWordpressBlogEditableSlug, normalizeWordpressSlugPath, wordpressSlugToDisplay } from "@/utils/wordpress-slug";
import { cn } from "@/lib/utils";
import {
  type WordpressSlugConflictInfo,
  useWordpressPreviewLink,
  useWordpressPublish,
  useWordpressUnpublish,
} from "@/hooks/use-wordpress-publishing";
import {
  CmsPublishError,
  useCmsPublish,
  useCmsPublishingChannel,
  useCmsPublishingContentStatus,
  useCmsWordpressPageTemplateStatus,
  useCmsSlugCheck,
  useCmsWebflowRollbackToDraft,
  useCmsWebflowStagingPreview,
} from "@/hooks/use-cms-publishing";
import {
  WebflowPublishConfirmDescription,
  WebflowPublishConfirmHint,
  type WebflowPublishConfirmAction,
} from "@/components/organisms/web-page-actions/webflow-publish-confirm-hints";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import {
  clearWebflowStagingPreviewSession,
  openWebflowPreviewInNewTab,
  persistWebflowStagingPreviewSession,
  readWebflowStagingPreviewSession,
  WEBFLOW_LIVE_VIEW_OPEN_DELAY_MS,
  WEBFLOW_STAGING_PUBLISH_OPEN_DELAY_MS,
  WEBFLOW_STAGING_VIEW_OPEN_DELAY_MS,
} from "@/components/organisms/web-page-actions/webflow-open-preview";

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
  const guardPublish = useFeatureActionGuard("web.publish");

  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const isInitialLoadRef = React.useRef(true);
  const lastStatusRef = React.useRef<string>("");
  const [pollingDisabled, setPollingDisabled] = React.useState(false);

  const [mainContent, setMainContent] = React.useState("");
  const [blogTitle, setBlogTitle] = React.useState("");
  const [metaTitle, setMetaTitle] = React.useState("");
  const [metaDescription, setMetaDescription] = React.useState("");
  const [citations, setCitations] = React.useState<string[]>([]);
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);
  const [publishTab, setPublishTab] = React.useState<"details" | "images">("details");
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
  const [redirectPreviewOnFallback, setRedirectPreviewOnFallback] = React.useState(false);
  const [previewViewport, setPreviewViewport] = React.useState<"desktop" | "tablet" | "mobile">("desktop");
  const [confirmPublishAction, setConfirmPublishAction] = React.useState<
    | "draft"
    | "live"
    | "webflow-draft"
    | "webflow-live"
    | "webflow-staging-preview"
    | "webflow-rollback-draft"
    | "republish"
    | "update-draft"
    | null
  >(null);
  const [webflowStagingPreview, setWebflowStagingPreview] = React.useState<{
    contentId: string;
    url: string;
  } | null>(null);
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
  const lastSavedBlogTitleRef = React.useRef<string>("");
  const lastSavedMetaTitleRef = React.useRef<string>("");
  const lastSavedMetaDescriptionRef = React.useRef<string>("");
  const blogMetaSaveTimerRef = React.useRef<number | null>(null);
  const BLOG_META_DEBOUNCE_MS = 2800;

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
  const cmsChannelQuery = useCmsPublishingChannel(businessId || null);
  const cmsChannel = cmsChannelQuery.data || null;
  const activePlatform = cmsChannel?.platform || null;
  const activeConnection = cmsChannel?.connection || null;
  const activeTarget = cmsChannel?.target || null;
  const isActiveWordpress = activePlatform === "wordpress" && Boolean(activeConnection);
  const isActiveWebflow = activePlatform === "webflow" && Boolean(activeConnection);
  const wpConnection = isActiveWordpress ? activeConnection : null;
  const isWpConnected = isActiveWordpress;
  const cmsPublishMutation = useCmsPublish();
  const webflowStagingPreviewMutation = useCmsWebflowStagingPreview();
  const webflowRollbackToDraftMutation = useCmsWebflowRollbackToDraft();
  const { mutateAsync: slugCheckMutateAsync } = useCmsSlugCheck();
  const wpPreviewMutation = useWordpressPreviewLink();
  const wpUnpublishMutation = useWordpressUnpublish();
  const wpPublishMutation = useWordpressPublish();
  const isWebflowReady = isActiveWebflow && Boolean(activeTarget?.targetId);
  const webflowDomains = cmsChannel?.domains || [];
  const webflowStagingDomain = webflowDomains.find((domain) => domain.type === "webflow_subdomain") || null;
  const webflowCustomDomains = webflowDomains.filter((domain) => domain.type === "custom_domain");
  const [publishToWebflowSubdomain, setPublishToWebflowSubdomain] = React.useState(true);
  const [selectedWebflowCustomDomainIds, setSelectedWebflowCustomDomainIds] = React.useState<string[]>([]);
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
      const rawMetaTitle =
        typeof blogData === "object" && blogData !== null
          ? blogData?.meta_title || ""
          : "";
      const rawMeta =
        typeof blogData === "object" && blogData !== null
          ? blogData?.meta_description || ""
          : "";
      const rawCitations =
        typeof blogData === "object" && blogData !== null && Array.isArray(blogData?.citations)
          ? blogData.citations
          : [];
      const rawBlogTitle =
        typeof blogData === "object" && blogData !== null && typeof blogData?.title === "string"
          ? blogData.title
          : "";

      setMainContent(cleanEscapedContent(rawBlog));
      setBlogTitle(cleanEscapedContent(rawBlogTitle));
      setMetaTitle(cleanEscapedContent(rawMetaTitle));
      setMetaDescription(cleanEscapedContent(rawMeta));
      setCitations(Array.isArray(rawCitations) ? rawCitations : []);

      lastSavedMainRef.current = canonicalize(cleanEscapedContent(rawBlog));
      lastSavedBlogTitleRef.current = canonicalize(cleanEscapedContent(rawBlogTitle));
      lastSavedMetaTitleRef.current = canonicalize(cleanEscapedContent(rawMetaTitle));
      lastSavedMetaDescriptionRef.current = canonicalize(cleanEscapedContent(rawMeta));
    } else {
      const rawPage = resolvePageContent(data);
      setMainContent(rawPage);
      setBlogTitle("");
      setMetaTitle("");
      setMetaDescription("");
      setCitations([]);

      lastSavedMainRef.current = canonicalize(rawPage);
      lastSavedBlogTitleRef.current = "";
      lastSavedMetaTitleRef.current = "";
      lastSavedMetaDescriptionRef.current = "";
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
  const contentFormat = React.useMemo(() => detectPageContentFormat(mainContent), [mainContent]);
  const isHtmlContent = contentFormat === "html";

  const typeLabel = type === "blog" ? "blog" : "page";
  const publishType: "post" | "page" = type === "blog" ? "post" : "page";
  const outlineFromServer = cleanEscapedContent(data?.output_data?.page?.outline || "");
  const hasOutline = !!outlineFromServer && outlineFromServer.trim().length > 0;
  const hasFinalContent = !!mainContent && mainContent.trim().length > 0;

  const inferPage = data?.output_data?.page || {};
  const inferBlog = inferPage?.blog || {};
  const visiblePostTitle =
    type === "blog"
      ? blogTitle.trim() || inferPage?.title || keyword || "Untitled"
      : inferPage?.title || keyword || "Untitled";
  const seoTitle = metaTitle.trim() || inferBlog?.meta_title || keyword || "Untitled";
  const publishContentId = inferPage?.page_id || pageId;
  const inferSlug = React.useMemo(
    () => (typeof inferPage?.slug === "string" ? String(inferPage.slug).trim() : ""),
    [inferPage?.slug]
  );
  const generatedSlugFallback = React.useMemo(
    () => normalizeWordpressSlugPath(seoTitle || visiblePostTitle || keyword || ""),
    [keyword, seoTitle, visiblePostTitle]
  );
  const generatedSlug = React.useMemo(() => {
    const source = inferSlug || generatedSlugFallback;
    return publishType === "page"
      ? normalizeWordpressSlugPath(source)
      : normalizeWordpressBlogEditableSlug(source);
  }, [generatedSlugFallback, inferSlug, publishType]);
  const normalizedEditableSlug = React.useMemo(
    () =>
      publishType === "page"
        ? normalizeWordpressSlugPath(editableSlug)
        : normalizeWordpressBlogEditableSlug(editableSlug),
    [editableSlug, publishType]
  );
  const hasInvalidBlogSlug = React.useMemo(
    () => Boolean(
      normalizedEditableSlug &&
      normalizedEditableSlug.includes("/") &&
      (publishType === "post" || activePlatform === "webflow")
    ),
    [activePlatform, normalizedEditableSlug, publishType]
  );
  const normalizedSlugForPublish = React.useMemo(() => {
    if (!normalizedEditableSlug || hasInvalidBlogSlug) return "";
    return normalizedEditableSlug;
  }, [hasInvalidBlogSlug, normalizedEditableSlug]);
  const singleSegmentSlugError = publishType === "post"
    ? "Blog slug must be a single segment (no nested '/' paths)."
    : "Webflow slug must be a single segment (no nested '/' paths).";
  const contentStatusQuery = useCmsPublishingContentStatus(
    businessId || null,
    publishContentId && (isActiveWebflow || (isActiveWordpress && isPublishModalOpen))
      ? String(publishContentId)
      : null
  );
  const requiresWordpressPageTemplate = isActiveWordpress && publishType === "page";
  const wpPageTemplateQuery = useCmsWordpressPageTemplateStatus(
    businessId || null,
    Boolean(isPublishModalOpen && requiresWordpressPageTemplate)
  );
  const webflowPersistedContent = activePlatform === "webflow" ? contentStatusQuery.data?.content || null : null;
  const webflowPersistedStatus = (webflowPersistedContent?.status || "").toLowerCase();
  const webflowPersistedSlug = React.useMemo(
    () => normalizeWordpressBlogEditableSlug(webflowPersistedContent?.slug || ""),
    [webflowPersistedContent?.slug]
  );
  const lastPublishedStatus = (lastPublishedData?.status || "").toLowerCase();
  const isWebflowStagingPreviewStatus = React.useCallback(
    (status?: string | null) => String(status || "").toLowerCase() === "staged_for_staging_preview",
    []
  );
  const isWebflowLive = webflowPersistedStatus === "published" || lastPublishedStatus === "published";
  const isWebflowDraftLike = Boolean(
    (webflowPersistedContent && webflowPersistedStatus === "draft") ||
    isWebflowStagingPreviewStatus(webflowPersistedStatus) ||
    isWebflowStagingPreviewStatus(lastPublishedStatus) ||
    (lastPublishedStatus === "draft" && lastPublishedData?.contentId)
  );
  const hasWebflowMapping = Boolean(webflowPersistedContent?.itemId || lastPublishedData?.contentId);
  const webflowPublishState: "not_published" | "draft" | "live" = isWebflowLive
    ? "live"
    : isWebflowDraftLike || hasWebflowMapping
      ? "draft"
      : "not_published";
  const persistedContent = activePlatform === "wordpress" ? contentStatusQuery.data?.content || null : null;
  const persistedStatus = (persistedContent?.status || "").toLowerCase();
  const isPersistedTrashed = persistedStatus === "trash";
  const persistedSlug = React.useMemo(
    () =>
      publishType === "page"
        ? normalizeWordpressSlugPath(persistedContent?.slug || "")
        : normalizeWordpressBlogEditableSlug(persistedContent?.slug || ""),
    [persistedContent?.slug, publishType]
  );
  const effectiveModalSlug = React.useMemo(() => {
    if (!isPersistedTrashed && persistedSlug) return persistedSlug;
    if (!isPersistedTrashed && webflowPersistedSlug) return webflowPersistedSlug;
    if (!isPersistedTrashed && lastPublishedData?.slug) {
      return publishType === "page"
        ? normalizeWordpressSlugPath(lastPublishedData.slug)
        : normalizeWordpressBlogEditableSlug(lastPublishedData.slug);
    }
    if (generatedSlug) return generatedSlug;
    return generatedSlugFallback;
  }, [generatedSlug, generatedSlugFallback, isPersistedTrashed, lastPublishedData?.slug, persistedSlug, publishType, webflowPersistedSlug]);
  const isPersistedLive = persistedStatus === "publish";
  const isPersistedDraftLike = Boolean(persistedContent && !isPersistedLive && !isPersistedTrashed);
  const hasSlugConflict = Boolean(slugCheckResult?.exists && !slugCheckResult?.sameMappedContent && slugCheckResult?.conflict);
  const slugConflictReason = slugCheckResult?.conflict?.reason || null;
  const isPublishBusy =
    cmsPublishMutation.isPending ||
    webflowStagingPreviewMutation.isPending ||
    webflowRollbackToDraftMutation.isPending ||
    wpPreviewMutation.isPending ||
    wpUnpublishMutation.isPending;
  const isWordpressPageTemplateChecking = Boolean(
    requiresWordpressPageTemplate &&
    isPublishModalOpen &&
    (wpPageTemplateQuery.isLoading || wpPageTemplateQuery.isFetching)
  );
  const wordpressPageTemplateBlockMessage = requiresWordpressPageTemplate &&
    !isWordpressPageTemplateChecking &&
    (wpPageTemplateQuery.isError || wpPageTemplateQuery.data?.exists === false)
    ? "Massic Template doesn't exist in this WordPress theme. Add a page template named \"Massic Template\" before publishing pages."
    : null;
  const isWordpressPagePublishBlocked = Boolean(
    requiresWordpressPageTemplate &&
    (isWordpressPageTemplateChecking || wordpressPageTemplateBlockMessage)
  );
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
    if (isPersistedLive && persistedContent?.wpId && activeConnection?.siteUrl) {
      return `${String(activeConnection.siteUrl).replace(/\/+$/, "")}/?p=${persistedContent.wpId}`;
    }
    return null;
  }, [
    isPersistedLive,
    lastPublishedData?.permalink,
    persistedContent?.permalink,
    persistedContent?.wpId,
    activeConnection?.siteUrl,
  ]);
  const publishUrlPreview = React.useMemo(() => {
    const siteUrl = String(
      activePlatform === "webflow"
        ? (webflowStagingDomain?.url ? `https://${webflowStagingDomain.url}` : "")
        : activeConnection?.siteUrl || ""
    ).replace(/\/+$/, "");
    const slugForPreview = normalizedSlugForPublish || normalizeWordpressBlogEditableSlug(slugCheckResult?.slug || "");
    if (!siteUrl || !slugForPreview) {
      return null;
    }

    return `${siteUrl}/${slugForPreview}`;
  }, [activeConnection?.siteUrl, activePlatform, normalizedSlugForPublish, slugCheckResult?.slug, webflowStagingDomain?.url]);
  const webflowStagingPreviewUrl =
    lastPublishedData?.previewUrl ||
    webflowPersistedContent?.previewUrl ||
    publishUrlPreview ||
    null;
  const webflowLiveUrl =
    lastPublishedData?.permalink ||
    webflowPersistedContent?.externalUrl ||
    webflowPersistedContent?.permalink ||
    null;
  const webflowPreviewUrl = isWebflowLive ? webflowLiveUrl || webflowStagingPreviewUrl : webflowStagingPreviewUrl;
  const hasWebflowStagingPreview = Boolean(
    (webflowStagingPreview?.contentId === String(publishContentId) && webflowStagingPreview?.url) ||
    (hasWebflowMapping &&
      (isWebflowStagingPreviewStatus(webflowPersistedStatus) || isWebflowStagingPreviewStatus(lastPublishedStatus)) &&
      webflowStagingPreviewUrl)
  );
  const webflowStagingViewUrl = hasWebflowStagingPreview
    ? webflowStagingPreview?.url
    : webflowStagingPreviewUrl;
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
    if (isPublishModalOpen) return;
    setIsSlugEdited(false);
    setSlugCheckResult(null);
    setSlugCheckError(null);
    setIsAutoResolvingSlug(false);
    lastAutoSlugCheckKeyRef.current = "";
  }, [isPublishModalOpen]);

  React.useEffect(() => {
    if (!isPublishModalOpen || activePlatform !== "webflow" || !webflowPersistedContent) return;
    setLastPublishedData((prev) => ({
      contentId: webflowPersistedContent.contentId,
      wpId: prev?.wpId || 0,
      permalink: webflowPersistedContent.externalUrl || prev?.permalink || null,
      editUrl: null,
      status: webflowPersistedContent.status || prev?.status || "draft",
      slug: webflowPersistedContent.slug || prev?.slug || null,
      previewUrl: webflowPersistedContent.previewUrl || prev?.previewUrl,
    }));
  }, [activePlatform, isPublishModalOpen, webflowPersistedContent]);

  React.useEffect(() => {
    if (!publishContentId || activePlatform !== "webflow") {
      setWebflowStagingPreview(null);
      return;
    }
    const contentId = String(publishContentId);
    const storedUrl = readWebflowStagingPreviewSession(contentId);
    if (storedUrl) {
      setWebflowStagingPreview({ contentId, url: storedUrl });
      return;
    }
    setWebflowStagingPreview((prev) => (prev?.contentId === contentId ? prev : null));
  }, [activePlatform, publishContentId]);

  const openWebflowPreview = React.useCallback((url?: string | null, options?: { delayMs?: number; subject?: string }) => {
    if (!url) {
      toast.error("Preview URL is not available yet");
      return;
    }
    openWebflowPreviewInNewTab(url, {
      delayMs: options?.delayMs,
      subject: options?.subject ?? "published blog",
    });
  }, []);

  const openEmbeddedPreview = React.useCallback((url: string, title: string, options?: { redirectOnFallback?: boolean }) => {
    if (!url) return;
    setEmbeddedPreviewUrl(url);
    setEmbeddedPreviewTitle(title);
    setIsEmbeddedPreviewLoading(true);
    setShowEmbedFallbackHint(false);
    setRedirectPreviewOnFallback(Boolean(options?.redirectOnFallback));
    setPreviewViewport("desktop");
    setIsEmbeddedPreviewOpen(true);
  }, []);

  React.useEffect(() => {
    if (!isEmbeddedPreviewOpen || !isEmbeddedPreviewLoading) return;

    const timer = window.setTimeout(() => {
      if (redirectPreviewOnFallback && embeddedPreviewUrl) {
        window.location.href = embeddedPreviewUrl;
        return;
      }
      setShowEmbedFallbackHint(true);
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [embeddedPreviewUrl, isEmbeddedPreviewLoading, isEmbeddedPreviewOpen, redirectPreviewOnFallback]);

  const runSlugCheck = React.useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!cmsChannel?.connected || !businessId || !publishContentId) {
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
      setSlugCheckError(singleSegmentSlugError);
      lastAutoSlugCheckKeyRef.current = "";
      return null;
    }

    const checkKey = `${activePlatform || "none"}:${String(publishContentId)}:${publishType}:${normalizedSlugForPublish}`;
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
        businessId: String(businessId),
        contentId: String(publishContentId),
        type: publishType,
        slug: normalizedSlugForPublish,
      });

      const result = response?.data || null;
      setSlugCheckResult(result);
      return result;
    } catch (error: any) {
      const message = error?.message || `Failed to check slug in ${activePlatform === "webflow" ? "Webflow" : "WordPress"}.`;
      setSlugCheckResult(null);
      setSlugCheckError(message);
      return null;
    } finally {
      setIsSlugChecking(false);
    }
  }, [
    activePlatform,
    businessId,
    cmsChannel?.connected,
    hasInvalidBlogSlug,
    normalizedEditableSlug,
    normalizedSlugForPublish,
    publishContentId,
    publishType,
    singleSegmentSlugError,
    slugCheckMutateAsync,
  ]);

  React.useEffect(() => {
    if (!isPublishModalOpen || !cmsChannel?.connected || !publishContentId) {
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
      setSlugCheckError(singleSegmentSlugError);
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
    cmsChannel?.connected,
    isSlugEdited,
    normalizedEditableSlug,
    publishContentId,
    runSlugCheck,
    singleSegmentSlugError,
  ]);

  const buildPublishPayload = React.useCallback(
    (targetStatus: "draft" | "publish") => {
      const excerpt = (metaDescription || inferBlog?.meta_description || "").trim();
      const normalizedSeoTitle = seoTitle.trim();
      return {
        businessId: String(businessId || ""),
        status: targetStatus,
        workflowSource: "infer_ai" as const,
        workflowPayload: data || {},
        contentId: String(publishContentId),
        type: publishType,
        title: String(visiblePostTitle),
        slug: normalizedSlugForPublish || null,
        contentMarkdown: mainContent,
        contentHtml: ContentConverter.markdownToHtml(mainContent),
        excerpt: excerpt || null,
        head: {
          title: String(visiblePostTitle),
          seoTitle: normalizedSeoTitle || undefined,
          metaDescription: excerpt || undefined,
          ogTitle: normalizedSeoTitle || undefined,
          ogDescription: excerpt || undefined,
          twitterTitle: normalizedSeoTitle || undefined,
          twitterDescription: excerpt || undefined,
          metaKeys: {
            _massic_meta_title: normalizedSeoTitle || undefined,
            _massic_meta_description: excerpt || undefined,
          },
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
      metaTitle,
      metaDescription,
      publishContentId,
      seoTitle,
      visiblePostTitle,
      publishType,
      normalizedSlugForPublish,
      businessId,
    ]
  );

  const handleRedirectToChannels = React.useCallback(() => {
    router.push(`/business/${businessId}/web?integrations=1`);
    setIsPublishModalOpen(false);
  }, [businessId, router]);

  const handlePublishDraft = React.useCallback(async () => {
    if (!isActiveWordpress) return;
    if (!hasFinalContent) return;

    let publishResult;
    try {
      publishResult = await cmsPublishMutation.mutateAsync(buildPublishPayload("draft"));
    } catch (error) {
      const publishError = error as CmsPublishError;
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
      wpId: Number(published.wpId || 0),
      permalink: published.permalink || null,
      editUrl: published.editUrl || null,
      status: published.status || "draft",
      slug: published.slug || normalizedSlugForPublish || null,
      previewUrl: published.previewUrl || undefined,
    });
    toast.success("Draft pushed to WordPress");

    const previewUrl = published.previewUrl;
    if (previewUrl) {
      openEmbeddedPreview(previewUrl, "WordPress Draft Preview");
      toast.success("Preview ready");
    }
    void contentStatusQuery.refetch();
  }, [
    buildPublishPayload,
    cmsPublishMutation,
    contentStatusQuery,
    hasFinalContent,
    isActiveWordpress,
    openEmbeddedPreview,
  ]);

  const handlePublishWebflowDraft = React.useCallback(async () => {
    if (!isWebflowReady || !hasFinalContent) return;
    const check = await runSlugCheck({ force: true });
    if (!check || (check.exists && !check.sameMappedContent && check.conflict)) {
      setSlugCheckError("This slug already exists in Webflow. Use the suggested slug or edit manually.");
      toast.error("Slug conflict: choose a unique slug");
      return;
    }
    const payload = buildPublishPayload("draft");
    const baseCss = await getMassicBlogPageCssText();
    payload.contentHtml = buildStyledMassicHtml(String(payload.contentHtml || ""), {
      baseCss,
    });
    const result = await cmsPublishMutation.mutateAsync(payload);
    void contentStatusQuery.refetch();
    setLastPublishedData(prev => ({
      contentId: result.data?.contentId || String(publishContentId),
      wpId: prev?.wpId || 0,
      permalink: result.data?.externalUrl || null,
      editUrl: null,
      status: result.data?.status || "draft",
      slug: result.data?.slug || normalizedSlugForPublish,
      previewUrl: result.data?.previewUrl || result.data?.externalUrl || undefined,
    }));
    toast.success("Webflow draft saved");
    setWebflowStagingPreview(null);
    if (publishContentId) {
      clearWebflowStagingPreviewSession(String(publishContentId));
    }
  }, [
    buildPublishPayload,
    cmsPublishMutation,
    contentStatusQuery,
    hasFinalContent,
    isWebflowReady,
    normalizedSlugForPublish,
    publishContentId,
    runSlugCheck,
  ]);

  const handlePreviewWebflowStaging = React.useCallback(async () => {
    if (!isWebflowReady || !businessId || !publishContentId || !hasFinalContent) return;
    const check = await runSlugCheck({ force: true });
    if (!check || (check.exists && !check.sameMappedContent && check.conflict)) {
      setSlugCheckError("This slug already exists in Webflow. Use the suggested slug or edit manually.");
      toast.error("Slug conflict: choose a unique slug");
      return;
    }
    try {
      const payload = buildPublishPayload("draft");
      const baseCss = await getMassicBlogPageCssText();
      payload.contentHtml = buildStyledMassicHtml(String(payload.contentHtml || ""), {
        baseCss,
      });
      const draftResult = await cmsPublishMutation.mutateAsync(payload);
      setLastPublishedData(prev => ({
        contentId: draftResult.data?.contentId || String(publishContentId),
        wpId: prev?.wpId || 0,
        permalink: draftResult.data?.externalUrl || prev?.permalink || null,
        editUrl: prev?.editUrl || null,
        status: draftResult.data?.status || "draft",
        slug: draftResult.data?.slug || normalizedSlugForPublish,
        previewUrl: draftResult.data?.previewUrl || draftResult.data?.externalUrl || prev?.previewUrl,
      }));
      const result = await webflowStagingPreviewMutation.mutateAsync({
        businessId,
        contentId: String(publishContentId),
      });
      const previewUrl = result.data?.previewUrl;
      setLastPublishedData(prev => ({
        contentId: result.data?.contentId || String(publishContentId),
        wpId: prev?.wpId || 0,
        permalink: previewUrl || prev?.permalink || null,
        editUrl: prev?.editUrl || null,
        status: result.data?.status || "staged_for_staging_preview",
        slug: result.data?.slug || normalizedSlugForPublish,
        previewUrl: previewUrl || prev?.previewUrl,
      }));
      if (previewUrl) {
        const contentId = String(publishContentId);
        setWebflowStagingPreview({ contentId, url: previewUrl });
        persistWebflowStagingPreviewSession(contentId, previewUrl);
        openWebflowPreview(previewUrl, {
          delayMs: WEBFLOW_STAGING_PUBLISH_OPEN_DELAY_MS,
          subject: "staging preview",
        });
      }
      toast.success("Published to staging. Opening preview shortly.");
    } catch {
      // toast handled in mutation
    }
  }, [buildPublishPayload, businessId, cmsPublishMutation, hasFinalContent, isWebflowReady, normalizedSlugForPublish, openWebflowPreview, publishContentId, runSlugCheck, webflowStagingPreviewMutation]);

  const handleRollbackWebflowToDraft = React.useCallback(async () => {
    if (!isWebflowReady || !businessId || !publishContentId || !hasWebflowMapping) return;

    try {
      const result = await webflowRollbackToDraftMutation.mutateAsync({
        businessId,
        contentId: String(publishContentId),
      });
      const data = result.data;
      setWebflowStagingPreview(null);
      clearWebflowStagingPreviewSession(String(publishContentId));
      setLastPublishedData(prev => ({
        contentId: data?.contentId || String(publishContentId),
        wpId: prev?.wpId || 0,
        permalink: null,
        editUrl: prev?.editUrl || null,
        status: "draft",
        slug: data?.slug || webflowPersistedContent?.slug || prev?.slug || null,
        previewUrl: data?.previewUrl || webflowPersistedContent?.previewUrl || prev?.previewUrl,
      }));
      await contentStatusQuery.refetch();
      toast.success(data?.alreadyDraft ? "Webflow item is already a draft" : "Moved back to Webflow draft");
    } catch {
      // toast handled in mutation
    }
  }, [
    businessId,
    contentStatusQuery,
    hasWebflowMapping,
    isWebflowReady,
    publishContentId,
    webflowPersistedContent?.previewUrl,
    webflowPersistedContent?.slug,
    webflowRollbackToDraftMutation,
  ]);

  const handlePublishWebflowLive = React.useCallback(async () => {
    if (!isWebflowReady || !hasFinalContent) return;
    if (!publishToWebflowSubdomain && selectedWebflowCustomDomainIds.length === 0) {
      toast.error("Select at least one Webflow domain");
      return;
    }
    const check = await runSlugCheck({ force: true });
    if (!check || (check.exists && !check.sameMappedContent && check.conflict)) {
      setSlugCheckError("This slug already exists in Webflow. Use the suggested slug or edit manually.");
      toast.error("Slug conflict: choose a unique slug");
      return;
    }
    const payload = {
      ...buildPublishPayload("publish"),
      domainSelection: {
        publishToWebflowSubdomain,
        customDomainIds: selectedWebflowCustomDomainIds,
      },
    };
    const baseCss = await getMassicBlogPageCssText();
    payload.contentHtml = buildStyledMassicHtml(String(payload.contentHtml || ""), {
      baseCss,
    });
    const result = await cmsPublishMutation.mutateAsync(payload);
    void contentStatusQuery.refetch();
    setLastPublishedData(prev => ({
      contentId: result.data?.contentId || String(publishContentId),
      wpId: prev?.wpId || 0,
      permalink: result.data?.externalUrl || null,
      editUrl: null,
      status: result.data?.status || "published",
      slug: result.data?.slug || normalizedSlugForPublish,
      previewUrl: result.data?.previewUrl || undefined,
    }));
    toast.success("Published live to Webflow");
  }, [
    buildPublishPayload,
    cmsPublishMutation,
    contentStatusQuery,
    hasFinalContent,
    isWebflowReady,
    normalizedSlugForPublish,
    publishToWebflowSubdomain,
    publishContentId,
    runSlugCheck,
    selectedWebflowCustomDomainIds,
  ]);

  const handlePublishLive = React.useCallback(async () => {
    if (!isActiveWordpress) return;
    if (!hasFinalContent) return;
    if (!isPersistedDraftLike && !lastPublishedData?.wpId) {
      toast.error("Publish draft first to generate a preview");
      return;
    }

    let publishResult;
    try {
      publishResult = await cmsPublishMutation.mutateAsync(buildPublishPayload("publish"));
    } catch (error) {
      const publishError = error as CmsPublishError;
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
      wpId: Number(published.wpId || 0),
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
    cmsPublishMutation,
    contentStatusQuery,
    hasFinalContent,
    isActiveWordpress,
    isPersistedDraftLike,
    lastPublishedData?.wpId,
  ]);

  const handleRepublish = React.useCallback(async () => {
    if (!isActiveWordpress) return;
    if (!hasFinalContent) return;

    let publishResult;
    try {
      publishResult = await cmsPublishMutation.mutateAsync(buildPublishPayload("publish"));
    } catch (error) {
      const publishError = error as CmsPublishError;
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
      wpId: Number(published.wpId || 0),
      permalink: published.permalink || null,
      editUrl: published.editUrl || null,
      status: published.status || "publish",
      slug: published.slug || normalizedSlugForPublish || null,
      previewUrl: prev?.previewUrl,
    }));

    toast.success("Republished to WordPress");
    void contentStatusQuery.refetch();
  }, [
    buildPublishPayload,
    cmsPublishMutation,
    contentStatusQuery,
    hasFinalContent,
    isActiveWordpress,
    normalizedSlugForPublish,
    publishUrlPreview,
  ]);

  const handleUpdateDraft = React.useCallback(async () => {
    if (!isActiveWordpress) return;
    if (!hasFinalContent) return;

    let publishResult;
    try {
      publishResult = await cmsPublishMutation.mutateAsync(buildPublishPayload("draft"));
    } catch (error) {
      const publishError = error as CmsPublishError;
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
      wpId: Number(published.wpId || 0),
      permalink: published.permalink || null,
      editUrl: published.editUrl || null,
      status: published.status || "draft",
      slug: published.slug || normalizedSlugForPublish || null,
      previewUrl: prev?.previewUrl,
    }));

    toast.success("Draft updated on WordPress");
    void contentStatusQuery.refetch();
  }, [
    buildPublishPayload,
    cmsPublishMutation,
    contentStatusQuery,
    hasFinalContent,
    isActiveWordpress,
    normalizedSlugForPublish,
    publishUrlPreview,
  ]);

  const handleOpenPreview = React.useCallback(async () => {
    const wpIdToUse = persistedContent?.wpId || lastPublishedData?.wpId;
    if (!activeConnection?.connectionId || !wpIdToUse) {
      toast.error("Draft not found for preview");
      return;
    }

    const previewResult = await wpPreviewMutation.mutateAsync({
      connectionId: activeConnection.connectionId,
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
    activeConnection?.connectionId,
    openEmbeddedPreview,
    wpPreviewMutation,
  ]);

  const handleChangeWordpressStatus = React.useCallback(async (targetStatus: "draft" | "trash") => {
    if (!isActiveWordpress || !activeConnection?.connectionId) return;
    if (!publishContentId) return;

    const response = await wpUnpublishMutation.mutateAsync({
      connectionId: String(activeConnection.connectionId),
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
    activeConnection?.connectionId,
    contentStatusQuery,
    isActiveWordpress,
    publishContentId,
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

    const baseCss = await getMassicBlogPageCssText();
    const styledHtml = buildStyledMassicHtml(htmlContent, {
      baseCss,
    });

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

  const handleCopyMetaTitle = async () => {
    const ok = await copyToClipboard(metaTitle || "");
    if (ok) toast.success("Copied");
    else toast.error("Copy failed");
  };

  const handleCopyBlogTitle = async () => {
    const ok = await copyToClipboard(blogTitle || "");
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
        if (blogMetaSaveTimerRef.current) {
          window.clearTimeout(blogMetaSaveTimerRef.current);
          blogMetaSaveTimerRef.current = null;
        }
        await updateBlogContent(businessId, pageId, {
          html: ContentConverter.markdownToHtml(next),
          title: blogTitle,
          meta_title: metaTitle,
          meta_description: metaDescription,
        });
      } else {
        await updatePageContent(businessId, pageId, next);
      }
      lastSavedMainRef.current = next;
      if (type === "blog") {
        lastSavedBlogTitleRef.current = canonicalize(blogTitle);
        lastSavedMetaTitleRef.current = canonicalize(metaTitle);
        lastSavedMetaDescriptionRef.current = canonicalize(metaDescription);
      }
      setMainContent(next);
      toast.success("Changes Saved");
    } catch {
      toast.error("Failed to save changes to server");
    }
  };

  const flushBlogMetaToApi = React.useCallback(async () => {
    if (isInitialLoad) return;
    if (type !== "blog") return;

    const nextMetaTitle = canonicalize(metaTitle);
    const nextMeta = canonicalize(metaDescription);
    const nextBlogTitle = canonicalize(blogTitle);
    const metaTitleUnchanged = nextMetaTitle === canonicalize(lastSavedMetaTitleRef.current);
    const descriptionUnchanged = nextMeta === canonicalize(lastSavedMetaDescriptionRef.current);
    const blogTitleUnchanged = nextBlogTitle === canonicalize(lastSavedBlogTitleRef.current);
    if (metaTitleUnchanged && descriptionUnchanged && blogTitleUnchanged) return;

    try {
      await updateBlogContent(businessId, pageId, {
        html: ContentConverter.markdownToHtml(mainContent),
        title: nextBlogTitle,
        meta_title: nextMetaTitle,
        meta_description: nextMeta,
      });
      lastSavedBlogTitleRef.current = nextBlogTitle;
      lastSavedMetaTitleRef.current = nextMetaTitle;
      lastSavedMetaDescriptionRef.current = nextMeta;
      toast.success("Changes Saved");
    } catch {
      toast.error("Failed to save changes to server");
    }
  }, [
    blogTitle,
    businessId,
    canonicalize,
    isInitialLoad,
    mainContent,
    metaDescription,
    metaTitle,
    pageId,
    type,
    updateBlogContent,
  ]);

  const scheduleBlogMetaSave = React.useCallback(() => {
    if (blogMetaSaveTimerRef.current) {
      window.clearTimeout(blogMetaSaveTimerRef.current);
    }
    blogMetaSaveTimerRef.current = window.setTimeout(() => {
      blogMetaSaveTimerRef.current = null;
      void flushBlogMetaToApi();
    }, BLOG_META_DEBOUNCE_MS);
  }, [flushBlogMetaToApi]);

  const handleBlogMetaBlur = React.useCallback(() => {
    if (blogMetaSaveTimerRef.current) {
      window.clearTimeout(blogMetaSaveTimerRef.current);
      blogMetaSaveTimerRef.current = null;
    }
    void flushBlogMetaToApi();
  }, [flushBlogMetaToApi]);

  React.useEffect(() => {
    return () => {
      if (blogMetaSaveTimerRef.current) {
        window.clearTimeout(blogMetaSaveTimerRef.current);
        blogMetaSaveTimerRef.current = null;
      }
    };
  }, []);

  const confirmAndRunPublishAction = React.useCallback(async () => {
    if (!guardPublish()) return;
    const action = confirmPublishAction;
    setConfirmPublishAction(null);
    if (!action) return;

    const isWebflowRollbackAction = action === "webflow-rollback-draft";

    if (!isWebflowRollbackAction) {
      if (!normalizedEditableSlug) {
        setSlugCheckError("Slug is required.");
        toast.error("Slug is required before publishing");
        return;
      }

      if (hasInvalidBlogSlug || !normalizedSlugForPublish) {
        setSlugCheckError(singleSegmentSlugError);
        toast.error(singleSegmentSlugError);
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
    }

    if (action === "draft") {
      await handlePublishDraft();
      return;
    }

    if (action === "webflow-draft") {
      await handlePublishWebflowDraft();
      return;
    }

    if (action === "webflow-live") {
      await handlePublishWebflowLive();
      return;
    }

    if (action === "webflow-staging-preview") {
      await handlePreviewWebflowStaging();
      return;
    }

    if (action === "webflow-rollback-draft") {
      await handleRollbackWebflowToDraft();
      return;
    }

    if (action === "republish") {
      await handleRepublish();
      return;
    }

    if (action === "update-draft") {
      await handleUpdateDraft();
      return;
    }

    await handlePublishLive();
  }, [
    confirmPublishAction,
    guardPublish,
    handlePreviewWebflowStaging,
    handlePublishDraft,
    handlePublishLive,
    handlePublishWebflowDraft,
    handlePublishWebflowLive,
    handleRollbackWebflowToDraft,
    handleRepublish,
    handleUpdateDraft,
    hasInvalidBlogSlug,
    normalizedEditableSlug,
    normalizedSlugForPublish,
    runSlugCheck,
    singleSegmentSlugError,
  ]);

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
            {!isProcessing && (isHtmlContent ? (
              <>
                <Button variant="outline" className="gap-2" onClick={handleCopyHtml}>
                  <Copy className="h-4 w-4" />
                  Copy HTML
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleCopyText}>
                  <Copy className="h-4 w-4" />
                  Copy Text
                </Button>
              </>
            ) : (
              <Button variant="outline" className="gap-2" onClick={handleCopyMarkdown}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            ))}
            <Button
              className="gap-2"
              type="button"
              onClick={() => {
                if (guardPublish()) setIsPublishModalOpen(true);
              }}
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
              We're generating your content. This may take 1-3 minutes. Please wait
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
            {type === "blog" ? (
              <Card className="border-border/50 px-2.5 py-1.5 shadow-none">
                <div className="flex items-center gap-2">
                  <Typography className="w-10 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Title
                  </Typography>
                  <div className="min-w-0 flex-1 rounded-md bg-muted/30 px-1.5">
                    <Input
                      value={blogTitle}
                      onChange={(e) => {
                        setBlogTitle(e.target.value);
                        scheduleBlogMetaSave();
                      }}
                      onBlur={handleBlogMetaBlur}
                      placeholder="Write your post title here..."
                      className="h-7 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground"
                    onClick={() => void handleCopyBlogTitle()}
                    disabled={!blogTitle}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ) : null}
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
                    <Typography variant="h6">Meta Title</Typography>
                    <Button variant="ghost" size="icon" onClick={handleCopyMetaTitle} type="button">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={metaTitle}
                    onChange={(e) => {
                      setMetaTitle(e.target.value);
                      scheduleBlogMetaSave();
                    }}
                    onBlur={handleBlogMetaBlur}
                    placeholder="Write your meta title here..."
                  />
                </Card>

                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Typography variant="h6">Meta Description</Typography>
                    <Button variant="ghost" size="icon" onClick={handleCopyMeta} type="button">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={metaDescription}
                    onChange={(e) => {
                      setMetaDescription(e.target.value);
                      scheduleBlogMetaSave();
                    }}
                    onBlur={handleBlogMetaBlur}
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
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publish to CMS</DialogTitle>
            <DialogDescription>
              Choose what to do with this {typeLabel}.
            </DialogDescription>
          </DialogHeader>

          {!cmsChannel?.connected ? (
            <div className="rounded-lg bg-background p-4 space-y-3">
              <Typography className="text-sm">No publishing channel connected.</Typography>
              <Button onClick={handleRedirectToChannels}>Connect a channel</Button>
            </div>
          ) : isActiveWordpress ? (
            <div className="rounded-lg bg-muted/20 py-4 min-w-0 overflow-hidden space-y-3">
              <Tabs value={publishTab} onValueChange={(v) => setPublishTab(v as "details" | "images")}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Typography className="text-sm font-medium truncate min-w-0">{activeConnection?.siteUrl}</Typography>
                    <Badge
                      className={cn("shrink-0 font-medium", isPersistedLive && "border-transparent bg-green-600 text-white")}
                      variant={isPersistedLive ? "default" : isPersistedDraftLike ? "secondary" : isPersistedTrashed ? "destructive" : "outline"}
                    >
                      {publishStateLabel}
                    </Badge>

                    <Typography className="text-sm text-muted-foreground">{publishStateHint}</Typography>
                    <div>
                      {requiresWordpressPageTemplate && (isWordpressPageTemplateChecking || wordpressPageTemplateBlockMessage) ? (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          {isWordpressPageTemplateChecking ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Checking for Massic Template...</span>
                            </div>
                          ) : (
                            <div className="wrap-break-word">{wordpressPageTemplateBlockMessage}</div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <TabsList className="h-7 shrink-0 rounded-sm">
                    <TabsTrigger value="details" className="text-xs px-2.5 h-6 rounded-sm">Details</TabsTrigger>
                    <TabsTrigger value="images" className="text-xs px-2.5 h-6 rounded-sm">Images</TabsTrigger>
                  </TabsList>
                </div>

                {!isPersistedLive ? (
                  <p className="text-xs text-muted-foreground">{publishStateHint}</p>
                ) : null}
                <TabsContent value="details" className="space-y-4 pt-1">
                  <div className="space-y-3">
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground">Post title</span>
                      <p className="text-sm line-clamp-2">{visiblePostTitle}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground">SEO title</span>
                      <p className="text-sm line-clamp-2">{seoTitle}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Publish slug</Label>
                    <Input
                      value={editableSlug}
                      onChange={(event) => {
                        setEditableSlug(event.target.value);
                        setIsSlugEdited(true);
                      }}
                      placeholder={publishType === "page" ? "enter-page-slug" : "enter-blog-slug"}
                      disabled={isSlugInputBusy}
                    />
                    {publishUrlPreview ? (
                      <p className="text-xs text-muted-foreground font-mono break-all">{publishUrlPreview}</p>
                    ) : null}
                  </div>

                  {isSlugChecking ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking slug availability…
                    </div>
                  ) : slugCheckError ? (
                    <p className="text-xs text-destructive">{slugCheckError}</p>
                  ) : hasSlugConflict ? (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-2 min-w-0">
                      <p className="wrap-break-word">
                        {slugConflictReason === "parent_type_conflict"
                          ? "This nested page path is blocked because a parent segment already belongs to non-page content. Change the parent path."
                          : "This slug already exists in WordPress. Publishing is blocked until you use a unique slug."}
                      </p>
                      {slugCheckResult?.suggestedSlug ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-auto w-full justify-start whitespace-normal break-all text-left"
                          onClick={autoResolveSlug}
                          disabled={isSlugActionBusy}
                        >
                          {isAutoResolvingSlug ? "Resolving..." : `Use ${wordpressSlugToDisplay(slugCheckResult?.suggestedSlug, "/next-available")}`}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                </TabsContent>
                <TabsContent value="images" className="space-y-3 pt-1">
                  <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-background p-6 text-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-muted-foreground">No image fields</p>
                      <p className="text-xs text-muted-foreground">Image fields are not configured for blog posts.</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div >
          ) : null
}

{
  isWebflowReady ? (
    <div className="rounded-lg bg-muted/20 py-4 min-w-0 overflow-hidden space-y-3">
      <Tabs value={publishTab} onValueChange={(v) => setPublishTab(v as "details" | "images")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Typography className="text-sm font-medium truncate min-w-0">
              Webflow: {activeTarget?.name || "Configured collection"}
            </Typography>
            <Badge
              className={cn("shrink-0 font-medium", webflowPublishState === "live" && "border-transparent bg-green-600 text-white")}
              variant={webflowPublishState === "live" ? "default" : webflowPublishState === "draft" ? "secondary" : "outline"}
            >
              {webflowPublishState === "live" ? "Live" : webflowPublishState === "draft" ? "Draft" : "Not Published"}
            </Badge>
          </div>
          <TabsList className="h-7 shrink-0 rounded-sm">
            <TabsTrigger value="details" className="text-xs px-2.5 h-6 rounded-sm">Details</TabsTrigger>
            <TabsTrigger value="images" className="text-xs px-2.5 h-6 rounded-sm">Images</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="details" className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Publish slug</Label>
            <Input
              value={editableSlug}
              onChange={(event) => {
                setEditableSlug(event.target.value);
                setIsSlugEdited(true);
              }}
              placeholder={publishType === "page" ? "enter-page-slug" : "enter-blog-slug"}
              disabled={isSlugInputBusy}
            />
            {(slugCheckResult?.publishUrl || publishUrlPreview || webflowStagingPreviewUrl) ? (
              <p className="text-xs text-muted-foreground font-mono break-all">
                {slugCheckResult?.publishUrl || publishUrlPreview || webflowStagingPreviewUrl}
              </p>
            ) : null}
          </div>

          {isSlugChecking ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking slug availability…
            </div>
          ) : slugCheckError ? (
            <p className="text-xs text-destructive">{slugCheckError}</p>
          ) : hasSlugConflict ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-2 min-w-0">
              <p className="wrap-break-word">This slug already exists in Webflow. Publishing is blocked until you use a unique slug.</p>
              {slugCheckResult?.suggestedSlug ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-auto w-full justify-start whitespace-normal break-all text-left"
                  onClick={autoResolveSlug}
                  disabled={isSlugActionBusy}
                >
                  {isAutoResolvingSlug ? "Resolving..." : `Use ${wordpressSlugToDisplay(slugCheckResult?.suggestedSlug, "/next-available")}`}
                </Button>
              ) : null}
            </div>
          ) : null}

          {(webflowStagingPreviewUrl || webflowLiveUrl) ? (
            <div className="space-y-1.5">
              {webflowStagingPreviewUrl ? (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs text-muted-foreground shrink-0">Staging URL</span>
                  <span className="text-xs font-mono text-right break-all min-w-0">{webflowStagingPreviewUrl}</span>
                </div>
              ) : null}
              {webflowLiveUrl ? (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs text-muted-foreground shrink-0">Live URL</span>
                  <span className="text-xs font-mono text-right break-all min-w-0">{webflowLiveUrl}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2 border-t border-border/60 pt-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Publish to domains</span>
            <div className="space-y-2">
              {webflowStagingDomain ? (
                <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={publishToWebflowSubdomain}
                    onCheckedChange={(checked) => setPublishToWebflowSubdomain(Boolean(checked))}
                    disabled={isPublishBusy}
                  />
                  <span className="break-all">{webflowStagingDomain.label}</span>
                </label>
              ) : null}
              {webflowCustomDomains.map((domain) => (
                <label key={domain.id} className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedWebflowCustomDomainIds.includes(domain.id)}
                    onCheckedChange={(checked) => {
                      setSelectedWebflowCustomDomainIds((prev) =>
                        checked
                          ? Array.from(new Set([...prev, domain.id]))
                          : prev.filter((id) => id !== domain.id)
                      );
                    }}
                    disabled={isPublishBusy}
                  />
                  <span className="break-all">{domain.label}</span>
                </label>
              ))}
              {!webflowDomains.length ? (
                <p className="text-xs text-muted-foreground">No publish domains returned by Webflow.</p>
              ) : null}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="images" className="space-y-3 pt-1">
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-background p-6 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-muted-foreground">No image fields</p>
              <p className="text-xs text-muted-foreground">Image fields are not configured for blog posts.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  ) : isActiveWebflow ? (
    <div className="rounded-lg bg-background p-4 space-y-3">
      <Typography className="text-sm">Webflow is connected but no collection mapping is saved.</Typography>
      <Button onClick={handleRedirectToChannels}>Configure Webflow</Button>
    </div>
  ) : null
}

<DialogFooter className="gap-2 sm:gap-2">
  {isActiveWordpress ? (
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
            variant="outline"
            onClick={() => setConfirmPublishAction("republish")}
            disabled={!hasFinalContent || !normalizedSlugForPublish || hasSlugConflict || isSlugChecking || isWordpressPagePublishBlocked || cmsPublishMutation.isPending}
          >
            {cmsPublishMutation.isPending ? "Republishing..." : "Republish"}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => {
                  if (liveUrl) {
                    openEmbeddedPreview(liveUrl, publishType === "page" ? "Published WordPress Page" : "Published WordPress Blog");
                  }
                }}
                disabled={!liveUrl}
                aria-label="View live WordPress blog"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View Live</TooltipContent>
          </Tooltip>
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
            onClick={() => setConfirmPublishAction("update-draft")}
            disabled={!hasFinalContent || !normalizedSlugForPublish || hasSlugConflict || isSlugChecking || isWordpressPagePublishBlocked || cmsPublishMutation.isPending}
          >
            {cmsPublishMutation.isPending ? "Updating..." : "Update Draft"}
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
            disabled={!hasFinalContent || !normalizedSlugForPublish || hasSlugConflict || isSlugChecking || isWordpressPagePublishBlocked || cmsPublishMutation.isPending}
          >
            {cmsPublishMutation.isPending ? "Publishing..." : "Publish Live"}
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
            isWordpressPagePublishBlocked ||
            contentStatusQuery.isLoading ||
            cmsPublishMutation.isPending ||
            wpPreviewMutation.isPending
          }
        >
          {cmsPublishMutation.isPending || wpPreviewMutation.isPending ? "Publishing..." : "Publish Draft"}
        </Button>
      )}
    </>
  ) : null}
  {isWebflowReady ? (
    <>
      {webflowPublishState === "not_published" ? (
        <Button
          onClick={() => setConfirmPublishAction("webflow-draft")}
          disabled={
            !hasFinalContent ||
            !normalizedSlugForPublish ||
            hasSlugConflict ||
            isSlugChecking ||
            cmsPublishMutation.isPending
          }
        >
          {cmsPublishMutation.isPending ? "Saving..." : "Publish Draft"}
        </Button>
      ) : null}
      {webflowPublishState === "draft" ? (
        <>
          {hasWebflowStagingPreview ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() =>
                      openWebflowPreview(webflowStagingViewUrl, {
                        delayMs: WEBFLOW_STAGING_VIEW_OPEN_DELAY_MS,
                        subject: "staging page",
                      })
                    }
                    disabled={!webflowStagingViewUrl}
                    aria-label="View on staging"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View on staging</TooltipContent>
              </Tooltip>
              <Button
                variant="outline"
                onClick={() => setConfirmPublishAction("webflow-staging-preview")}
                disabled={!hasWebflowMapping || webflowStagingPreviewMutation.isPending || isPublishBusy}
              >
                {webflowStagingPreviewMutation.isPending ? "Republishing..." : "Republish"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmPublishAction("webflow-rollback-draft")}
                disabled={!hasWebflowMapping || webflowRollbackToDraftMutation.isPending || isPublishBusy}
              >
                {webflowRollbackToDraftMutation.isPending ? "Moving..." : "Move back to draft"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setConfirmPublishAction("webflow-staging-preview")}
                disabled={!hasWebflowMapping || webflowStagingPreviewMutation.isPending || isPublishBusy}
              >
                {webflowStagingPreviewMutation.isPending ? "Publishing..." : "Publish to staging"}
              </Button>
            </>
          )}
          <Button
            onClick={() => setConfirmPublishAction("webflow-live")}
            disabled={
              !hasFinalContent ||
              !normalizedSlugForPublish ||
              hasSlugConflict ||
              isSlugChecking ||
              (!publishToWebflowSubdomain && selectedWebflowCustomDomainIds.length === 0) ||
              cmsPublishMutation.isPending
            }
          >
            {cmsPublishMutation.isPending ? "Publishing..." : "Publish Live"}
          </Button>
        </>
      ) : null}
      {webflowPublishState === "live" ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() =>
                  openWebflowPreview(webflowPreviewUrl, {
                    delayMs: WEBFLOW_LIVE_VIEW_OPEN_DELAY_MS,
                    subject: "live page",
                  })
                }
                disabled={!webflowPreviewUrl}
                aria-label="View live page"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View live page</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            onClick={() => setConfirmPublishAction("webflow-rollback-draft")}
            disabled={!hasWebflowMapping || webflowRollbackToDraftMutation.isPending || isPublishBusy}
          >
            {webflowRollbackToDraftMutation.isPending ? "Moving..." : "Move back to draft"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirmPublishAction("webflow-draft")}
            disabled={!hasFinalContent || !normalizedSlugForPublish || cmsPublishMutation.isPending}
          >
            {cmsPublishMutation.isPending ? "Saving..." : "Update Draft"}
          </Button>
          <Button
            onClick={() => setConfirmPublishAction("webflow-live")}
            disabled={
              !hasFinalContent ||
              !normalizedSlugForPublish ||
              hasSlugConflict ||
              isSlugChecking ||
              (!publishToWebflowSubdomain && selectedWebflowCustomDomainIds.length === 0) ||
              cmsPublishMutation.isPending
            }
          >
            {cmsPublishMutation.isPending ? "Publishing..." : "Republish Live"}
          </Button>
        </>
      ) : null}
    </>
  ) : null}
</DialogFooter>
        </DialogContent >
      </Dialog >

      <AlertDialog open={confirmPublishAction !== null} onOpenChange={(open) => !open && setConfirmPublishAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmPublishAction === "webflow-draft"
                ? webflowPublishState === "live"
                  ? "Update Webflow Draft?"
                  : "Publish Webflow Draft?"
                : confirmPublishAction === "webflow-live"
                  ? webflowPublishState === "live"
                    ? "Republish Live to Webflow?"
                    : "Publish Live to Webflow?"
                  : confirmPublishAction === "webflow-staging-preview"
                    ? hasWebflowStagingPreview
                      ? "Republish to staging?"
                      : "Publish to staging?"
                    : confirmPublishAction === "webflow-rollback-draft"
                      ? "Move Webflow item back to draft?"
                    : confirmPublishAction === "live"
                      ? "Publish Live to WordPress?"
                      : confirmPublishAction === "republish"
                        ? "Republish to WordPress?"
                        : confirmPublishAction === "update-draft"
                          ? "Update Draft on WordPress?"
                          : "Publish Draft to WordPress?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {confirmPublishAction === "webflow-draft" ||
                  confirmPublishAction === "webflow-live" ||
                  confirmPublishAction === "webflow-staging-preview" ||
                  confirmPublishAction === "webflow-rollback-draft" ? (
                    <WebflowPublishConfirmDescription
                      action={confirmPublishAction as WebflowPublishConfirmAction}
                      isLiveItem={webflowPublishState === "live"}
                      isStagingRefresh={
                        confirmPublishAction === "webflow-staging-preview" && hasWebflowStagingPreview
                      }
                    />
                  ) : confirmPublishAction === "live" ? (
                    `This will update the live WordPress content at ${publishUrlPreview || "the selected route"}.`
                  ) : confirmPublishAction === "republish" ? (
                    `This will push your latest content and images to the live post at ${publishUrlPreview || "the selected route"}.`
                  ) : confirmPublishAction === "update-draft" ? (
                    `This will update the existing WordPress draft at ${publishUrlPreview || "the selected route"} with your latest content and images.`
                  ) : (
                    `This will create or update the WordPress draft at ${publishUrlPreview || "the selected route"}.`
                  )}
                </p>
                <WebflowPublishConfirmHint
                  action={
                    confirmPublishAction === "webflow-draft" ||
                    confirmPublishAction === "webflow-live" ||
                    confirmPublishAction === "webflow-staging-preview" ||
                    confirmPublishAction === "webflow-rollback-draft"
                      ? (confirmPublishAction as WebflowPublishConfirmAction)
                      : null
                  }
                  collectionName={activeTarget?.name}
                  stagingSiteHost={webflowStagingDomain?.url || null}
                  isLiveItem={webflowPublishState === "live"}
                  isStagingRefresh={
                    confirmPublishAction === "webflow-staging-preview" && hasWebflowStagingPreview
                  }
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={confirmAndRunPublishAction} disabled={isPublishBusy}>
                {confirmPublishAction === "live" || confirmPublishAction === "webflow-live"
                  ? "Confirm Publish Live"
                  : confirmPublishAction === "republish"
                    ? "Confirm Republish"
                    : confirmPublishAction === "update-draft"
                      ? "Confirm Update Draft"
                      : confirmPublishAction === "webflow-rollback-draft"
                        ? "Confirm Move back to draft"
                      : confirmPublishAction === "webflow-staging-preview"
                        ? hasWebflowStagingPreview
                          ? "Confirm Republish"
                          : "Confirm Publish to Staging"
                        : "Confirm Publish Draft"}
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
    </div >
  );
}
