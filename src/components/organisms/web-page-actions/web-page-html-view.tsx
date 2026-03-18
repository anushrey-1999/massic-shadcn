"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Plus,
  Undo2,
  Redo2,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { resolvePageContent } from "@/utils/page-content-resolver";
import { api } from "@/hooks/use-api";
import { ensureMassicContentWrapper } from "@/utils/page-content-format";
import {
  applySpacingEditsToHtml,
  applyLinkEditsToHtml,
  applyLinkLabelEditsToHtml,
  applyTextEditsToHtml,
  buildEditableHtmlModel,
  buildSpacingStyleString,
  canonicalizeHtml,
  parseEditableSpacingValue,
  extractPlainTextFromHtml,
  isSafeEditableLinkHref,
  normalizeEditableLinkHref,
  sanitizePageHtml,
  moveSectionInHtml,
  deleteSectionFromHtml,
  duplicateSectionInHtml,
  insertBlockInHtml,
  deleteBlockAndNormalize,
  deleteSlotById,
  duplicateElementBySpacingId,
  moveElementBySpacingId,
  insertInsideElementBySpacingId,
  insertAdjacentToElementBySpacingId,
  insertBlockIntoSlot,
  getElementSiblingInfo,
  wrapBlockInTwoColumnLayout,
  normalizeLayoutHtml,
  upgradeLegacySplitLayouts,
  validatePublishableLayoutHtml,
  collapseLayoutBySpacingId,
  getMediaInfoFromElement,
  getTextBlockInfoFromElement,
  updateMediaInElementBySpacingId,
  updateTextBlockByTextId,
  type EditableBlockNode,
  type EditableLayoutNode,
  type EditableLinkRef,
  type EditableSectionRef,
  type EditableSlotNode,
  type EditableSpacingRef,
  type EditableSpacingValue,
  type EditableTextStyleValue,
  type EditableTextNodeRef,
  type LayoutValidationResult,
  type MediaElementInfo,
} from "@/utils/page-html-editor";
import { buildStyledMassicHtml, getMassicCssText } from "@/utils/massic-html-copy";
import { useWebActionContentQuery } from "@/hooks/use-web-page-actions";
import { LayoutPanel, MediaEditorPanel } from "@/components/ui/layout-panel";
import { InsertBlockDialog } from "@/components/ui/insert-block-dialog";

type SaveReason = "debounce" | "blur" | "unmount";
type ActiveLinkEditorState = {
  id: string;
  top: number;
  left: number;
  label: string;
  textIds: string[];
};
type ActiveMediaEditorState = {
  spacingId: string;
  top: number;
  left: number;
  label: string;
  media: MediaElementInfo;
};
type ActiveTextEditorState = {
  id: string;
  top: number;
  left: number;
  label: string;
  text: string;
  style: EditableTextStyleValue;
};
type PreviewEditMode = "text" | "layout";
type ActiveLayoutEditorState = {
  top: number;
  left: number;
  label: string;
  targetKind: "section" | "block" | "layout" | "slot";
  targetTagName: string | null;
  layoutId: string | null;
  slotId: string | null;
  sectionId: string | null;
  sectionCount: number;
  sectionIndex: number;
  spacingId: string | null;
  baseClassName: string;
  baseStyleStr: string;
  baseSpacing: EditableSpacingValue;
  isElement: boolean;
  isLayout: boolean;
  isSlot: boolean;
  canInsertInside: boolean;
  isFirstSibling: boolean;
  isLastSibling: boolean;
  isEmptyElement: boolean;
  mediaTarget: MediaElementInfo | null;
};
type InsertAnchor = {
  kind: "section";
  sectionId: string;
  position: "before" | "after";
} | {
  kind: "element";
  spacingId: string;
  position: "inside" | "before" | "after";
} | {
  kind: "slot";
  slotId: string;
} | {
  kind: "wrap-grid";
  spacingId: string;
  side: "left" | "right";
} | null;

function getEditableLinkElement(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest("a[data-massic-link-id]") as HTMLAnchorElement | null;
}

function getAnyAnchorElement(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest("a") as HTMLAnchorElement | null;
}

function getEditableSpacingElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest("[data-massic-spacing-id]") as HTMLElement | null;
}

function getEditableSectionElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest("[data-massic-section-id]") as HTMLElement | null;
}

function getEditableSlotElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest("[data-massic-slot-id]") as HTMLElement | null;
}

function resolveMediaSelection(target: HTMLElement): { spacingEl: HTMLElement; media: MediaElementInfo } | null {
  const spacingAncestors: HTMLElement[] = [];
  let current: HTMLElement | null = target;

  while (current) {
    if (current.hasAttribute("data-massic-spacing-id")) {
      spacingAncestors.push(current);
    }
    current = current.parentElement;
  }

  for (const spacingEl of spacingAncestors) {
    const media = getMediaInfoFromElement(spacingEl, target);
    if (media) {
      return { spacingEl, media };
    }
  }

  return null;
}

function isEditorPopoverTarget(target: HTMLElement): boolean {
  return Boolean(
    target.closest("[data-massic-text-editor='true']") ||
    target.closest("[data-massic-link-editor='true']") ||
    target.closest("[data-massic-media-editor='true']") ||
    target.closest("[data-massic-section-editor='true']")
  );
}

function createEmptySpacingValue(): EditableSpacingValue {
  return {
    outsideTop: null,
    outsideBottom: null,
    outsideLeft: null,
    outsideRight: null,
  };
}

function areSpacingValuesEqual(left: Partial<EditableSpacingValue> | null | undefined, right: Partial<EditableSpacingValue> | null | undefined): boolean {
  const leftValue = left || {};
  const rightValue = right || {};
  return (
    (leftValue.outsideTop || null) === (rightValue.outsideTop || null) &&
    (leftValue.outsideBottom || null) === (rightValue.outsideBottom || null) &&
    (leftValue.outsideLeft || null) === (rightValue.outsideLeft || null) &&
    (leftValue.outsideRight || null) === (rightValue.outsideRight || null)
  );
}


export function WebPageHtmlView({ businessId, pageId }: { businessId: string; pageId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";

  const [pollingDisabled, setPollingDisabled] = React.useState(false);
  const [previewHtml, setPreviewHtml] = React.useState("");
  const [textNodeIndex, setTextNodeIndex] = React.useState<EditableTextNodeRef[]>([]);

  const contentQuery = useWebActionContentQuery({
    type: "page",
    businessId,
    pageId,
    enabled: !!businessId && !!pageId,
    pollingDisabled,
    pollingIntervalMs: 6000,
  });

  const data = contentQuery.data;
  const [previewEditMode, setPreviewEditMode] = React.useState<PreviewEditMode>("text");
  const [activeLinkEditor, setActiveLinkEditor] = React.useState<ActiveLinkEditorState | null>(null);
  const [linkHrefDraft, setLinkHrefDraft] = React.useState("");
  const [linkLabelDraft, setLinkLabelDraft] = React.useState("");
  const [linkHrefError, setLinkHrefError] = React.useState<string | null>(null);
  const [activeTextEditor, setActiveTextEditor] = React.useState<ActiveTextEditorState | null>(null);
  const [activeMediaEditor, setActiveMediaEditor] = React.useState<ActiveMediaEditorState | null>(null);
  const [activeLayoutEditor, setActiveLayoutEditor] = React.useState<ActiveLayoutEditorState | null>(null);
  const [spacingDraft, setSpacingDraft] = React.useState<EditableSpacingValue>(createEmptySpacingValue);
  const [hoveredLayoutId, setHoveredLayoutId] = React.useState<string | null>(null);
  const [insertDialogOpen, setInsertDialogOpen] = React.useState(false);
  const [insertAnchor, setInsertAnchor] = React.useState<InsertAnchor>(null);
  const [isDirty, setIsDirty] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const sourceHtmlRef = React.useRef("");
  const textNodeIndexRef = React.useRef<EditableTextNodeRef[]>([]);
  const linkIndexRef = React.useRef<EditableLinkRef[]>([]);
  const spacingIndexRef = React.useRef<EditableSpacingRef[]>([]);
  const layoutIndexRef = React.useRef<EditableLayoutNode[]>([]);
  const slotIndexRef = React.useRef<EditableSlotNode[]>([]);
  const blockIndexRef = React.useRef<EditableBlockNode[]>([]);
  const sectionIndexRef = React.useRef<EditableSectionRef[]>([]);
  const undoStackRef = React.useRef<string[]>([]);
  const redoStackRef = React.useRef<string[]>([]);
  const editsRef = React.useRef<Record<string, string>>({});
  const linkEditsRef = React.useRef<Record<string, string>>({});
  const linkLabelEditsRef = React.useRef<Record<string, string>>({});
  const spacingEditsRef = React.useRef<Record<string, EditableSpacingValue>>({});
  const saveTimerRef = React.useRef<number | null>(null);
  const isSavingRef = React.useRef(false);
  const queuedSaveRef = React.useRef(false);
  const previewContainerRef = React.useRef<HTMLDivElement | null>(null);
  const lastRenderedHtmlRef = React.useRef("");
  const textEditorTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const isEditorFocusedRef = React.useRef(false);
  const isInitialLoadRef = React.useRef(true);
  const lastSavedHtmlRef = React.useRef("");
  const lastStatusRef = React.useRef<string>("");
  const hasLocalEditsRef = React.useRef(false);
  const isEditingSessionRef = React.useRef(false);
  const lastCommittedHtmlRef = React.useRef("");
  const pendingBackgroundRefetchRef = React.useRef(false);

  const cssVarOverrides: Record<string, string> = {};
  const previewStyleVars: React.CSSProperties = {};
  const previewMassicVarCss = "";

  const status = (data?.status || "").toString().toLowerCase();
  const isProcessing = status === "pending" || status === "processing";
  const hasFinalContent = canonicalizeHtml(sourceHtmlRef.current).length > 0;

  const normalizeEditorHtml = React.useCallback((html: string) => {
    const sanitized = ensureMassicContentWrapper(sanitizePageHtml(html));
    const upgraded = upgradeLegacySplitLayouts(sanitized);
    return ensureMassicContentWrapper(normalizeLayoutHtml(upgraded));
  }, []);

  const validateEditorHtml = React.useCallback((html: string): LayoutValidationResult => {
    return validatePublishableLayoutHtml(html);
  }, []);

  const composeCurrentHtml = React.useCallback(() => {
    const mergedText = applyTextEditsToHtml(sourceHtmlRef.current, textNodeIndexRef.current, editsRef.current);
    const mergedLinks = applyLinkEditsToHtml(mergedText, linkIndexRef.current, linkEditsRef.current);
    const mergedLinkLabels = applyLinkLabelEditsToHtml(mergedLinks, linkIndexRef.current, linkLabelEditsRef.current);
    const mergedSpacing = applySpacingEditsToHtml(mergedLinkLabels, spacingIndexRef.current, spacingEditsRef.current);
    const withPendingTextModal = activeTextEditor
      ? updateTextBlockByTextId(mergedSpacing, textNodeIndexRef.current, activeTextEditor.id, {
        text: activeTextEditor.text,
        style: activeTextEditor.style,
      })
      : mergedSpacing;
    return normalizeEditorHtml(withPendingTextModal);
  }, [activeTextEditor, normalizeEditorHtml]);

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

      const serverCanonical = canonicalizeHtml(normalizeEditorHtml(resolvePageContent(latestData)));
      const committedCanonical = canonicalizeHtml(lastCommittedHtmlRef.current);
      if (!committedCanonical) return;

      if (serverCanonical === committedCanonical) {
        hasLocalEditsRef.current = false;
        if (
          !isEditorFocusedRef.current &&
          Object.keys(editsRef.current).length === 0 &&
          Object.keys(linkEditsRef.current).length === 0 &&
          Object.keys(linkLabelEditsRef.current).length === 0 &&
          Object.keys(spacingEditsRef.current).length === 0 &&
          !isSavingRef.current
        ) {
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
      const validation = validateEditorHtml(nextHtml);
      if (!validation.isValid) {
        toast.error(validation.errors[0] || "Layout is invalid and could not be saved.");
        return;
      }
      if (canonicalizeHtml(nextHtml) === canonicalizeHtml(lastSavedHtmlRef.current)) return;
      hasLocalEditsRef.current = true;
      isEditingSessionRef.current = true;

      if (isSavingRef.current) {
        queuedSaveRef.current = true;
        return;
      }

      isSavingRef.current = true;
      const submittedEdits = { ...editsRef.current };
      const submittedLinkEdits = { ...linkEditsRef.current };
      const submittedLinkLabelEdits = { ...linkLabelEditsRef.current };
      const submittedSpacingEdits = { ...spacingEditsRef.current };
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

        const remainingLinkEdits = { ...linkEditsRef.current };
        for (const [id, value] of Object.entries(submittedLinkEdits)) {
          if (remainingLinkEdits[id] === value) {
            delete remainingLinkEdits[id];
          }
        }
        linkEditsRef.current = remainingLinkEdits;

        const remainingLinkLabelEdits = { ...linkLabelEditsRef.current };
        for (const [id, value] of Object.entries(submittedLinkLabelEdits)) {
          if (remainingLinkLabelEdits[id] === value) {
            delete remainingLinkLabelEdits[id];
          }
        }
        linkLabelEditsRef.current = remainingLinkLabelEdits;

        const remainingSpacingEdits = { ...spacingEditsRef.current };
        for (const [id, value] of Object.entries(submittedSpacingEdits)) {
          if (areSpacingValuesEqual(remainingSpacingEdits[id], value)) {
            delete remainingSpacingEdits[id];
          }
        }
        spacingEditsRef.current = remainingSpacingEdits;

        // Commit local HTML into rendered preview so rerenders cannot snap back.
        if (!isEditorFocusedRef.current) {
          const committedModel = buildEditableHtmlModel(nextHtml);
          textNodeIndexRef.current = committedModel.textNodeIndex;
          linkIndexRef.current = committedModel.linkIndex;
          spacingIndexRef.current = committedModel.spacingIndex;
          layoutIndexRef.current = committedModel.layoutIndex;
          slotIndexRef.current = committedModel.slotIndex;
          blockIndexRef.current = committedModel.blockIndex;
          sectionIndexRef.current = committedModel.sectionIndex;
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
    [composeCurrentHtml, runBackgroundRefetch, updatePageContentRequest, validateEditorHtml, normalizeEditorHtml]
  );

  React.useEffect(() => {
    if (!data) return;

    const nextStatus = (data?.status || "").toString().toLowerCase();
    const previousStatus = lastStatusRef.current;
    const wasPolling = previousStatus === "pending" || previousStatus === "processing";
    const isPolling = nextStatus === "pending" || nextStatus === "processing";
    const transitionedFromPollingToTerminal = wasPolling && !isPolling;
    const rawPage = resolvePageContent(data);
    const sanitized = normalizeEditorHtml(rawPage);
    const serverCanonical = canonicalizeHtml(sanitized);
    const localCanonical = canonicalizeHtml(lastSavedHtmlRef.current);
    const hasPendingEdits =
      Object.keys(editsRef.current).length > 0 ||
      Object.keys(linkEditsRef.current).length > 0 ||
      Object.keys(linkLabelEditsRef.current).length > 0 ||
      Object.keys(spacingEditsRef.current).length > 0;
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
    linkIndexRef.current = model.linkIndex;
    spacingIndexRef.current = model.spacingIndex;
    layoutIndexRef.current = model.layoutIndex;
    slotIndexRef.current = model.slotIndex;
    blockIndexRef.current = model.blockIndex;
    sectionIndexRef.current = model.sectionIndex;
    editsRef.current = {};
    linkEditsRef.current = {};
    linkLabelEditsRef.current = {};
    spacingEditsRef.current = {};
    lastSavedHtmlRef.current = canonicalizeHtml(sanitized);
    setTextNodeIndex(model.textNodeIndex);
    setPreviewHtml(model.previewHtml);
    setActiveLinkEditor(null);
    setActiveMediaEditor(null);
    setActiveTextEditor(null);
    setLinkHrefDraft("");
    setLinkLabelDraft("");
    setLinkHrefError(null);
    setActiveLayoutEditor(null);
    setSpacingDraft(createEmptySpacingValue());
    setHoveredLayoutId(null);

    if (isInitialLoadRef.current) {
      window.setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 250);
    }
  }, [data, normalizeEditorHtml]);

  React.useEffect(() => {
    if (!activeTextEditor) return;
    const frame = window.requestAnimationFrame(() => {
      textEditorTextareaRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTextEditor]);

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

  // Manage innerHTML via ref instead of dangerouslySetInnerHTML so that
  // re-renders (from hover/selection state changes) never recreate iframes.
  React.useLayoutEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;
    if (lastRenderedHtmlRef.current === previewHtml) return;
    lastRenderedHtmlRef.current = previewHtml;
    container.innerHTML = previewHtml;
  }, [previewHtml]);

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

  const resolveSpacingLabel = React.useCallback((ref: EditableSpacingRef | undefined) => {
    if (!ref) return "Container";
    if (ref.nodeKind === "layout") return "Layout Container";
    const rawClasses = String(ref.className || "")
      .split(/\s+/)
      .map((name) => name.trim())
      .filter(Boolean);
    const preferredClass = rawClasses.find((className) => className.startsWith("massic-")) || rawClasses[0];
    if (preferredClass) {
      const FRIENDLY: Record<string, string> = {
        "massic-card": "Card",
        "massic-container": "Container",
        "massic-grid": "Grid",
        "massic-split": "Split Layout",
        "massic-feature": "Feature",
        "massic-hero": "Hero",
        "massic-cta": "CTA",
        "massic-cta-band": "CTA Band",
        "massic-section": "Section",
        "massic-stats": "Stats",
        "massic-stat": "Stat Item",
        "massic-testimonial": "Testimonial",
        "massic-faq": "FAQ",
        "massic-alert": "Alert",
        "massic-step": "Step",
        "massic-stack": "Stack",
        "massic-actions": "Actions",
        "massic-video-wrap": "Video",
        "massic-comparison-table": "Table",
      };
      return FRIENDLY[preferredClass] || preferredClass.replace("massic-", "").replace(/-/g, " ");
    }
    const TAG_LABELS: Record<string, string> = {
      img: "Image",
      iframe: "Video",
      p: "Paragraph",
      blockquote: "Quote",
      h1: "Heading",
      h2: "Heading",
      h3: "Heading",
      h4: "Heading",
      h5: "Heading",
      h6: "Heading",
      ul: "List",
      ol: "List",
      li: "List Item",
      details: "Details",
      summary: "Summary",
    };
    if (TAG_LABELS[ref.tagName]) return TAG_LABELS[ref.tagName];
    return ref.tagName === "div" ? "Container" : ref.tagName;
  }, []);

  const applySpacingPreviewToTarget = React.useCallback((spacingId: string, spacing: EditableSpacingValue | null) => {
    const target = previewContainerRef.current?.querySelector(
      `[data-massic-spacing-id="${spacingId}"]`
    ) as HTMLElement | null;
    if (!target) return;
    const marginProps = ["margin-top", "margin-bottom", "margin-left", "margin-right"] as const;
    for (const prop of marginProps) {
      target.style.removeProperty(prop);
    }
    if (!spacing) return;
    const styleStr = buildSpacingStyleString(spacing);
    if (!styleStr) return;
    for (const part of styleStr.split(";")) {
      const colonIdx = part.indexOf(":");
      if (colonIdx < 1) continue;
      const prop = part.slice(0, colonIdx).trim();
      const val = part.slice(colonIdx + 1).trim();
      target.style.setProperty(prop, val);
    }
  }, []);

  const closeActiveTextEditor = React.useCallback(() => {
    setActiveTextEditor(null);
    isEditorFocusedRef.current = false;
    if (
      !Object.keys(editsRef.current).length &&
      !Object.keys(linkEditsRef.current).length &&
      !Object.keys(linkLabelEditsRef.current).length &&
      !Object.keys(spacingEditsRef.current).length &&
      !isSavingRef.current
    ) {
      isEditingSessionRef.current = false;
      setPollingDisabled(false);
    }
  }, []);

  const openTextEditorForElement = React.useCallback((target: HTMLElement) => {
    if (!previewContainerRef.current) return;
    const info = getTextBlockInfoFromElement(target);
    const textTarget = target.closest("[data-massic-text-id]") as HTMLElement | null;
    if (!info || !textTarget) return;

    const container = previewContainerRef.current;
    const targetRect = textTarget.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const nextLeft = Math.max(
      8,
      Math.min(targetRect.left - containerRect.left + container.scrollLeft, container.scrollWidth - 360)
    );
    const nextTop = Math.max(8, targetRect.bottom - containerRect.top + container.scrollTop + 8);

    setActiveLinkEditor(null);
    setActiveMediaEditor(null);
    setLinkHrefError(null);
    setActiveTextEditor({
      id: info.id,
      label: info.label,
      text: info.text,
      style: info.style,
      left: Number.isFinite(nextLeft) ? nextLeft : 8,
      top: Number.isFinite(nextTop) ? nextTop : 8,
    });
    isEditorFocusedRef.current = true;
    isEditingSessionRef.current = true;
    if (!pollingDisabled) {
      setPollingDisabled(true);
    }
  }, [pollingDisabled]);

  const updateActiveTextStyle = React.useCallback((patch: Partial<EditableTextStyleValue>) => {
    setActiveTextEditor((current) => current ? {
      ...current,
      style: {
        ...current.style,
        ...patch,
      },
    } : current);
  }, []);

  const closeActiveLayoutEditor = React.useCallback(() => {
    setActiveLayoutEditor(null);
    setSpacingDraft(createEmptySpacingValue());
    setHoveredLayoutId(null);
    isEditorFocusedRef.current = false;
    if (
      !Object.keys(editsRef.current).length &&
      !Object.keys(linkEditsRef.current).length &&
      !Object.keys(linkLabelEditsRef.current).length &&
      !Object.keys(spacingEditsRef.current).length &&
      !isSavingRef.current
    ) {
      isEditingSessionRef.current = false;
      setPollingDisabled(false);
    }
  }, []);

  const cancelActiveLayoutEditor = React.useCallback(() => {
    if (activeLayoutEditor?.spacingId) {
      applySpacingPreviewToTarget(activeLayoutEditor.spacingId, activeLayoutEditor.baseSpacing);
    }
    closeActiveLayoutEditor();
  }, [activeLayoutEditor, closeActiveLayoutEditor, applySpacingPreviewToTarget]);

  const closeActiveLinkEditor = React.useCallback(() => {
    setActiveLinkEditor(null);
    setLinkLabelDraft("");
    setLinkHrefError(null);
    isEditorFocusedRef.current = false;
    if (
      !Object.keys(editsRef.current).length &&
      !Object.keys(linkEditsRef.current).length &&
      !Object.keys(linkLabelEditsRef.current).length &&
      !Object.keys(spacingEditsRef.current).length &&
      !isSavingRef.current
    ) {
      isEditingSessionRef.current = false;
      setPollingDisabled(false);
    }
  }, []);

  const closeActiveMediaEditor = React.useCallback(() => {
    setActiveMediaEditor(null);
    isEditorFocusedRef.current = false;
    if (
      !Object.keys(editsRef.current).length &&
      !Object.keys(linkEditsRef.current).length &&
      !Object.keys(linkLabelEditsRef.current).length &&
      !Object.keys(spacingEditsRef.current).length &&
      !isSavingRef.current
    ) {
      isEditingSessionRef.current = false;
      setPollingDisabled(false);
    }
  }, []);

  React.useEffect(() => {
    if (previewEditMode === "layout") {
      setActiveLinkEditor(null);
      setActiveMediaEditor(null);
      setActiveTextEditor(null);
      setLinkHrefError(null);
      return;
    }
    cancelActiveLayoutEditor();
  }, [cancelActiveLayoutEditor, previewEditMode]);

  React.useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const previousActive = container.querySelectorAll("[data-massic-layout-selected='true']");
    previousActive.forEach((node) => {
      (node as HTMLElement).removeAttribute("data-massic-layout-selected");
    });

    if (previewEditMode !== "layout") return;
    const activeSpacingId = activeLayoutEditor?.spacingId;
    const activeSlotId = activeLayoutEditor?.slotId;
    const activeSectionId = activeLayoutEditor?.sectionId;
    const targetId = activeSpacingId || activeSlotId || activeSectionId;
    if (!targetId) return;

    const attr = activeSpacingId
      ? "data-massic-spacing-id"
      : activeSlotId
        ? "data-massic-slot-id"
        : "data-massic-section-id";
    const nextActive = container.querySelector(`[${attr}="${targetId}"]`) as HTMLElement | null;
    if (!nextActive) return;
    nextActive.setAttribute("data-massic-layout-selected", "true");
  }, [activeLayoutEditor?.slotId, activeLayoutEditor?.spacingId, activeLayoutEditor?.sectionId, previewEditMode, previewHtml]);

  React.useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const previousHovered = container.querySelectorAll("[data-massic-layout-hovered='true']");
    previousHovered.forEach((node) => {
      (node as HTMLElement).removeAttribute("data-massic-layout-hovered");
    });

    if (previewEditMode !== "layout") return;
    if (!hoveredLayoutId) return;
    const spacingEl = container.querySelector(`[data-massic-spacing-id="${hoveredLayoutId}"]`) as HTMLElement | null;
    const slotEl = container.querySelector(`[data-massic-slot-id="${hoveredLayoutId}"]`) as HTMLElement | null;
    const sectionEl = container.querySelector(`[data-massic-section-id="${hoveredLayoutId}"]`) as HTMLElement | null;
    const nextHovered = spacingEl || slotEl || sectionEl;
    if (!nextHovered) return;
    nextHovered.setAttribute("data-massic-layout-hovered", "true");
  }, [hoveredLayoutId, previewEditMode, previewHtml]);

  React.useEffect(() => {
    if (previewEditMode !== "layout") return;
    if (!activeLayoutEditor?.spacingId) return;
    applySpacingPreviewToTarget(activeLayoutEditor.spacingId, spacingDraft);
  }, [
    activeLayoutEditor?.spacingId,
    previewEditMode,
    previewHtml,
    applySpacingPreviewToTarget,
    spacingDraft,
  ]);

  const handlePreviewMouseDownCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;
    const target = event.target as HTMLElement | null;
    if (!target || isEditorPopoverTarget(target)) return;

    if (resolveMediaSelection(target) || getEditableLinkElement(target) || target.closest("[data-massic-text-id]")) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [previewEditMode]);

  const handlePreviewClickCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (isEditorPopoverTarget(target)) {
      return;
    }

    const anyAnchor = getAnyAnchorElement(target);
    if (anyAnchor) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (previewEditMode === "layout") {
      event.preventDefault();
      event.stopPropagation();

      const spacingTarget = getEditableSpacingElement(target);
      const slotTarget = getEditableSlotElement(target);
      const sectionTarget = getEditableSectionElement(target);
      const primaryTarget = spacingTarget || slotTarget || sectionTarget;
      if (!primaryTarget) {
        if (activeLayoutEditor) cancelActiveLayoutEditor();
        return;
      }

      const spacingId = spacingTarget?.dataset.massicSpacingId || null;
      const slotId = slotTarget?.dataset.massicSlotId || null;
      const layoutId = spacingTarget?.dataset.massicLayoutId || slotTarget?.closest("[data-massic-layout-id]")?.getAttribute("data-massic-layout-id") || null;
      const sectionId = sectionTarget?.dataset.massicSectionId || null;
      const baseClassName = spacingId ? String(spacingTarget!.getAttribute("class") || "") : "";
      const baseStyleStr = spacingId ? String(spacingTarget!.getAttribute("style") || "") : "";
      const baseSpacingValue = spacingId ? parseEditableSpacingValue(baseClassName, baseStyleStr) : createEmptySpacingValue();

      if (activeLayoutEditor?.spacingId && activeLayoutEditor.spacingId !== spacingId) {
        applySpacingPreviewToTarget(activeLayoutEditor.spacingId, activeLayoutEditor.baseSpacing);
      }

      if (!previewContainerRef.current) return;
      const container = previewContainerRef.current;
      const targetRect = primaryTarget.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const nextLeft = Math.max(
        8,
        Math.min(targetRect.left - containerRect.left + container.scrollLeft, container.scrollWidth - 300)
      );
      const nextTop = Math.max(8, targetRect.top - containerRect.top + container.scrollTop - 44);

      const spacingRef = spacingId ? spacingIndexRef.current.find((item) => item.id === spacingId) : undefined;
      const slotRef = slotId ? slotIndexRef.current.find((item) => item.id === slotId) : undefined;
      const sectionRef = sectionId ? sectionIndexRef.current.find((item) => item.id === sectionId) : undefined;
      const idx = sectionId ? sectionIndexRef.current.findIndex((item) => item.id === sectionId) : -1;
      const hasDirectSpacingTarget = !!spacingId && spacingTarget !== slotTarget;

      const targetKind: ActiveLayoutEditorState["targetKind"] =
        spacingRef?.nodeKind === "layout" ? "layout"
          : hasDirectSpacingTarget ? "block"
            : slotRef ? "slot"
              : "section";
      const isElement = targetKind === "block";
      const isLayout = targetKind === "layout";
      const isSlot = targetKind === "slot";

      let label: string;
      if (isSlot) {
        label = slotRef?.isEmpty ? "Empty Layout Slot" : "Layout Slot";
      } else if (isLayout) {
        label = "Layout Container";
      } else if (isElement) {
        label = resolveSpacingLabel(spacingRef);
      } else if (sectionRef) {
        label = sectionRef.label;
      } else {
        label = resolveSpacingLabel(spacingRef);
      }
      const siblingInfo = isElement && spacingId
        ? getElementSiblingInfo(sourceHtmlRef.current, spacingId)
        : { isFirst: true, isLast: true, siblingCount: 1, isEmpty: false };
      const targetTagName = spacingRef?.tagName || sectionRef?.tagName || slotRef?.tagName || null;
      const canInsertInside = !!targetTagName && new Set(["div", "section", "article", "li", "blockquote", "details"]).has(targetTagName);

      const mediaSelection = target ? resolveMediaSelection(target as HTMLElement) : null;
      const mediaTarget = mediaSelection?.media || null;

      setSpacingDraft(baseSpacingValue);
      setActiveLayoutEditor({
        left: Number.isFinite(nextLeft) ? nextLeft : 8,
        top: Number.isFinite(nextTop) ? nextTop : 8,
        label,
        targetKind,
        targetTagName,
        layoutId,
        slotId: targetKind === "slot" ? slotId : null,
        sectionId,
        sectionCount: sectionIndexRef.current.length,
        sectionIndex: idx,
        spacingId,
        baseClassName,
        baseStyleStr,
        baseSpacing: baseSpacingValue,
        isElement,
        isLayout,
        isSlot,
        canInsertInside,
        isFirstSibling: siblingInfo.isFirst,
        isLastSibling: siblingInfo.isLast,
        isEmptyElement: isSlot ? !!slotRef?.isEmpty : siblingInfo.isEmpty,
        mediaTarget: isElement ? mediaTarget : null,
      });
      setHoveredLayoutId(spacingId || slotId || sectionId);
      isEditorFocusedRef.current = true;
      isEditingSessionRef.current = true;
      if (!pollingDisabled) setPollingDisabled(true);
      return;
    }

    const mediaSelection = resolveMediaSelection(target);
    if (mediaSelection?.spacingEl.dataset.massicSpacingId && previewContainerRef.current) {
      const container = previewContainerRef.current;
      const mediaRect = (target.closest("img,iframe,.massic-video-wrap,[data-massic-media-editable]") as HTMLElement | null
        ?? mediaSelection.spacingEl).getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const nextLeft = Math.max(
        8,
        Math.min(mediaRect.left - containerRect.left + container.scrollLeft, container.scrollWidth - 308)
      );
      const nextTop = Math.max(8, mediaRect.bottom - containerRect.top + container.scrollTop + 8);

      setActiveLinkEditor(null);
      setActiveTextEditor(null);
      setLinkHrefError(null);
      setActiveMediaEditor({
        spacingId: mediaSelection.spacingEl.dataset.massicSpacingId,
        left: Number.isFinite(nextLeft) ? nextLeft : 8,
        top: Number.isFinite(nextTop) ? nextTop : 8,
        label: mediaSelection.media.type === "img" ? "Edit Image" : "Edit Video",
        media: mediaSelection.media,
      });
      isEditorFocusedRef.current = true;
      isEditingSessionRef.current = true;
      if (!pollingDisabled) {
        setPollingDisabled(true);
      }
      return;
    }

    const anchor = getEditableLinkElement(target);
    if (anchor) {
      const linkId = anchor.dataset.massicLinkId;
      if (!linkId || !previewContainerRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      const container = previewContainerRef.current;
      const anchorRect = anchor.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const anchorLeft = anchorRect.left - containerRect.left + container.scrollLeft;
      const anchorTop = anchorRect.bottom - containerRect.top + container.scrollTop + 8;
      const nextLeft = Math.max(8, Math.min(anchorLeft, container.scrollWidth - 308));
      const nextTop = Math.max(8, anchorTop);

      const linkRef = linkIndexRef.current.find((item) => item.id === linkId);
      const currentHref = normalizeEditableLinkHref(
        Object.prototype.hasOwnProperty.call(linkEditsRef.current, linkId)
          ? linkEditsRef.current[linkId]
          : (linkRef?.href || anchor.getAttribute("href") || "")
      );
      const textIds = Array.from(anchor.querySelectorAll("[data-massic-text-id]"))
        .map((node) => (node as HTMLElement).dataset.massicTextId || "")
        .filter(Boolean);

      setActiveMediaEditor(null);
      setActiveTextEditor(null);
      setActiveLinkEditor({
        id: linkId,
        left: Number.isFinite(nextLeft) ? nextLeft : 8,
        top: Number.isFinite(nextTop) ? nextTop : 8,
        label: linkRef?.label || (anchor.textContent || "").trim() || "Link",
        textIds,
      });
      setLinkHrefDraft(currentHref);
      setLinkLabelDraft(
        Object.prototype.hasOwnProperty.call(linkLabelEditsRef.current, linkId)
          ? linkLabelEditsRef.current[linkId]
          : (anchor.textContent || "").replace(/\u00A0/g, " ").trim()
      );
      setLinkHrefError(null);
      isEditorFocusedRef.current = true;
      isEditingSessionRef.current = true;
      if (!pollingDisabled) {
        setPollingDisabled(true);
      }
      return;
    }

    const textTarget = target.closest("[data-massic-text-id]") as HTMLElement | null;
    if (textTarget) {
      event.preventDefault();
      event.stopPropagation();
      openTextEditorForElement(textTarget);
      return;
    }

    if (!anchor) {
      if (activeLinkEditor) {
        closeActiveLinkEditor();
      }
      if (activeMediaEditor) {
        closeActiveMediaEditor();
      }
      if (activeTextEditor) {
        closeActiveTextEditor();
      }
      return;
    }

  }, [
    activeTextEditor,
    activeLinkEditor,
    activeMediaEditor,
    activeLayoutEditor,
    closeActiveTextEditor,
    closeActiveLinkEditor,
    closeActiveMediaEditor,
    cancelActiveLayoutEditor,
    openTextEditorForElement,
    pollingDisabled,
    previewEditMode,
    applySpacingPreviewToTarget,
    resolveSpacingLabel,
  ]);

  const handlePreviewAuxClickCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = getAnyAnchorElement(event.target);
    if (!anchor) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handlePreviewMouseMoveCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (previewEditMode !== "layout") return;
    const lockedId = activeLayoutEditor?.spacingId || activeLayoutEditor?.slotId || activeLayoutEditor?.sectionId;
    if (lockedId) {
      setHoveredLayoutId((prev) => (prev === lockedId ? prev : lockedId));
      return;
    }
    const slotTarget = getEditableSlotElement(event.target);
    const spacingTarget = getEditableSpacingElement(event.target);
    const sectionTarget = getEditableSectionElement(event.target);
    const nextId = spacingTarget?.dataset.massicSpacingId || slotTarget?.dataset.massicSlotId || sectionTarget?.dataset.massicSectionId || null;
    setHoveredLayoutId((prev) => (prev === nextId ? prev : nextId));
  }, [activeLayoutEditor?.slotId, activeLayoutEditor?.spacingId, activeLayoutEditor?.sectionId, previewEditMode]);

  const handlePreviewMouseLeaveCapture = React.useCallback(() => {
    if (previewEditMode !== "layout") return;
    const lockedId = activeLayoutEditor?.spacingId || activeLayoutEditor?.slotId || activeLayoutEditor?.sectionId;
    if (lockedId) {
      setHoveredLayoutId((prev) => (prev === lockedId ? prev : lockedId));
      return;
    }
    setHoveredLayoutId(null);
  }, [activeLayoutEditor?.slotId, activeLayoutEditor?.spacingId, activeLayoutEditor?.sectionId, previewEditMode]);

  const syncSpacingIndexEntry = React.useCallback((spacingId: string, spacingValue: EditableSpacingValue, className: string) => {
    spacingIndexRef.current = spacingIndexRef.current.map((entry) => {
      if (entry.id !== spacingId) return entry;
      return {
        ...entry,
        className,
        outsideTop: spacingValue.outsideTop,
        outsideBottom: spacingValue.outsideBottom,
        outsideLeft: spacingValue.outsideLeft,
        outsideRight: spacingValue.outsideRight,
      };
    });
  }, []);

  const saveActiveSpacingValue = React.useCallback(async (nextValue: EditableSpacingValue) => {
    const active = activeLayoutEditor;
    if (!active?.spacingId) return;

    spacingEditsRef.current = {
      ...spacingEditsRef.current,
      [active.spacingId]: nextValue,
    };

    applySpacingPreviewToTarget(active.spacingId, nextValue);
    syncSpacingIndexEntry(active.spacingId, nextValue, active.baseClassName);
    closeActiveLayoutEditor();
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    setIsDirty(true);
  }, [activeLayoutEditor, closeActiveLayoutEditor, applySpacingPreviewToTarget, syncSpacingIndexEntry]);

  const handleApplySpacingForActiveTarget = React.useCallback(async () => {
    await saveActiveSpacingValue(spacingDraft);
  }, [saveActiveSpacingValue, spacingDraft]);

  const handleResetSpacingForActiveTarget = React.useCallback(async () => {
    await saveActiveSpacingValue(createEmptySpacingValue());
  }, [saveActiveSpacingValue]);

  const saveActiveLinkHref = React.useCallback(async (nextHrefInput: string, nextLabelInput?: string) => {
    const active = activeLinkEditor;
    if (!active) return;

    const normalizedHref = normalizeEditableLinkHref(nextHrefInput);
    if (normalizedHref && !isSafeEditableLinkHref(normalizedHref)) {
      setLinkHrefError("Enter a valid URL (https://, mailto:, tel:, /path, #anchor).");
      return;
    }

    linkEditsRef.current = {
      ...linkEditsRef.current,
      [active.id]: normalizedHref,
    };

    if (nextLabelInput !== undefined) {
      const normalizedLabel = nextLabelInput.replace(/\u00A0/g, " ").trim();
      linkLabelEditsRef.current = {
        ...linkLabelEditsRef.current,
        [active.id]: normalizedLabel,
      };
    }

    if (previewContainerRef.current) {
      const selector = `a[data-massic-link-id="${active.id}"]`;
      const linkEl = previewContainerRef.current.querySelector(selector) as HTMLAnchorElement | null;
      if (linkEl) {
        if (normalizedHref) {
          linkEl.setAttribute("href", normalizedHref);
        } else {
          linkEl.removeAttribute("href");
        }

        if (nextLabelInput !== undefined) {
          const normalizedLabel = nextLabelInput.replace(/\u00A0/g, " ").trim();
          let appliedToTextNode = false;
          for (const textId of active.textIds) {
            const textEl = linkEl.querySelector(`[data-massic-text-id="${textId}"]`) as HTMLElement | null;
            if (!textEl) continue;
            textEl.textContent = normalizedLabel;
            editsRef.current = {
              ...editsRef.current,
              [textId]: normalizedLabel,
            };
            appliedToTextNode = true;
            break;
          }

          if (!appliedToTextNode) {
            linkEl.textContent = normalizedLabel;
          }
        }
      }
    }

    setLinkHrefDraft(normalizedHref);
    if (nextLabelInput !== undefined) {
      setLinkLabelDraft(nextLabelInput);
    }
    setLinkHrefError(null);
    closeActiveLinkEditor();
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    setIsDirty(true);
  }, [activeLinkEditor, closeActiveLinkEditor]);

  const handleSaveActiveLinkHref = React.useCallback(async () => {
    await saveActiveLinkHref(linkHrefDraft, linkLabelDraft);
  }, [linkHrefDraft, linkLabelDraft, saveActiveLinkHref]);

  const handleRemoveActiveLinkHref = React.useCallback(async () => {
    await saveActiveLinkHref("", linkLabelDraft);
  }, [linkLabelDraft, saveActiveLinkHref]);

  const rebuildModelFromSource = React.useCallback((html: string) => {
    const sanitized = normalizeEditorHtml(html);
    sourceHtmlRef.current = sanitized;
    const model = buildEditableHtmlModel(sanitized);
    textNodeIndexRef.current = model.textNodeIndex;
    linkIndexRef.current = model.linkIndex;
    spacingIndexRef.current = model.spacingIndex;
    layoutIndexRef.current = model.layoutIndex;
    slotIndexRef.current = model.slotIndex;
    blockIndexRef.current = model.blockIndex;
    sectionIndexRef.current = model.sectionIndex;
    editsRef.current = {};
    linkEditsRef.current = {};
    linkLabelEditsRef.current = {};
    spacingEditsRef.current = {};
    setTextNodeIndex(model.textNodeIndex);
    setPreviewHtml(model.previewHtml);
    setActiveLayoutEditor(null);
    setActiveMediaEditor(null);
    setHoveredLayoutId(null);
    return sanitized;
  }, [normalizeEditorHtml]);

  const pushUndo = React.useCallback(() => {
    const stack = undoStackRef.current;
    stack.push(sourceHtmlRef.current);
    if (stack.length > 30) stack.shift();
    redoStackRef.current = [];
  }, []);

  const handleUndo = React.useCallback(() => {
    const stack = undoStackRef.current;
    if (!stack.length) return;
    redoStackRef.current.push(sourceHtmlRef.current);
    if (redoStackRef.current.length > 30) redoStackRef.current.shift();
    const previous = stack.pop()!;
    rebuildModelFromSource(previous);
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    if (!pollingDisabled) setPollingDisabled(true);
    setIsDirty(true);
  }, [pollingDisabled, rebuildModelFromSource]);

  const handleRedo = React.useCallback(() => {
    const stack = redoStackRef.current;
    if (!stack.length) return;
    undoStackRef.current.push(sourceHtmlRef.current);
    const next = stack.pop()!;
    rebuildModelFromSource(next);
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    if (!pollingDisabled) setPollingDisabled(true);
    setIsDirty(true);
  }, [pollingDisabled, rebuildModelFromSource]);

  const handleManualSave = React.useCallback(async () => {
    const nextHtml = composeCurrentHtml();
    if (!nextHtml) return;
    const validation = validateEditorHtml(nextHtml);
    if (!validation.isValid) {
      toast.error(validation.errors[0] || "Layout is invalid and could not be saved.");
      return;
    }
    setIsSaving(true);
    try {
      await updatePageContentRequest(nextHtml);
      sourceHtmlRef.current = nextHtml;
      lastSavedHtmlRef.current = canonicalizeHtml(nextHtml);
      lastCommittedHtmlRef.current = canonicalizeHtml(nextHtml);
      editsRef.current = {};
      linkEditsRef.current = {};
      linkLabelEditsRef.current = {};
      spacingEditsRef.current = {};
      hasLocalEditsRef.current = false;
      setIsDirty(false);

      const committedModel = buildEditableHtmlModel(nextHtml);
      textNodeIndexRef.current = committedModel.textNodeIndex;
      linkIndexRef.current = committedModel.linkIndex;
      spacingIndexRef.current = committedModel.spacingIndex;
      layoutIndexRef.current = committedModel.layoutIndex;
      slotIndexRef.current = committedModel.slotIndex;
      blockIndexRef.current = committedModel.blockIndex;
      sectionIndexRef.current = committedModel.sectionIndex;
      setTextNodeIndex(committedModel.textNodeIndex);
      setPreviewHtml(committedModel.previewHtml);
      setActiveLinkEditor(null);
      setActiveMediaEditor(null);
      setActiveTextEditor(null);
      setLinkHrefDraft("");
      setLinkLabelDraft("");
      setLinkHrefError(null);

      toast.success("Changes saved");
      window.setTimeout(() => { void runBackgroundRefetch(); }, 500);
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [composeCurrentHtml, runBackgroundRefetch, updatePageContentRequest, validateEditorHtml]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "s") {
        e.preventDefault();
        void handleManualSave();
      } else if (mod && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        handleUndo();
      } else if ((mod && e.shiftKey && e.key === "z") || (mod && e.key === "y")) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleManualSave, handleUndo, handleRedo]);

  const previewOffsetTop = previewContainerRef.current?.offsetTop ?? 0;
  const previewOffsetLeft = previewContainerRef.current?.offsetLeft ?? 0;
  const previewContentWidth = previewContainerRef.current?.clientWidth ?? 560;
  const textEditorPanelWidth = Math.min(560, Math.max(280, previewContentWidth - 24));
  const textEditorTop = activeTextEditor
    ? previewOffsetTop + activeTextEditor.top
    : previewOffsetTop + 8;
  const textEditorLeft = activeTextEditor
    ? previewOffsetLeft + Math.max(
      8,
      Math.min(activeTextEditor.left, Math.max(8, previewContentWidth - textEditorPanelWidth - 8))
    )
    : previewOffsetLeft + 8;

  const executeSectionMutation = React.useCallback(
    (mutatedHtml: string) => {
      const sanitized = normalizeEditorHtml(mutatedHtml);
      sourceHtmlRef.current = sanitized;
      const model = buildEditableHtmlModel(sanitized);
      textNodeIndexRef.current = model.textNodeIndex;
      linkIndexRef.current = model.linkIndex;
      spacingIndexRef.current = model.spacingIndex;
      layoutIndexRef.current = model.layoutIndex;
      slotIndexRef.current = model.slotIndex;
      blockIndexRef.current = model.blockIndex;
      sectionIndexRef.current = model.sectionIndex;
      editsRef.current = {};
      linkEditsRef.current = {};
      linkLabelEditsRef.current = {};
      spacingEditsRef.current = {};
      setTextNodeIndex(model.textNodeIndex);
      setPreviewHtml(model.previewHtml);
      setActiveLinkEditor(null);
      setActiveMediaEditor(null);
      setActiveTextEditor(null);
      setLinkHrefDraft("");
      setLinkLabelDraft("");
      setLinkHrefError(null);
      setActiveLayoutEditor(null);
      setHoveredLayoutId(null);

      hasLocalEditsRef.current = true;
      isEditingSessionRef.current = true;
      if (!pollingDisabled) setPollingDisabled(true);
      setIsDirty(true);
    },
    [normalizeEditorHtml, pollingDisabled]
  );

  const handleUpdateActiveMedia = React.useCallback(
    (updates: { src?: string; alt?: string; width?: string }) => {
      const active = activeMediaEditor;
      if (!active) return;
      pushUndo();
      const result = updateMediaInElementBySpacingId(
        sourceHtmlRef.current,
        active.spacingId,
        active.media.mediaIndex,
        active.media.type,
        updates,
      );
      executeSectionMutation(result);
      setActiveMediaEditor(null);
    },
    [activeMediaEditor, executeSectionMutation, pushUndo]
  );

  const handleMoveSection = React.useCallback(
    (sectionId: string, direction: "up" | "down") => {
      pushUndo();
      const result = moveSectionInHtml(sourceHtmlRef.current, sectionId, direction);
      executeSectionMutation(result);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleDeleteSection = React.useCallback(
    (sectionId: string) => {
      pushUndo();
      const result = deleteSectionFromHtml(sourceHtmlRef.current, sectionId);
      executeSectionMutation(result);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleDuplicateSection = React.useCallback(
    (sectionId: string) => {
      pushUndo();
      const result = duplicateSectionInHtml(sourceHtmlRef.current, sectionId);
      executeSectionMutation(result);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleOpenInsertDialog = React.useCallback(
    (anchor: InsertAnchor) => {
      setInsertAnchor(anchor);
      setInsertDialogOpen(true);
    },
    []
  );

  const handleInsertBlock = React.useCallback(
    (blockHtml: string) => {
      pushUndo();
      let result: string;
      if (insertAnchor?.kind === "wrap-grid") {
        const { spacingId, side } = insertAnchor;
        result = wrapBlockInTwoColumnLayout(sourceHtmlRef.current, spacingId, side, blockHtml);
      } else if (insertAnchor?.kind === "slot") {
        result = insertBlockIntoSlot(sourceHtmlRef.current, insertAnchor.slotId, blockHtml, "end");
      } else if (insertAnchor?.kind === "element") {
        const { spacingId, position } = insertAnchor;
        if (position === "inside") {
          result = insertInsideElementBySpacingId(sourceHtmlRef.current, spacingId, "end", blockHtml);
        } else {
          result = insertAdjacentToElementBySpacingId(sourceHtmlRef.current, spacingId, position, blockHtml);
        }
      } else {
        result = insertBlockInHtml(
          sourceHtmlRef.current,
          insertAnchor?.sectionId ?? null,
          insertAnchor?.position ?? "after",
          blockHtml
        );
      }
      setInsertDialogOpen(false);
      setInsertAnchor(null);
      executeSectionMutation(result);
    },
    [executeSectionMutation, insertAnchor, pushUndo]
  );

  // Element-level handlers (for inner elements like cards, containers, grid items)
  const handleDeleteElement = React.useCallback(
    (spacingId: string) => {
      pushUndo();
      const result = deleteBlockAndNormalize(sourceHtmlRef.current, spacingId);
      executeSectionMutation(result);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleDuplicateElement = React.useCallback(
    (spacingId: string) => {
      pushUndo();
      const result = duplicateElementBySpacingId(sourceHtmlRef.current, spacingId);
      executeSectionMutation(result);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleMoveElement = React.useCallback(
    (spacingId: string, direction: "up" | "down") => {
      pushUndo();
      const result = moveElementBySpacingId(sourceHtmlRef.current, spacingId, direction);
      executeSectionMutation(result);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleUpdateMedia = React.useCallback(
    (spacingId: string, media: MediaElementInfo, updates: { src?: string; alt?: string; width?: string }) => {
      pushUndo();
      const result = updateMediaInElementBySpacingId(
        sourceHtmlRef.current,
        spacingId,
        media.mediaIndex,
        media.type,
        updates,
      );
      executeSectionMutation(result);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleSaveActiveTextEditor = React.useCallback(() => {
    const active = activeTextEditor;
    if (!active) return;
    pushUndo();
    const result = updateTextBlockByTextId(sourceHtmlRef.current, textNodeIndexRef.current, active.id, {
      text: active.text,
      style: active.style,
    });
    executeSectionMutation(result);
  }, [activeTextEditor, executeSectionMutation, pushUndo]);

  const handleCollapseLayout = React.useCallback(
    (spacingId: string) => {
      pushUndo();
      const result = collapseLayoutBySpacingId(sourceHtmlRef.current, spacingId);
      executeSectionMutation(result);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleDeleteSlot = React.useCallback(
    (slotId: string) => {
      pushUndo();
      const result = deleteSlotById(sourceHtmlRef.current, slotId);
      executeSectionMutation(result);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleSelectParentSection = React.useCallback(() => {
    if (!activeLayoutEditor || !previewContainerRef.current) return;
    const selectedEl = activeLayoutEditor.slotId
      ? previewContainerRef.current.querySelector(`[data-massic-slot-id="${activeLayoutEditor.slotId}"]`) as HTMLElement | null
      : activeLayoutEditor.spacingId
        ? previewContainerRef.current.querySelector(`[data-massic-spacing-id="${activeLayoutEditor.spacingId}"]`) as HTMLElement | null
        : null;
    if (!selectedEl) return;
    const parentSection = selectedEl.closest("[data-massic-section-id]") as HTMLElement | null;
    if (!parentSection) return;
    const sectionId = parentSection.dataset.massicSectionId;
    if (!sectionId) return;

    const container = previewContainerRef.current;
    const targetRect = parentSection.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const nextLeft = Math.max(
      8,
      Math.min(targetRect.left - containerRect.left + container.scrollLeft, container.scrollWidth - 300)
    );
    const nextTop = Math.max(8, targetRect.top - containerRect.top + container.scrollTop - 44);
    const sectionRef = sectionIndexRef.current.find((item) => item.id === sectionId);
    const idx = sectionIndexRef.current.findIndex((item) => item.id === sectionId);
    const parentSpacingId = parentSection.dataset.massicSpacingId || null;
    const baseClassName = parentSpacingId ? String(parentSection.getAttribute("class") || "") : "";
    const baseStyleStr = parentSpacingId ? String(parentSection.getAttribute("style") || "") : "";
    const baseSpacingValue = parentSpacingId ? parseEditableSpacingValue(baseClassName, baseStyleStr) : createEmptySpacingValue();

    if (activeLayoutEditor.spacingId) {
      applySpacingPreviewToTarget(activeLayoutEditor.spacingId, activeLayoutEditor.baseSpacing);
    }
    setSpacingDraft(baseSpacingValue);
    setActiveLayoutEditor({
      left: Number.isFinite(nextLeft) ? nextLeft : 8,
      top: Number.isFinite(nextTop) ? nextTop : 8,
      label: sectionRef?.label || "Section",
      targetKind: "section",
      targetTagName: sectionRef?.tagName || null,
      layoutId: null,
      slotId: null,
      sectionId,
      sectionCount: sectionIndexRef.current.length,
      sectionIndex: idx,
      spacingId: parentSpacingId,
      baseClassName,
      baseStyleStr,
      baseSpacing: baseSpacingValue,
      isElement: false,
      isLayout: false,
      isSlot: false,
      canInsertInside: false,
      isFirstSibling: true,
      isLastSibling: true,
      isEmptyElement: false,
      mediaTarget: null,
    });
    setHoveredLayoutId(parentSpacingId || sectionId);
  }, [activeLayoutEditor, applySpacingPreviewToTarget]);

  const handleInputCapture = () => {
    return;
  };

  const handleBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;
    const nextTarget = event.relatedTarget as HTMLElement | null;
    const movingToEditor = Boolean(nextTarget?.closest("[data-massic-text-editor='true']"));
    if (!movingToEditor) {
      isEditorFocusedRef.current = false;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    }
  };

  const handleFocusCapture = () => {
    return;
  };

  const handlePasteCapture = () => {
    return;
  };

  const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
      if (undoStackRef.current.length > 0) {
        event.preventDefault();
        handleUndo();
        return;
      }
    }

    if (previewEditMode === "layout") {
      if (activeLayoutEditor && event.key === "Escape") {
        event.preventDefault();
        cancelActiveLayoutEditor();
      }
      if (activeLayoutEditor?.sectionId && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        handleDeleteSection(activeLayoutEditor.sectionId);
      }
      return;
    }

    if (activeLinkEditor && event.key === "Escape") {
      event.preventDefault();
      closeActiveLinkEditor();
      return;
    }
    if (activeMediaEditor && event.key === "Escape") {
      event.preventDefault();
      closeActiveMediaEditor();
      return;
    }
    if (activeTextEditor && event.key === "Escape") {
      event.preventDefault();
      closeActiveTextEditor();
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
          <Card className="p-0">
            <div className="sticky top-0 z-30 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Typography variant="muted" className="text-xs max-w-[50%]">
                  {previewEditMode === "text"
                    ? "Text + link editing. Click text to edit, click links to change URLs."
                    : "Layout mode. Click any section or container to adjust spacing, move, or insert blocks."}
                </Typography>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center rounded-md border border-border p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={previewEditMode === "text" ? "default" : "ghost"}
                      className="h-7 px-2 text-xs"
                      onClick={() => setPreviewEditMode("text")}
                    >
                      Text
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={previewEditMode === "layout" ? "default" : "ghost"}
                      className="h-7 px-2 text-xs"
                      onClick={() => setPreviewEditMode("layout")}
                    >
                      Layout
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => handleOpenInsertDialog(null)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Insert
                  </Button>
                  <div className="h-4 w-px bg-border" />
                  <div className="inline-flex items-center gap-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={handleUndo}
                      disabled={!undoStackRef.current.length}
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={handleRedo}
                      disabled={!redoStackRef.current.length}
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className={cn(
                      "h-7 gap-1 px-2.5 text-xs",
                      isDirty && "animate-pulse"
                    )}
                    onClick={() => void handleManualSave()}
                    disabled={!isDirty || isSaving}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isSaving ? "Saving..." : isDirty ? "Save" : "Saved"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="relative p-4 pt-3">
              <div
                ref={previewContainerRef}
                className={cn(
                  "massic-html-preview min-h-[420px] overflow-auto rounded-md border bg-background p-4",
                  previewEditMode === "text" && "massic-mode-text",
                  previewEditMode === "layout" && "massic-mode-layout"
                )}
                style={previewStyleVars}
                onMouseDownCapture={handlePreviewMouseDownCapture}
                onClickCapture={handlePreviewClickCapture}
                onAuxClickCapture={handlePreviewAuxClickCapture}
                onMouseMoveCapture={handlePreviewMouseMoveCapture}
                onMouseLeave={handlePreviewMouseLeaveCapture}
                onInputCapture={handleInputCapture}
                onBlurCapture={handleBlurCapture}
                onFocusCapture={handleFocusCapture}
                onPasteCapture={handlePasteCapture}
                onKeyDownCapture={handleKeyDownCapture}
              />
              {previewEditMode === "text" && activeTextEditor && !activeLinkEditor && !activeMediaEditor ? (
                <div
                  data-massic-text-editor="true"
                  className="absolute z-20 rounded-lg border bg-background p-4 shadow-2xl"
                  style={{
                    top: textEditorTop,
                    left: textEditorLeft,
                    width: textEditorPanelWidth,
                    maxWidth: "calc(100% - 16px)",
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Typography className="text-sm font-semibold">Edit {activeTextEditor.label}</Typography>
                        <Typography className="text-[11px] text-muted-foreground">
                          Update the text and apply block-level styling.
                        </Typography>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        onClick={closeActiveTextEditor}
                      >
                        Cancel
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <Typography className="text-[11px] font-medium text-muted-foreground">Text</Typography>
                      <Textarea
                        ref={textEditorTextareaRef}
                        value={activeTextEditor.text}
                        onChange={(event) => setActiveTextEditor((current) => current ? { ...current, text: event.target.value } : current)}
                        className="min-h-[140px] text-sm"
                        placeholder={`Edit ${activeTextEditor.label.toLowerCase()} text`}
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Typography className="text-[11px] font-medium text-muted-foreground">Formatting</Typography>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={activeTextEditor.style.bold ? "default" : "outline"}
                            className="h-8 px-3 text-xs font-bold"
                            onClick={() => updateActiveTextStyle({ bold: !activeTextEditor.style.bold })}
                          >
                            Bold
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={activeTextEditor.style.italic ? "default" : "outline"}
                            className="h-8 px-3 text-xs italic"
                            onClick={() => updateActiveTextStyle({ italic: !activeTextEditor.style.italic })}
                          >
                            Italic
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={activeTextEditor.style.underline ? "default" : "outline"}
                            className="h-8 px-3 text-xs underline"
                            onClick={() => updateActiveTextStyle({ underline: !activeTextEditor.style.underline })}
                          >
                            Underline
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={activeTextEditor.style.strike ? "default" : "outline"}
                            className="h-8 px-3 text-xs line-through"
                            onClick={() => updateActiveTextStyle({ strike: !activeTextEditor.style.strike })}
                          >
                            Strike
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Typography className="text-[11px] font-medium text-muted-foreground">Alignment</Typography>
                        <div className="flex flex-wrap gap-2">
                          {(["left", "center", "right"] as const).map((align) => (
                            <Button
                              key={align}
                              type="button"
                              size="sm"
                              variant={activeTextEditor.style.align === align ? "default" : "outline"}
                              className="h-8 px-3 text-xs capitalize"
                              onClick={() => updateActiveTextStyle({ align })}
                            >
                              {align}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Typography className="text-[11px] font-medium text-muted-foreground">Line Height</Typography>
                        <Input
                          value={activeTextEditor.style.lineHeight}
                          onChange={(event) => updateActiveTextStyle({ lineHeight: event.target.value })}
                          placeholder="1.6"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Typography className="text-[11px] font-medium text-muted-foreground">Letter Spacing</Typography>
                        <Input
                          value={activeTextEditor.style.letterSpacing}
                          onChange={(event) => updateActiveTextStyle({ letterSpacing: event.target.value })}
                          placeholder="0.02em"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={closeActiveTextEditor}
                      >
                        Close
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={handleSaveActiveTextEditor}
                      >
                        Save Text
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              {previewEditMode === "text" && activeLinkEditor ? (
                <div
                  data-massic-link-editor="true"
                  className="absolute z-20 w-[300px] rounded-md border bg-background p-3 shadow-lg"
                  style={{
                    top: activeLinkEditor.top,
                    left: activeLinkEditor.left,
                  }}
                >
                  <div className="space-y-2">
                    <Typography className="text-xs font-medium">Edit Link</Typography>
                    <Typography className="text-[11px] text-muted-foreground break-words">
                      {activeLinkEditor.label}
                    </Typography>
                    <Input
                      value={linkLabelDraft}
                      onChange={(event) => setLinkLabelDraft(event.target.value)}
                      placeholder="Button or link text"
                      className="h-8"
                    />
                    <Input
                      value={linkHrefDraft}
                      onChange={(event) => {
                        setLinkHrefDraft(event.target.value);
                        if (linkHrefError) {
                          setLinkHrefError(null);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleSaveActiveLinkHref();
                        }
                      }}
                      placeholder="https://example.com"
                      className="h-8"
                      autoFocus
                    />
                    {linkHrefError ? (
                      <Typography className="text-[11px] text-destructive">{linkHrefError}</Typography>
                    ) : null}
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => void handleRemoveActiveLinkHref()}
                      >
                        Remove URL
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        onClick={closeActiveLinkEditor}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => void handleSaveActiveLinkHref()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              {previewEditMode === "text" && activeMediaEditor ? (
                <div
                  data-massic-media-editor="true"
                  className="absolute z-20 w-[300px] rounded-md border bg-background p-3 shadow-lg"
                  style={{
                    top: activeMediaEditor.top,
                    left: activeMediaEditor.left,
                  }}
                >
                  <div className="space-y-2">
                    <Typography className="text-xs font-medium">{activeMediaEditor.label}</Typography>
                    <MediaEditorPanel
                      media={activeMediaEditor.media}
                      onUpdate={handleUpdateActiveMedia}
                      onCancel={closeActiveMediaEditor}
                    />
                  </div>
                </div>
              ) : null}
              {previewEditMode === "layout" && activeLayoutEditor ? (
                <LayoutPanel
                  label={activeLayoutEditor.label}
                  top={activeLayoutEditor.top}
                  left={activeLayoutEditor.left}
                  targetKind={activeLayoutEditor.targetKind}
                  isSection={activeLayoutEditor.targetKind === "section" && !!activeLayoutEditor.sectionId}
                  isFirst={activeLayoutEditor.sectionIndex === 0}
                  isLast={activeLayoutEditor.sectionIndex === activeLayoutEditor.sectionCount - 1}
                  onMoveUp={() => activeLayoutEditor.sectionId && handleMoveSection(activeLayoutEditor.sectionId, "up")}
                  onMoveDown={() => activeLayoutEditor.sectionId && handleMoveSection(activeLayoutEditor.sectionId, "down")}
                  onDuplicate={() => activeLayoutEditor.sectionId && handleDuplicateSection(activeLayoutEditor.sectionId)}
                  onDelete={() => activeLayoutEditor.sectionId && handleDeleteSection(activeLayoutEditor.sectionId)}
                  onInsertAbove={() => activeLayoutEditor.sectionId && handleOpenInsertDialog({ kind: "section", sectionId: activeLayoutEditor.sectionId, position: "before" })}
                  onInsertBelow={() => activeLayoutEditor.sectionId && handleOpenInsertDialog({ kind: "section", sectionId: activeLayoutEditor.sectionId, position: "after" })}
                  hasParentSection={(activeLayoutEditor.isElement || activeLayoutEditor.isLayout || activeLayoutEditor.isSlot) && !!activeLayoutEditor.sectionId}
                  onSelectParentSection={handleSelectParentSection}
                  isElement={activeLayoutEditor.isElement}
                  isLayout={activeLayoutEditor.isLayout}
                  isSlot={activeLayoutEditor.isSlot}
                  canInsertInside={activeLayoutEditor.canInsertInside}
                  isFirstSibling={activeLayoutEditor.isFirstSibling}
                  isLastSibling={activeLayoutEditor.isLastSibling}
                  isEmptyElement={activeLayoutEditor.isEmptyElement}
                  onMoveElementUp={() => activeLayoutEditor.spacingId && handleMoveElement(activeLayoutEditor.spacingId, "up")}
                  onMoveElementDown={() => activeLayoutEditor.spacingId && handleMoveElement(activeLayoutEditor.spacingId, "down")}
                  onDuplicateElement={() => activeLayoutEditor.spacingId && handleDuplicateElement(activeLayoutEditor.spacingId)}
                  onDeleteElement={() => activeLayoutEditor.spacingId && handleDeleteElement(activeLayoutEditor.spacingId)}
                  onInsertInside={() => activeLayoutEditor.spacingId && handleOpenInsertDialog({ kind: "element", spacingId: activeLayoutEditor.spacingId, position: "inside" })}
                  onInsertBeforeSibling={() => activeLayoutEditor.spacingId && handleOpenInsertDialog({ kind: "element", spacingId: activeLayoutEditor.spacingId, position: "before" })}
                  onInsertAfterSibling={() => activeLayoutEditor.spacingId && handleOpenInsertDialog({ kind: "element", spacingId: activeLayoutEditor.spacingId, position: "after" })}
                  onInsertLeft={() => activeLayoutEditor.spacingId && handleOpenInsertDialog({ kind: "wrap-grid", spacingId: activeLayoutEditor.spacingId, side: "left" })}
                  onInsertRight={() => activeLayoutEditor.spacingId && handleOpenInsertDialog({ kind: "wrap-grid", spacingId: activeLayoutEditor.spacingId, side: "right" })}
                  onInsertIntoSlot={() => activeLayoutEditor.slotId && handleOpenInsertDialog({ kind: "slot", slotId: activeLayoutEditor.slotId })}
                  onDeleteSlot={() => activeLayoutEditor.slotId && handleDeleteSlot(activeLayoutEditor.slotId)}
                  onCollapseLayout={() => activeLayoutEditor.spacingId && handleCollapseLayout(activeLayoutEditor.spacingId)}
                  mediaTarget={activeLayoutEditor.mediaTarget}
                  onMediaUpdate={(updates) => {
                    if (activeLayoutEditor.spacingId && activeLayoutEditor.mediaTarget) {
                      handleUpdateMedia(activeLayoutEditor.spacingId, activeLayoutEditor.mediaTarget, updates);
                    }
                  }}
                  spacingDraft={spacingDraft}
                  onSpacingDraftChange={setSpacingDraft}
                  onApplySpacing={() => void handleApplySpacingForActiveTarget()}
                  onResetSpacing={() => void handleResetSpacingForActiveTarget()}
                  onCancelSpacing={cancelActiveLayoutEditor}
                />
              ) : null}
            </div>
            <InsertBlockDialog
              open={insertDialogOpen}
              onOpenChange={setInsertDialogOpen}
              onInsert={handleInsertBlock}
              mode={
                (insertAnchor?.kind === "element" && insertAnchor.position === "inside") || insertAnchor?.kind === "wrap-grid" || insertAnchor?.kind === "slot"
                  ? "inner"
                  : "section"
              }
            />
            <style>{`
              ${previewMassicVarCss}
              .massic-html-preview .massic-text-editable {
                border-radius: 4px;
                outline: none;
                transition: background-color 120ms ease, box-shadow 120ms ease;
              }
              .massic-html-preview a[data-massic-link-id] {
                cursor: pointer;
                position: relative;
                transition: box-shadow 120ms ease, background-color 120ms ease, color 120ms ease;
              }
              .massic-html-preview.massic-mode-text .massic-text-editable {
                cursor: pointer;
                position: relative;
                border-radius: 4px;
                transition: box-shadow 120ms ease, background-color 120ms ease;
              }
              .massic-html-preview.massic-mode-text [data-massic-media-editable] {
                cursor: pointer;
                position: relative;
                transition: box-shadow 120ms ease, background-color 120ms ease, transform 120ms ease;
              }
              .massic-html-preview a[data-massic-link-id]:hover,
              .massic-html-preview a[data-massic-link-id]:focus-visible {
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 12%, transparent);
                box-shadow: 0 0 0 1px color-mix(in srgb, var(--massic-primary, #2E6A56) 35%, transparent);
                border-radius: 4px;
                outline: none;
              }
              .massic-html-preview.massic-mode-text [data-massic-media-editable]:hover,
              .massic-html-preview.massic-mode-text [data-massic-media-editable]:focus-visible {
                box-shadow: 0 0 0 2px color-mix(in srgb, var(--massic-primary, #2E6A56) 40%, transparent);
              }
              .massic-html-preview.massic-mode-text .massic-text-editable:hover {
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 8%, transparent);
                box-shadow: 0 0 0 1px color-mix(in srgb, var(--massic-primary, #2E6A56) 32%, transparent);
              }
              .massic-html-preview.massic-mode-text a[data-massic-link-id] .massic-text-editable:hover {
                background: transparent;
                box-shadow: none;
              }
              .massic-html-preview a[data-massic-link-id]:hover::after,
              .massic-html-preview a[data-massic-link-id]:focus-visible::after {
                content: "Click to edit link";
                position: absolute;
                left: 0;
                bottom: calc(100% + 4px);
                z-index: 5;
                padding: 2px 6px;
                border-radius: 999px;
                background: #111827;
                color: #ffffff;
                font-size: 10px;
                line-height: 1.2;
                white-space: nowrap;
                pointer-events: none;
              }
              .massic-html-preview.massic-mode-text [data-massic-media-editable]:hover::after,
              .massic-html-preview.massic-mode-text [data-massic-media-editable]:focus-visible::after {
                content: attr(data-massic-edit-hint);
                position: absolute;
                left: 0;
                bottom: calc(100% + 4px);
                z-index: 5;
                padding: 2px 6px;
                border-radius: 999px;
                background: #111827;
                color: #ffffff;
                font-size: 10px;
                line-height: 1.2;
                white-space: nowrap;
                pointer-events: none;
              }
              .massic-html-preview.massic-mode-text .massic-text-editable:hover::after {
                content: "Edit text";
                position: absolute;
                left: 0;
                bottom: calc(100% + 4px);
                z-index: 5;
                padding: 2px 6px;
                border-radius: 999px;
                background: #111827;
                color: #ffffff;
                font-size: 10px;
                line-height: 1.2;
                white-space: nowrap;
                pointer-events: none;
              }
              .massic-html-preview.massic-mode-text a[data-massic-link-id] .massic-text-editable:hover::after {
                content: none;
              }
              .massic-html-preview.massic-mode-layout .massic-text-editable {
                pointer-events: none;
              }
              .massic-html-preview.massic-mode-layout a[data-massic-link-id]:hover::after,
              .massic-html-preview.massic-mode-layout a[data-massic-link-id]:focus-visible::after {
                content: none;
              }
              .massic-html-preview .massic-layout.massic-grid,
              .massic-html-preview .massic-grid {
                display: grid !important;
                gap: var(--massic-s5) !important;
              }
              .massic-html-preview .massic-layout.massic-grid.cols-2,
              .massic-html-preview .massic-grid.cols-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
              .massic-html-preview .massic-layout.massic-grid.cols-3,
              .massic-html-preview .massic-grid.cols-3 {
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              }
              .massic-html-preview .massic-layout.massic-grid.cols-4,
              .massic-html-preview .massic-grid.cols-4 {
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              }
              .massic-html-preview .massic-layout > .massic-slot,
              .massic-html-preview .massic-grid > .massic-slot,
              .massic-html-preview .massic-grid > *,
              .massic-html-preview .massic-split > * {
                min-width: 0;
              }
              .massic-html-preview .massic-split {
                display: grid !important;
                gap: var(--massic-s6) !important;
                align-items: center;
                grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr) !important;
              }
              /* Responsive collapse removed from preview – inline styles on elements
                 guarantee the correct grid-template-columns regardless of viewport size. */
              .massic-html-preview.massic-mode-layout [data-massic-spacing-id],
              .massic-html-preview.massic-mode-layout [data-massic-section-id],
              .massic-html-preview.massic-mode-layout [data-massic-slot-id] {
                position: relative;
                cursor: pointer;
                outline: 1px dashed transparent;
                outline-offset: 2px;
                transition: outline-color 120ms ease, background-color 120ms ease;
              }
              .massic-html-preview.massic-mode-layout [data-massic-slot-id] {
                min-height: 72px;
              }
              .massic-html-preview.massic-mode-layout [data-massic-slot-empty='true'] {
                background:
                  repeating-linear-gradient(
                    135deg,
                    color-mix(in srgb, var(--massic-primary, #2E6A56) 4%, transparent),
                    color-mix(in srgb, var(--massic-primary, #2E6A56) 4%, transparent) 10px,
                    transparent 10px,
                    transparent 20px
                  );
              }
              .massic-html-preview.massic-mode-layout [data-massic-section-id] {
                outline-width: 2px;
                outline-offset: 4px;
              }
              .massic-html-preview.massic-mode-layout [data-massic-layout-hovered='true'] {
                outline-color: color-mix(in srgb, var(--massic-primary, #2E6A56) 40%, transparent);
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 5%, transparent);
              }
              .massic-html-preview.massic-mode-layout [data-massic-layout-id]::before,
              .massic-html-preview.massic-mode-layout [data-massic-layout-id]::after,
              .massic-html-preview.massic-mode-layout .massic-grid::before,
              .massic-html-preview.massic-mode-layout .massic-grid::after,
              .massic-html-preview.massic-mode-layout .massic-split::before,
              .massic-html-preview.massic-mode-layout .massic-split::after {
                display: none !important;
              }
              .massic-html-preview.massic-mode-layout [data-massic-layout-selected='true'] {
                outline-color: color-mix(in srgb, var(--massic-primary, #2E6A56) 70%, transparent);
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 8%, transparent);
              }
              .massic-html-preview.massic-mode-layout [data-massic-section-id] + [data-massic-section-id] {
                margin-top: 4px;
              }
              .massic-html-preview.massic-mode-layout [data-massic-section-id] + [data-massic-section-id]::before {
                content: "";
                display: block;
                height: 2px;
                margin: -3px 24px 4px;
                border-radius: 1px;
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 15%, transparent);
                transition: background-color 150ms ease;
              }
              .massic-html-preview .massic-video-wrap {
                position: relative;
                width: 100%;
                aspect-ratio: 16 / 9;
                overflow: hidden;
                border-radius: 8px;
              }
              .massic-html-preview .massic-video-wrap iframe {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: 0;
              }
              .massic-html-preview .massic-video-wrap iframe,
              .massic-html-preview iframe {
                pointer-events: none;
                will-change: transform;
              }
              .massic-html-preview .massic-video-wrap,
              .massic-html-preview [data-massic-media-hint-wrap] {
                isolation: isolate;
              }
            `}</style>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
