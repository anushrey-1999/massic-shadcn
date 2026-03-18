"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Copy,
  Paintbrush,
  Pencil,
  Plus,
  Undo2,
  Redo2,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { resolvePageContent } from "@/utils/page-content-resolver";
import { api } from "@/hooks/use-api";
import { ensureMassicContentWrapper } from "@/utils/page-content-format";
import {
  applySpacingEditsToHtml,
  applyLinkEditsToHtml,
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
  deleteElementBySpacingId,
  duplicateElementBySpacingId,
  moveElementBySpacingId,
  insertInsideElementBySpacingId,
  insertAdjacentToElementBySpacingId,
  getElementSiblingInfo,
  wrapElementWithSiblingGrid,
  getMediaInfoFromElement,
  updateMediaInElementBySpacingId,
  type EditableLinkRef,
  type EditableSectionRef,
  type EditableSpacingRef,
  type EditableSpacingValue,
  type EditableTextNodeRef,
  type MediaElementInfo,
} from "@/utils/page-html-editor";
import { buildStyledMassicHtml, getMassicCssText } from "@/utils/massic-html-copy";
import { useWebActionContentQuery } from "@/hooks/use-web-page-actions";
import { LayoutPanel } from "@/components/ui/layout-panel";
import { InsertBlockDialog } from "@/components/ui/insert-block-dialog";

const GrapesEditor = dynamic(
  () => import("./web-page-grapes-editor").then((m) => m.WebPageGrapesEditor),
  { ssr: false }
);

type EditorTab = "simple" | "visual";
type SaveReason = "debounce" | "blur" | "unmount";
type ActiveLinkEditorState = {
  id: string;
  top: number;
  left: number;
  label: string;
};
type PreviewEditMode = "text" | "layout";
type ActiveLayoutEditorState = {
  top: number;
  left: number;
  label: string;
  sectionId: string | null;
  sectionCount: number;
  sectionIndex: number;
  spacingId: string | null;
  baseClassName: string;
  baseStyleStr: string;
  baseSpacing: EditableSpacingValue;
  isElement: boolean;
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
  kind: "wrap-grid";
  spacingId: string;
  side: "left" | "right";
} | null;

function isEditableSpan(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && Boolean(target.dataset.massicTextId);
}

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

  const [editorTab, setEditorTab] = React.useState<EditorTab>("simple");
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
  const [linkHrefError, setLinkHrefError] = React.useState<string | null>(null);
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
  const sectionIndexRef = React.useRef<EditableSectionRef[]>([]);
  const undoStackRef = React.useRef<string[]>([]);
  const redoStackRef = React.useRef<string[]>([]);
  const editsRef = React.useRef<Record<string, string>>({});
  const linkEditsRef = React.useRef<Record<string, string>>({});
  const spacingEditsRef = React.useRef<Record<string, EditableSpacingValue>>({});
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

  const cssVarOverrides: Record<string, string> = {};
  const previewStyleVars: React.CSSProperties = {};
  const previewMassicVarCss = "";

  const status = (data?.status || "").toString().toLowerCase();
  const isProcessing = status === "pending" || status === "processing";
  const hasFinalContent = canonicalizeHtml(sourceHtmlRef.current).length > 0;


  const composeCurrentHtml = React.useCallback(() => {
    const mergedText = applyTextEditsToHtml(sourceHtmlRef.current, textNodeIndexRef.current, editsRef.current);
    const mergedLinks = applyLinkEditsToHtml(mergedText, linkIndexRef.current, linkEditsRef.current);
    const mergedSpacing = applySpacingEditsToHtml(mergedLinks, spacingIndexRef.current, spacingEditsRef.current);
    return ensureMassicContentWrapper(sanitizePageHtml(mergedSpacing));
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
        if (
          !isEditorFocusedRef.current &&
          Object.keys(editsRef.current).length === 0 &&
          Object.keys(linkEditsRef.current).length === 0 &&
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
    const hasPendingEdits =
      Object.keys(editsRef.current).length > 0 ||
      Object.keys(linkEditsRef.current).length > 0 ||
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
    sectionIndexRef.current = model.sectionIndex;
    editsRef.current = {};
    linkEditsRef.current = {};
    spacingEditsRef.current = {};
    lastSavedHtmlRef.current = canonicalizeHtml(sanitized);
    setTextNodeIndex(model.textNodeIndex);
    setPreviewHtml(model.previewHtml);
    setActiveLinkEditor(null);
    setLinkHrefDraft("");
    setLinkHrefError(null);
    setActiveLayoutEditor(null);
    setSpacingDraft(createEmptySpacingValue());
    setHoveredLayoutId(null);

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

  const closeActiveLayoutEditor = React.useCallback(() => {
    setActiveLayoutEditor(null);
    setSpacingDraft(createEmptySpacingValue());
    setHoveredLayoutId(null);
    isEditorFocusedRef.current = false;
    if (
      !Object.keys(editsRef.current).length &&
      !Object.keys(linkEditsRef.current).length &&
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
    setLinkHrefError(null);
    isEditorFocusedRef.current = false;
    if (
      !Object.keys(editsRef.current).length &&
      !Object.keys(linkEditsRef.current).length &&
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
    const activeSectionId = activeLayoutEditor?.sectionId;
    const targetId = activeSpacingId || activeSectionId;
    if (!targetId) return;

    const attr = activeSpacingId ? "data-massic-spacing-id" : "data-massic-section-id";
    const nextActive = container.querySelector(`[${attr}="${targetId}"]`) as HTMLElement | null;
    if (!nextActive) return;
    nextActive.setAttribute("data-massic-layout-selected", "true");
  }, [activeLayoutEditor?.spacingId, activeLayoutEditor?.sectionId, previewEditMode, previewHtml]);

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
    const sectionEl = container.querySelector(`[data-massic-section-id="${hoveredLayoutId}"]`) as HTMLElement | null;
    const nextHovered = spacingEl || sectionEl;
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

  const handlePreviewClickCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest("[data-massic-link-editor='true']")) {
      return;
    }
    if (target.closest("[data-massic-section-editor='true']")) {
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
      const sectionTarget = getEditableSectionElement(target);
      const primaryTarget = spacingTarget || sectionTarget;
      if (!primaryTarget) {
        if (activeLayoutEditor) cancelActiveLayoutEditor();
        return;
      }

      const spacingId = spacingTarget?.dataset.massicSpacingId || null;
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
      const sectionRef = sectionId ? sectionIndexRef.current.find((item) => item.id === sectionId) : undefined;
      const idx = sectionId ? sectionIndexRef.current.findIndex((item) => item.id === sectionId) : -1;

      const isElement = !!spacingId && (spacingTarget !== sectionTarget);

      let label: string;
      if (isElement) {
        label = resolveSpacingLabel(spacingRef);
      } else if (sectionRef) {
        label = sectionRef.label;
      } else {
        label = resolveSpacingLabel(spacingRef);
      }
      const siblingInfo = isElement && spacingId
        ? getElementSiblingInfo(sourceHtmlRef.current, spacingId)
        : { isFirst: true, isLast: true, siblingCount: 1, isEmpty: false };

      const mediaTarget = spacingTarget && target
        ? getMediaInfoFromElement(spacingTarget as HTMLElement, target as HTMLElement)
        : null;

      setSpacingDraft(baseSpacingValue);
      setActiveLayoutEditor({
        left: Number.isFinite(nextLeft) ? nextLeft : 8,
        top: Number.isFinite(nextTop) ? nextTop : 8,
        label,
        sectionId,
        sectionCount: sectionIndexRef.current.length,
        sectionIndex: idx,
        spacingId,
        baseClassName,
        baseStyleStr,
        baseSpacing: baseSpacingValue,
        isElement,
        isFirstSibling: siblingInfo.isFirst,
        isLastSibling: siblingInfo.isLast,
        isEmptyElement: siblingInfo.isEmpty,
        mediaTarget,
      });
      setHoveredLayoutId(spacingId || sectionId);
      isEditorFocusedRef.current = true;
      isEditingSessionRef.current = true;
      if (!pollingDisabled) setPollingDisabled(true);
      return;
    }

    const anchor = getEditableLinkElement(target);
    if (!anchor) {
      if (activeLinkEditor) {
        closeActiveLinkEditor();
      }
      return;
    }

    const linkId = anchor.dataset.massicLinkId;
    if (!linkId || !previewContainerRef.current) return;

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

    setActiveLinkEditor({
      id: linkId,
      left: Number.isFinite(nextLeft) ? nextLeft : 8,
      top: Number.isFinite(nextTop) ? nextTop : 8,
      label: linkRef?.label || (anchor.textContent || "").trim() || "Link",
    });
    setLinkHrefDraft(currentHref);
    setLinkHrefError(null);
    isEditorFocusedRef.current = true;
    isEditingSessionRef.current = true;
    if (!pollingDisabled) {
      setPollingDisabled(true);
    }
  }, [
    activeLinkEditor,
    activeLayoutEditor,
    closeActiveLinkEditor,
    cancelActiveLayoutEditor,
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
    const lockedId = activeLayoutEditor?.spacingId || activeLayoutEditor?.sectionId;
    if (lockedId) {
      setHoveredLayoutId((prev) => (prev === lockedId ? prev : lockedId));
      return;
    }
    const spacingTarget = getEditableSpacingElement(event.target);
    const sectionTarget = getEditableSectionElement(event.target);
    const nextId = spacingTarget?.dataset.massicSpacingId || sectionTarget?.dataset.massicSectionId || null;
    setHoveredLayoutId((prev) => (prev === nextId ? prev : nextId));
  }, [activeLayoutEditor?.spacingId, activeLayoutEditor?.sectionId, previewEditMode]);

  const handlePreviewMouseLeaveCapture = React.useCallback(() => {
    if (previewEditMode !== "layout") return;
    const lockedId = activeLayoutEditor?.spacingId || activeLayoutEditor?.sectionId;
    if (lockedId) {
      setHoveredLayoutId((prev) => (prev === lockedId ? prev : lockedId));
      return;
    }
    setHoveredLayoutId(null);
  }, [activeLayoutEditor?.spacingId, activeLayoutEditor?.sectionId, previewEditMode]);

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

  const saveActiveLinkHref = React.useCallback(async (nextHrefInput: string) => {
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

    if (previewContainerRef.current) {
      const selector = `a[data-massic-link-id="${active.id}"]`;
      const linkEl = previewContainerRef.current.querySelector(selector) as HTMLAnchorElement | null;
      if (linkEl) {
        if (normalizedHref) {
          linkEl.setAttribute("href", normalizedHref);
        } else {
          linkEl.removeAttribute("href");
        }
      }
    }

    setLinkHrefDraft(normalizedHref);
    setLinkHrefError(null);
    closeActiveLinkEditor();
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    setIsDirty(true);
  }, [activeLinkEditor, closeActiveLinkEditor]);

  const handleSaveActiveLinkHref = React.useCallback(async () => {
    await saveActiveLinkHref(linkHrefDraft);
  }, [linkHrefDraft, saveActiveLinkHref]);

  const handleRemoveActiveLinkHref = React.useCallback(async () => {
    await saveActiveLinkHref("");
  }, [saveActiveLinkHref]);

  const rebuildModelFromSource = React.useCallback((html: string) => {
    const sanitized = ensureMassicContentWrapper(sanitizePageHtml(html));
    sourceHtmlRef.current = sanitized;
    const model = buildEditableHtmlModel(sanitized);
    textNodeIndexRef.current = model.textNodeIndex;
    linkIndexRef.current = model.linkIndex;
    spacingIndexRef.current = model.spacingIndex;
    sectionIndexRef.current = model.sectionIndex;
    editsRef.current = {};
    linkEditsRef.current = {};
    spacingEditsRef.current = {};
    setTextNodeIndex(model.textNodeIndex);
    setPreviewHtml(model.previewHtml);
    setActiveLayoutEditor(null);
    setHoveredLayoutId(null);
    return sanitized;
  }, []);

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
    setIsSaving(true);
    try {
      await updatePageContentRequest(nextHtml);
      sourceHtmlRef.current = nextHtml;
      lastSavedHtmlRef.current = canonicalizeHtml(nextHtml);
      lastCommittedHtmlRef.current = canonicalizeHtml(nextHtml);
      editsRef.current = {};
      linkEditsRef.current = {};
      spacingEditsRef.current = {};
      hasLocalEditsRef.current = false;
      setIsDirty(false);

      const committedModel = buildEditableHtmlModel(nextHtml);
      textNodeIndexRef.current = committedModel.textNodeIndex;
      linkIndexRef.current = committedModel.linkIndex;
      spacingIndexRef.current = committedModel.spacingIndex;
      sectionIndexRef.current = committedModel.sectionIndex;
      setTextNodeIndex(committedModel.textNodeIndex);
      setPreviewHtml(committedModel.previewHtml);

      toast.success("Changes saved");
      window.setTimeout(() => { void runBackgroundRefetch(); }, 500);
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [composeCurrentHtml, runBackgroundRefetch, updatePageContentRequest]);

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

  const executeSectionMutation = React.useCallback(
    (mutatedHtml: string) => {
      const sanitized = ensureMassicContentWrapper(sanitizePageHtml(mutatedHtml));
      sourceHtmlRef.current = sanitized;
      const model = buildEditableHtmlModel(sanitized);
      textNodeIndexRef.current = model.textNodeIndex;
      linkIndexRef.current = model.linkIndex;
      spacingIndexRef.current = model.spacingIndex;
      sectionIndexRef.current = model.sectionIndex;
      editsRef.current = {};
      linkEditsRef.current = {};
      spacingEditsRef.current = {};
      setTextNodeIndex(model.textNodeIndex);
      setPreviewHtml(model.previewHtml);
      setActiveLayoutEditor(null);
      setHoveredLayoutId(null);

      hasLocalEditsRef.current = true;
      isEditingSessionRef.current = true;
      if (!pollingDisabled) setPollingDisabled(true);
      setIsDirty(true);
    },
    [pollingDisabled]
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
        result = wrapElementWithSiblingGrid(sourceHtmlRef.current, spacingId, side, blockHtml);
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
      const result = deleteElementBySpacingId(sourceHtmlRef.current, spacingId);
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

  const handleSelectParentSection = React.useCallback(() => {
    if (!activeLayoutEditor || !previewContainerRef.current) return;
    const spacingId = activeLayoutEditor.spacingId;
    if (!spacingId) return;
    const spacingEl = previewContainerRef.current.querySelector(
      `[data-massic-spacing-id="${spacingId}"]`
    ) as HTMLElement | null;
    if (!spacingEl) return;
    const parentSection = spacingEl.closest("[data-massic-section-id]") as HTMLElement | null;
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
      sectionId,
      sectionCount: sectionIndexRef.current.length,
      sectionIndex: idx,
      spacingId: parentSpacingId,
      baseClassName,
      baseStyleStr,
      baseSpacing: baseSpacingValue,
      isElement: false,
      isFirstSibling: true,
      isLastSibling: true,
      isEmptyElement: false,
      mediaTarget: null,
    });
    setHoveredLayoutId(parentSpacingId || sectionId);
  }, [activeLayoutEditor, applySpacingPreviewToTarget]);

  const handleInputCapture = (event: React.FormEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;
    if (!isEditableSpan(event.target)) return;
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    editsRef.current = updateEditFromElement(editsRef.current, event.target);
    if (!isDirty) setIsDirty(true);
  };

  const handleBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;
    if (!isEditableSpan(event.target)) return;
    editsRef.current = updateEditFromElement(editsRef.current, event.target);

    const nextTarget = event.relatedTarget as HTMLElement | null;
    const movingWithinEditable = Boolean(nextTarget?.dataset?.massicTextId);
    if (!movingWithinEditable) {
      isEditorFocusedRef.current = false;
      if (previewContainerRef.current) {
        setPreviewHtml(previewContainerRef.current.innerHTML);
      }
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    }
  };

  const handleFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;
    if (!isEditableSpan(event.target)) return;
    isEditorFocusedRef.current = true;
    isEditingSessionRef.current = true;
    if (!pollingDisabled) {
      setPollingDisabled(true);
    }
  };

  const handlePasteCapture = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;
    if (!isEditableSpan(event.target)) return;
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";
    insertPlainTextAtCursor(text);
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

    const anchorTarget = getAnyAnchorElement(event.target);
    if (anchorTarget && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

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
            <div className="inline-flex items-center rounded-md border border-border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={editorTab === "simple" ? "default" : "ghost"}
                className="h-7 gap-1.5 px-2 text-xs"
                onClick={() => setEditorTab("simple")}
              >
                <Pencil className="h-3 w-3" />
                Simple Editor
              </Button>
              <Button
                type="button"
                size="sm"
                variant={editorTab === "visual" ? "default" : "ghost"}
                className="h-7 gap-1.5 px-2 text-xs"
                onClick={() => setEditorTab("visual")}
              >
                <Paintbrush className="h-3 w-3" />
                Visual Builder
              </Button>
            </div>
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

        {!isProcessing && status !== "error" && editorTab === "visual" ? (
          <Card className="p-0 overflow-hidden" style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>
            <GrapesEditor
              html={sourceHtmlRef.current}
              cssUrl="/wp-css-component-library.css"
              onSave={async (html) => {
                try {
                  await updatePageContentRequest(html);
                  lastCommittedHtmlRef.current = canonicalizeHtml(html);
                  toast.success("Changes saved");
                  window.setTimeout(() => { void runBackgroundRefetch(); }, 500);
                } catch {
                  toast.error("Failed to save changes");
                }
              }}
            />
          </Card>
        ) : null}

        {!isProcessing && status !== "error" && editorTab === "simple" ? (
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
                onClickCapture={handlePreviewClickCapture}
                onAuxClickCapture={handlePreviewAuxClickCapture}
                onMouseMoveCapture={handlePreviewMouseMoveCapture}
                onMouseLeave={handlePreviewMouseLeaveCapture}
                onInputCapture={handleInputCapture}
                onBlurCapture={handleBlurCapture}
                onFocusCapture={handleFocusCapture}
                onPasteCapture={handlePasteCapture}
                onKeyDownCapture={handleKeyDownCapture}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
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
              {previewEditMode === "layout" && activeLayoutEditor ? (
                <LayoutPanel
                  label={activeLayoutEditor.label}
                  top={activeLayoutEditor.top}
                  left={activeLayoutEditor.left}
                  isSection={!!activeLayoutEditor.sectionId && !activeLayoutEditor.isElement}
                  isFirst={activeLayoutEditor.sectionIndex === 0}
                  isLast={activeLayoutEditor.sectionIndex === activeLayoutEditor.sectionCount - 1}
                  onMoveUp={() => activeLayoutEditor.sectionId && handleMoveSection(activeLayoutEditor.sectionId, "up")}
                  onMoveDown={() => activeLayoutEditor.sectionId && handleMoveSection(activeLayoutEditor.sectionId, "down")}
                  onDuplicate={() => activeLayoutEditor.sectionId && handleDuplicateSection(activeLayoutEditor.sectionId)}
                  onDelete={() => activeLayoutEditor.sectionId && handleDeleteSection(activeLayoutEditor.sectionId)}
                  onInsertAbove={() => activeLayoutEditor.sectionId && handleOpenInsertDialog({ kind: "section", sectionId: activeLayoutEditor.sectionId, position: "before" })}
                  onInsertBelow={() => activeLayoutEditor.sectionId && handleOpenInsertDialog({ kind: "section", sectionId: activeLayoutEditor.sectionId, position: "after" })}
                  hasParentSection={activeLayoutEditor.isElement && !!activeLayoutEditor.sectionId}
                  onSelectParentSection={handleSelectParentSection}
                  isElement={activeLayoutEditor.isElement}
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
                (insertAnchor?.kind === "element" && insertAnchor.position === "inside") || insertAnchor?.kind === "wrap-grid"
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
              .massic-html-preview a[data-massic-link-id]:hover,
              .massic-html-preview a[data-massic-link-id]:focus-visible {
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 12%, transparent);
                box-shadow: 0 0 0 1px color-mix(in srgb, var(--massic-primary, #2E6A56) 35%, transparent);
                border-radius: 4px;
                outline: none;
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
              .massic-html-preview .massic-text-editable:focus {
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 8%, transparent);
                box-shadow: 0 0 0 1px color-mix(in srgb, var(--massic-primary, #2E6A56) 35%, transparent);
              }
              .massic-html-preview.massic-mode-layout .massic-text-editable {
                pointer-events: none;
              }
              .massic-html-preview.massic-mode-layout a[data-massic-link-id]:hover::after,
              .massic-html-preview.massic-mode-layout a[data-massic-link-id]:focus-visible::after {
                content: none;
              }
              .massic-html-preview.massic-mode-layout [data-massic-spacing-id],
              .massic-html-preview.massic-mode-layout [data-massic-section-id] {
                position: relative;
                cursor: pointer;
                outline: 1px dashed transparent;
                outline-offset: 2px;
                transition: outline-color 120ms ease, background-color 120ms ease;
              }
              .massic-html-preview.massic-mode-layout [data-massic-section-id] {
                outline-width: 2px;
                outline-offset: 4px;
              }
              .massic-html-preview.massic-mode-layout [data-massic-layout-hovered='true'] {
                outline-color: color-mix(in srgb, var(--massic-primary, #2E6A56) 40%, transparent);
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 5%, transparent);
              }
              .massic-html-preview.massic-mode-layout [data-massic-layout-hovered='true']::after {
                content: "Click to edit layout";
                position: absolute;
                left: 6px;
                top: 6px;
                z-index: 5;
                padding: 2px 6px;
                border-radius: 999px;
                background: #111827;
                color: #ffffff;
                font-size: 10px;
                line-height: 1.2;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0.7;
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
                padding-bottom: 56.25%;
                height: 0;
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
            `}</style>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

