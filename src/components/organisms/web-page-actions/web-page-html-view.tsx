"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { resolvePageContent } from "@/utils/page-content-resolver";
import { api } from "@/hooks/use-api";
import { ensureMassicContentWrapper } from "@/utils/page-content-format";
import {
  applyTextEditsToHtml,
  buildEditableHtmlModel,
  canonicalizeHtml,
  extractPlainTextFromHtml,
  sanitizePageHtml,
  type EditableTextNodeRef,
} from "@/utils/page-html-editor";
import { buildMassicCssVariableOverrides } from "@/utils/massic-style-overrides";
import { buildStyledMassicHtml, getMassicCssText } from "@/utils/massic-html-copy";
import { useWebActionContentQuery } from "@/hooks/use-web-page-actions";
import { useWordpressConnection, useWordpressStyleProfile } from "@/hooks/use-wordpress-connector";
import {
  type WordpressSlugConflictInfo,
  WordpressPublishError,
  useWordpressContentStatus,
  useWordpressPreviewLink,
  useWordpressPublish,
  useWordpressSlugCheck,
  useWordpressUnpublish,
} from "@/hooks/use-wordpress-publishing";

type SaveReason = "debounce" | "blur" | "unmount";

function isEditableSpan(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && Boolean(target.dataset.massicTextId);
}

function updateEditFromElement(edits: Record<string, string>, element: HTMLElement) {
  const id = element.dataset.massicTextId;
  if (!id) return edits;
  return {
    ...edits,
    [id]: element.textContent ?? "",
  };
}

function insertPlainTextAtCursor(text: string) {
  if (!text) return;

  if (typeof document !== "undefined" && document.queryCommandSupported?.("insertText")) {
    document.execCommand("insertText", false, text);
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);
}

function toSlug(value: string) {
  const normalized = (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\\/g, "/");

  const segments = normalized
    .split("/")
    .map((segment) =>
      segment
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .filter(Boolean);

  return segments.join("/");
}

function slugToDisplay(value: string | null | undefined, fallback: string) {
  const normalized = (value || "").trim();
  if (!normalized) return fallback;
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function WebPageHtmlView({ businessId, pageId }: { businessId: string; pageId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";

  const [pollingDisabled, setPollingDisabled] = React.useState(false);
  const [previewHtml, setPreviewHtml] = React.useState("");
  const [textNodeIndex, setTextNodeIndex] = React.useState<EditableTextNodeRef[]>([]);
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

  const contentQuery = useWebActionContentQuery({
    type: "page",
    businessId,
    pageId,
    enabled: !!businessId && !!pageId,
    pollingDisabled,
    pollingIntervalMs: 6000,
  });

  const data = contentQuery.data;
  const wpConnectionQuery = useWordpressConnection(businessId || null);
  const wpConnection = wpConnectionQuery.data?.connection || null;
  const isWpConnected = Boolean(wpConnectionQuery.data?.connected && wpConnection);
  const wpStyleProfileQuery = useWordpressStyleProfile(wpConnection?.connectionId || null);
  const wpPublishMutation = useWordpressPublish();
  const { mutateAsync: slugCheckMutateAsync } = useWordpressSlugCheck();
  const wpPreviewMutation = useWordpressPreviewLink();
  const wpUnpublishMutation = useWordpressUnpublish();

  const sourceHtmlRef = React.useRef("");
  const textNodeIndexRef = React.useRef<EditableTextNodeRef[]>([]);
  const editsRef = React.useRef<Record<string, string>>({});
  const saveTimerRef = React.useRef<number | null>(null);
  const isSavingRef = React.useRef(false);
  const queuedSaveRef = React.useRef(false);
  const previewContainerRef = React.useRef<HTMLDivElement | null>(null);
  const isEditorFocusedRef = React.useRef(false);
  const isInitialLoadRef = React.useRef(true);
  const lastSavedHtmlRef = React.useRef("");
  const lastStatusRef = React.useRef<string>("");
  const hasLocalEditsRef = React.useRef(false);
  const isEditingSessionRef = React.useRef(false);
  const lastCommittedHtmlRef = React.useRef("");
  const pendingBackgroundRefetchRef = React.useRef(false);
  const lastAutoSlugCheckKeyRef = React.useRef("");

  const extractionStatus = (wpStyleProfileQuery.data?.latestExtraction?.status || "").toLowerCase();
  const shouldApplyWpStyle = isWpConnected && !!wpStyleProfileQuery.data?.profile && (extractionStatus === "success" || extractionStatus === "partial");
  const cssVarOverrides = React.useMemo(
    () =>
      shouldApplyWpStyle
        ? buildMassicCssVariableOverrides({ normalizedProfile: wpStyleProfileQuery.data?.profile })
        : {},
    [shouldApplyWpStyle, wpStyleProfileQuery.data?.profile]
  );

  const previewStyleVars = React.useMemo(() => {
    const style: React.CSSProperties = {};
    for (const [key, value] of Object.entries(cssVarOverrides)) {
      (style as Record<string, string>)[key] = value;
    }
    return style;
  }, [cssVarOverrides]);
  const previewMassicVarCss = React.useMemo(() => {
    const entries = Object.entries(cssVarOverrides);
    if (!entries.length) return "";
    const declarations = entries.map(([key, value]) => `${key}: ${value};`).join(" ");
    return `.massic-html-preview .massic-content { ${declarations} }`;
  }, [cssVarOverrides]);

  const status = (data?.status || "").toString().toLowerCase();
  const isProcessing = status === "pending" || status === "processing";
  const hasFinalContent = canonicalizeHtml(sourceHtmlRef.current).length > 0;

  const inferPage = data?.output_data?.page || {};
  const inferBlog = inferPage?.blog || {};
  const publishTitle = inferPage?.meta_title || inferBlog?.meta_title || keyword || "Untitled";
  const publishContentId = inferPage?.page_id || pageId;
  const inferSlug = React.useMemo(
    () => (typeof inferPage?.slug === "string" ? String(inferPage.slug).trim() : ""),
    [inferPage?.slug]
  );
  const generatedSlugFallback = React.useMemo(() => toSlug(publishTitle || keyword || ""), [keyword, publishTitle]);
  const generatedSlug = React.useMemo(() => {
    if (inferSlug) return inferSlug;
    return generatedSlugFallback;
  }, [generatedSlugFallback, inferSlug]);
  const normalizedEditableSlug = React.useMemo(() => toSlug(editableSlug), [editableSlug]);
  const contentStatusQuery = useWordpressContentStatus(
    wpConnection?.connectionId || null,
    publishContentId ? String(publishContentId) : null
  );
  const persistedContent = contentStatusQuery.data?.content || null;
  const persistedStatus = (persistedContent?.status || "").toLowerCase();
  const isPersistedTrashed = persistedStatus === "trash";
  const persistedSlug = React.useMemo(() => toSlug(persistedContent?.slug || ""), [persistedContent?.slug]);
  const effectiveModalSlug = React.useMemo(() => {
    if (!isPersistedTrashed && persistedSlug) return persistedSlug;
    if (!isPersistedTrashed && lastPublishedData?.slug) return toSlug(lastPublishedData.slug);
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
        : "No WordPress page exists yet.";

  const liveUrl = React.useMemo(() => {
    if (persistedContent?.permalink) return persistedContent.permalink;
    if (lastPublishedData?.permalink) return lastPublishedData.permalink;
    if (isPersistedLive && persistedContent?.wpId && wpConnection?.siteUrl) {
      return `${String(wpConnection.siteUrl).replace(/\/+$/, "")}/?page_id=${persistedContent.wpId}`;
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
    const slugForPreview = normalizedEditableSlug || toSlug(slugCheckResult?.slug || "");
    if (!siteUrl || !slugForPreview) {
      return null;
    }

    return `${siteUrl}/${slugForPreview}`;
  }, [normalizedEditableSlug, slugCheckResult?.slug, wpConnection?.siteUrl]);

  React.useEffect(() => {
    if (!isPublishModalOpen) return;
    if (isSlugEdited) return;
    setEditableSlug(effectiveModalSlug);
  }, [effectiveModalSlug, isPublishModalOpen, isSlugEdited]);

  React.useEffect(() => {
    if (isPublishModalOpen) {
      // Freeze background content polling while publish modal is active.
      setPollingDisabled(true);
      return;
    }

    if (!isEditorFocusedRef.current && !isEditingSessionRef.current) {
      setPollingDisabled(false);
    }
  }, [isPublishModalOpen]);

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

  const composeCurrentHtml = React.useCallback(() => {
    const merged = applyTextEditsToHtml(sourceHtmlRef.current, textNodeIndexRef.current, editsRef.current);
    return ensureMassicContentWrapper(sanitizePageHtml(merged));
  }, []);

  const updatePageContentRequest = React.useCallback(
    async (content: string) => {
      const endpoint = `/client/update-page-builder-content?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`;
      await api.post(
        endpoint,
        "python",
        { content },
        {
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
        }
      );
    },
    [businessId, pageId]
  );

  const runBackgroundRefetch = React.useCallback(
    async (attempt = 0) => {
      const result = await contentQuery.refetch();
      const latestData = result.data;
      if (!latestData) return;

      const serverCanonical = canonicalizeHtml(
        ensureMassicContentWrapper(sanitizePageHtml(resolvePageContent(latestData)))
      );
      const committedCanonical = canonicalizeHtml(lastCommittedHtmlRef.current);
      if (!committedCanonical) return;

      if (serverCanonical === committedCanonical) {
        hasLocalEditsRef.current = false;
        if (!isEditorFocusedRef.current && Object.keys(editsRef.current).length === 0 && !isSavingRef.current) {
          isEditingSessionRef.current = false;
          setPollingDisabled(false);
        }
        return;
      }

      if (attempt < 2 && !isEditorFocusedRef.current) {
        window.setTimeout(() => {
          void runBackgroundRefetch(attempt + 1);
        }, 800);
      }
    },
    [contentQuery]
  );

  const flushSave = React.useCallback(
    async (reason: SaveReason) => {
      const nextHtml = composeCurrentHtml();
      if (!nextHtml) return;
      if (canonicalizeHtml(nextHtml) === canonicalizeHtml(lastSavedHtmlRef.current)) return;
      hasLocalEditsRef.current = true;
      isEditingSessionRef.current = true;

      if (isSavingRef.current) {
        queuedSaveRef.current = true;
        return;
      }

      isSavingRef.current = true;
      const submittedEdits = { ...editsRef.current };
      try {
        await updatePageContentRequest(nextHtml);
        sourceHtmlRef.current = nextHtml;
        lastSavedHtmlRef.current = canonicalizeHtml(nextHtml);
        lastCommittedHtmlRef.current = canonicalizeHtml(nextHtml);
        // Keep newer edits typed while this save was in-flight.
        const remainingEdits = { ...editsRef.current };
        for (const [id, value] of Object.entries(submittedEdits)) {
          if (remainingEdits[id] === value) {
            delete remainingEdits[id];
          }
        }
        editsRef.current = remainingEdits;

        // Commit local HTML into rendered preview so rerenders cannot snap back.
        if (!isEditorFocusedRef.current) {
          const committedModel = buildEditableHtmlModel(nextHtml);
          textNodeIndexRef.current = committedModel.textNodeIndex;
          setTextNodeIndex(committedModel.textNodeIndex);
          setPreviewHtml(committedModel.previewHtml);
        }

        if (isEditorFocusedRef.current && reason === "debounce") {
          pendingBackgroundRefetchRef.current = true;
        } else {
          pendingBackgroundRefetchRef.current = false;
          window.setTimeout(() => {
            void runBackgroundRefetch();
          }, 500);
        }
        if (reason === "blur") {
          toast.success("Changes Saved");
        }
      } catch {
        toast.error("Failed to save changes to server");
      } finally {
        isSavingRef.current = false;
        if (queuedSaveRef.current) {
          queuedSaveRef.current = false;
          void flushSave("debounce");
        }
      }
    },
    [composeCurrentHtml, runBackgroundRefetch, updatePageContentRequest]
  );

  const scheduleDebouncedSave = React.useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      void flushSave("debounce");
    }, 1200);
  }, [flushSave]);

  React.useEffect(() => {
    if (!data) return;

    const nextStatus = (data?.status || "").toString().toLowerCase();
    const previousStatus = lastStatusRef.current;
    const wasPolling = previousStatus === "pending" || previousStatus === "processing";
    const isPolling = nextStatus === "pending" || nextStatus === "processing";
    const transitionedFromPollingToTerminal = wasPolling && !isPolling;
    const rawPage = resolvePageContent(data);
    const sanitized = ensureMassicContentWrapper(sanitizePageHtml(rawPage));
    const serverCanonical = canonicalizeHtml(sanitized);
    const localCanonical = canonicalizeHtml(lastSavedHtmlRef.current);
    const hasPendingEdits = Object.keys(editsRef.current).length > 0;
    const localChangeInProgress = hasLocalEditsRef.current || hasPendingEdits || isSavingRef.current;
    const serverMatchesLocal = localCanonical.length > 0 && serverCanonical === localCanonical;

    if (isEditingSessionRef.current) {
      if (serverMatchesLocal && !hasPendingEdits && !isSavingRef.current && !isEditorFocusedRef.current) {
        hasLocalEditsRef.current = false;
        isEditingSessionRef.current = false;
        setPollingDisabled(false);
      }
      lastStatusRef.current = nextStatus;
      return;
    }

    // Guard against stale GET responses overwriting local edits.
    if (localChangeInProgress && !serverMatchesLocal) {
      lastStatusRef.current = nextStatus;
      return;
    }

    if (serverMatchesLocal) {
      hasLocalEditsRef.current = false;
    }

    const shouldSyncFromServer =
      !isEditorFocusedRef.current && (isInitialLoadRef.current || isPolling || transitionedFromPollingToTerminal);

    lastStatusRef.current = nextStatus;
    if (!shouldSyncFromServer) return;
    const model = buildEditableHtmlModel(sanitized);

    sourceHtmlRef.current = sanitized;
    textNodeIndexRef.current = model.textNodeIndex;
    editsRef.current = {};
    lastSavedHtmlRef.current = canonicalizeHtml(sanitized);
    setTextNodeIndex(model.textNodeIndex);
    setPreviewHtml(model.previewHtml);

    if (isInitialLoadRef.current) {
      window.setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 250);
    }
  }, [data]);

  React.useEffect(() => {
    const nextStatus = (data?.status || "").toString().toLowerCase();
    if (nextStatus !== "pending" && !isEditingSessionRef.current) {
      setPollingDisabled(false);
    }
  }, [data?.status]);

  React.useEffect(() => {
    if (!data) return;
    const nextStatus = (data?.status || "").toString().toLowerCase();
    if (nextStatus !== "pending") return;

    const timeout = window.setTimeout(() => {
      setPollingDisabled(true);
      toast.warning("Generation seems to be stuck. Please try again.");
    }, 300000);

    return () => window.clearTimeout(timeout);
  }, [data?.status]);

  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      void flushSave("unmount");
    };
  }, [flushSave]);

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

    const checkKey = `${wpConnection.connectionId}:${String(publishContentId)}:page:${normalizedEditableSlug}`;
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
        type: "page",
        slug: normalizedEditableSlug,
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
    isWpConnected,
    normalizedEditableSlug,
    publishContentId,
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

    const delayMs = isSlugEdited ? 350 : 0;
    const timer = window.setTimeout(() => {
      void runSlugCheck();
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    isPublishModalOpen,
    isWpConnected,
    isSlugEdited,
    normalizedEditableSlug,
    publishContentId,
    runSlugCheck,
    wpConnection?.connectionId,
  ]);

  const buildPublishPayload = React.useCallback(
    (targetStatus: "draft" | "publish") => {
      const safeHtml = composeCurrentHtml();
      return {
        connectionId: String(wpConnection?.connectionId || ""),
        status: targetStatus,
        workflowSource: "infer_ai" as const,
        workflowPayload: data || {},
        contentId: String(publishContentId),
        type: "page" as const,
        title: String(publishTitle),
        slug: normalizedEditableSlug || null,
        contentHtml: safeHtml,
        excerpt: null,
        head: {
          title: String(publishTitle),
        },
      };
    },
    [composeCurrentHtml, data, normalizedEditableSlug, publishContentId, publishTitle, wpConnection?.connectionId]
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
          slug: normalizedEditableSlug,
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
      slug: published.slug || normalizedEditableSlug || null,
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
    openEmbeddedPreview,
    wpConnection?.connectionId,
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
          slug: normalizedEditableSlug,
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
      slug: published.slug || normalizedEditableSlug || null,
      previewUrl: prev?.previewUrl,
    }));

    toast.success("Published live to WordPress");
    void contentStatusQuery.refetch();
    setIsPublishModalOpen(false);
  }, [
    buildPublishPayload,
    contentStatusQuery,
    hasFinalContent,
    isPersistedDraftLike,
    isWpConnected,
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
          slug: persistedContent?.slug || normalizedEditableSlug || null,
          previewUrl,
        }
    );
    openEmbeddedPreview(previewUrl, "WordPress Draft Preview");
  }, [
    lastPublishedData?.wpId,
    openEmbeddedPreview,
    persistedContent?.permalink,
    persistedContent?.wpId,
    persistedStatus,
    publishContentId,
    wpConnection?.connectionId,
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
    const safeHtml = composeCurrentHtml();
    const plainText = extractPlainTextFromHtml(safeHtml);
    const ok = await copyToClipboard(plainText);
    if (ok) toast.success("Text copied");
    else toast.error("Copy failed");
  };

  const handleCopyHtml = async () => {
    const safeHtml = composeCurrentHtml();
    const baseCss = await getMassicCssText();
    const styledHtml = buildStyledMassicHtml(safeHtml, {
      baseCss,
      cssVarOverrides,
    });

    if (!styledHtml) {
      toast.error("Nothing to copy");
      return;
    }

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

  const handleInputCapture = (event: React.FormEvent<HTMLDivElement>) => {
    if (!isEditableSpan(event.target)) return;
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    editsRef.current = updateEditFromElement(editsRef.current, event.target);
    scheduleDebouncedSave();
  };

  const handleBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!isEditableSpan(event.target)) return;
    editsRef.current = updateEditFromElement(editsRef.current, event.target);

    const nextTarget = event.relatedTarget as HTMLElement | null;
    const movingWithinEditable = Boolean(nextTarget?.dataset?.massicTextId);
    if (!movingWithinEditable) {
      isEditorFocusedRef.current = false;
      // Snapshot current edited DOM immediately to avoid any intermediate rerender rollback.
      if (previewContainerRef.current) {
        setPreviewHtml(previewContainerRef.current.innerHTML);
      }
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void flushSave("blur").finally(() => {
        if (pendingBackgroundRefetchRef.current && !isEditorFocusedRef.current) {
          pendingBackgroundRefetchRef.current = false;
          void runBackgroundRefetch();
        }
      });
    }
  };

  const handleFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!isEditableSpan(event.target)) return;
    isEditorFocusedRef.current = true;
    isEditingSessionRef.current = true;
    if (!pollingDisabled) {
      setPollingDisabled(true);
    }
  };

  const handlePasteCapture = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (!isEditableSpan(event.target)) return;
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";
    insertPlainTextAtCursor(text);
  };

  const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isEditableSpan(event.target)) return;
    const key = event.key.toLowerCase();
    if ((event.metaKey || event.ctrlKey) && ["b", "i", "u", "k"].includes(key)) {
      event.preventDefault();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      insertPlainTextAtCursor("\n");
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
  }, [confirmPublishAction, handlePublishDraft, handlePublishLive, normalizedEditableSlug, runSlugCheck]);

  const autoResolveSlug = React.useCallback(async () => {
    const suggestedSlug = slugCheckResult?.suggestedSlug || null;
    if (!suggestedSlug) {
      toast.error("No suggested slug available");
      return;
    }

    setIsAutoResolvingSlug(true);
    const normalizedSuggestion = toSlug(suggestedSlug);
    setEditableSlug(normalizedSuggestion);
    setIsSlugEdited(true);
    setSlugCheckError(null);
    toast.success(`Slug updated to ${slugToDisplay(normalizedSuggestion, "/untitled-page")}`);
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
            <Typography variant="h4">Page</Typography>
            {keyword ? (
              <Typography variant="muted" className="mt-1">
                {keyword}
              </Typography>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleCopyHtml} disabled={isProcessing}>
              <Copy className="h-4 w-4" />
              Copy HTML
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleCopyText} disabled={isProcessing}>
              <Copy className="h-4 w-4" />
              Copy Text
            </Button>
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
          <Card className="p-4 space-y-3">
            <Typography variant="muted" className="text-xs">
              Text-only editing is enabled in preview. HTML structure and classes are preserved.
            </Typography>
            <div
              ref={previewContainerRef}
              className="massic-html-preview min-h-[420px] overflow-auto rounded-md border bg-background p-4"
              style={previewStyleVars}
              onInputCapture={handleInputCapture}
              onBlurCapture={handleBlurCapture}
              onFocusCapture={handleFocusCapture}
              onPasteCapture={handlePasteCapture}
              onKeyDownCapture={handleKeyDownCapture}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
            <style>{`
              ${previewMassicVarCss}
              .massic-html-preview .massic-text-editable {
                border-radius: 4px;
                outline: none;
                transition: background-color 120ms ease, box-shadow 120ms ease;
              }
              .massic-html-preview .massic-text-editable:focus {
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 8%, transparent);
                box-shadow: 0 0 0 1px color-mix(in srgb, var(--massic-primary, #2E6A56) 35%, transparent);
              }
            `}</style>
          </Card>
        ) : null}
      </div>

      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Publish to WordPress</DialogTitle>
            <DialogDescription>
              Choose what to do with this page.
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
                <Typography className="text-sm font-mono break-all">{slugToDisplay(effectiveModalSlug, "/untitled-page")}</Typography>
              </div>
              <div className="space-y-1 pt-2">
                <Typography className="text-xs text-muted-foreground">Publish slug</Typography>
                <Input
                  value={editableSlug}
                  onChange={(event) => {
                    setEditableSlug(event.target.value);
                    setIsSlugEdited(true);
                  }}
                  placeholder="enter-page-slug"
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
                      {isAutoResolvingSlug ? "Resolving..." : `Auto-resolve to ${slugToDisplay(slugCheckResult?.suggestedSlug, "/next-available")}`}
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
                          openEmbeddedPreview(liveUrl, "Published WordPress Page");
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
                      disabled={!hasFinalContent || !normalizedEditableSlug || hasSlugConflict || isSlugChecking || wpPublishMutation.isPending}
                    >
                      {wpPublishMutation.isPending ? "Publishing..." : "Publish Live"}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setConfirmPublishAction("draft")}
                    disabled={
                      !hasFinalContent ||
                      !normalizedEditableSlug ||
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
                ? `This will update the live WordPress page at ${publishUrlPreview || "the selected route"}.`
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
              This will move the WordPress page to trash. You can restore it later from WordPress admin.
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
