"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowUp,
  X,
  ChevronRight,
  Loader2,
  Check,
  Undo2,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RefineAction = "custom";

interface SelectionCoords {
  top: number;
  left: number;
  visible: boolean;
}

function findScrollParent(el: HTMLElement): HTMLElement {
  let parent = el.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (/(auto|scroll)/.test(style.overflow + style.overflowY)) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.documentElement;
}

function computeFixedCoords(
  range: Range | null,
  containerEl: HTMLElement,
  scrollParent: HTMLElement
): SelectionCoords | null {
  if (!range) return null;
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  const scrollRect = scrollParent.getBoundingClientRect();
  const stickyBar = scrollParent.querySelector<HTMLElement>(".sticky, [class*='sticky']");
  const stickyBottom = stickyBar
    ? stickyBar.getBoundingClientRect().bottom
    : scrollRect.top;

  const clampTop = Math.max(stickyBottom, scrollRect.top);
  const toolbarTop = rect.bottom + 8;
  const visible = rect.bottom > clampTop && rect.top < scrollRect.bottom;

  return {
    top: toolbarTop,
    left: rect.left + rect.width / 2,
    visible,
  };
}

function computeFixedCoordsFromSelection(
  containerEl: HTMLElement,
  scrollParent: HTMLElement
): SelectionCoords | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  return computeFixedCoords(sel.getRangeAt(0), containerEl, scrollParent);
}

function useDomSelectionPosition(containerRef: React.RefObject<HTMLElement | null>) {
  const [coords, setCoords] = React.useState<SelectionCoords | null>(null);
  const [hasSelection, setHasSelection] = React.useState(false);
  const [selectedText, setSelectedText] = React.useState("");
  const lockedRef = React.useRef(false);
  const lockedRangeRef = React.useRef<Range | null>(null);
  const scrollParentRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (container) {
      scrollParentRef.current = findScrollParent(container);
    }
  }, [containerRef]);

  const lock = React.useCallback(() => {
    lockedRef.current = true;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      lockedRangeRef.current = sel.getRangeAt(0);
    }
  }, []);

  const unlock = React.useCallback(() => {
    lockedRef.current = false;
    lockedRangeRef.current = null;
  }, []);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleSelectionChange = () => {
      if (lockedRef.current) return;

      const selection = window.getSelection();
      if (
        !selection ||
        selection.rangeCount === 0 ||
        selection.isCollapsed
      ) {
        setHasSelection(false);
        setCoords(null);
        setSelectedText("");
        return;
      }

      const range = selection.getRangeAt(0);
      if (
        !container.contains(range.startContainer) ||
        !container.contains(range.endContainer)
      ) {
        setHasSelection(false);
        setCoords(null);
        setSelectedText("");
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        setHasSelection(false);
        setCoords(null);
        setSelectedText("");
        return;
      }

      setSelectedText(text);
      setHasSelection(true);
      const sp = scrollParentRef.current || document.documentElement;
      setCoords(computeFixedCoordsFromSelection(container, sp));
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [containerRef]);

  React.useEffect(() => {
    if (!hasSelection) return;

    const updateCoordsOnScroll = () => {
      const container = containerRef.current;
      if (!container) return;
      const sp = scrollParentRef.current || document.documentElement;

      if (lockedRef.current && lockedRangeRef.current) {
        setCoords(computeFixedCoords(lockedRangeRef.current, container, sp));
      } else {
        setCoords(computeFixedCoordsFromSelection(container, sp));
      }
    };

    document.addEventListener("scroll", updateCoordsOnScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", updateCoordsOnScroll, { capture: true });
    };
  }, [hasSelection, containerRef]);

  return { coords, hasSelection, selectedText, lock, unlock };
}

// ─── Shared panel UI ─────────────────────────────────────────────────

interface RefineToolbarPanelProps {
  coords: SelectionCoords | null;
  hasSelection: boolean;
  isExpanded: boolean;
  onExpand: () => void;
  onClose: () => void;
  onRefine?: (
    action: RefineAction,
    customPrompt?: string
  ) => Promise<string | null | undefined> | string | null | undefined;
  onAccept?: (revisedText: string) => void | Promise<void>;
}

function RefineToolbarPanel({
  coords,
  hasSelection,
  isExpanded,
  onExpand,
  onClose,
  onRefine,
  onAccept,
}: RefineToolbarPanelProps) {
  const [promptValue, setPromptValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [refinedPreview, setRefinedPreview] = React.useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [lastPromptValue, setLastPromptValue] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const toolbarRef = React.useRef<HTMLDivElement>(null);

  const resetInner = React.useCallback(() => {
    setPromptValue("");
    setIsLoading(false);
    setRefinedPreview(null);
    setErrorMessage(null);
    setLastPromptValue("");
  }, []);

  React.useEffect(() => {
    if (!hasSelection && !isExpanded) {
      resetInner();
    }
  }, [hasSelection, isExpanded, resetInner]);

  React.useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      const toolbar = document.querySelector("[data-ai-refine-toolbar]");
      if (toolbar?.contains(e.target as Node)) return;
      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded, onClose]);

  const runRefine = React.useCallback(
    async (nextPrompt: string) => {
      const text = nextPrompt.trim();
      if (!text) return;

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const revisedText = (await onRefine?.("custom", text))?.trim();
        if (!revisedText) {
          throw new Error("AI could not refine the selected text.");
        }
        setLastPromptValue(text);
        setPromptValue(text);
        setRefinedPreview(revisedText);
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : "Failed to refine the selected text.";
        setRefinedPreview(null);
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [onRefine]
  );

  const handleSubmitPrompt = React.useCallback(() => {
    void runRefine(promptValue);
  }, [promptValue, runRefine]);

  const handleAccept = React.useCallback(() => {
    if (!refinedPreview) return;
    void onAccept?.(refinedPreview);
    resetInner();
    onClose();
  }, [onAccept, onClose, refinedPreview, resetInner]);

  const handleDiscard = React.useCallback(() => {
    setRefinedPreview(null);
    setIsLoading(false);
    setErrorMessage(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleRetry = React.useCallback(() => {
    setRefinedPreview(null);
    const retryPrompt = lastPromptValue || promptValue.trim();
    if (!retryPrompt) return;
    void runRefine(retryPrompt);
  }, [lastPromptValue, promptValue, runRefine]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmitPrompt();
      }
      if (e.key === "Escape") {
        onClose();
      }
    },
    [handleSubmitPrompt, onClose]
  );

  if (!hasSelection && !isExpanded) return null;
  if (!coords && !isExpanded) return null;

  const isVisible = coords?.visible !== false;

  const toolbar = (
    <div
      ref={toolbarRef}
      data-ai-refine-toolbar
      className="fixed z-50"
      style={{
        top: coords?.top ?? 0,
        left: coords?.left ?? 0,
        transform: "translateX(-50%)",
        visibility: isVisible ? "visible" : "hidden",
        pointerEvents: isVisible ? "auto" : "none",
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("textarea")) return;
        e.preventDefault();
      }}
    >
      {!isExpanded ? (
        <button
          type="button"
          onClick={onExpand}
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-2",
            "bg-popover border shadow-lg",
            "text-sm font-medium text-popover-foreground",
            "cursor-pointer select-none",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-general-primary" />
          <span>Refine with AI</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      ) : (
        <div
          className={cn(
            "w-[420px] rounded-2xl border bg-popover shadow-2xl",
            "text-popover-foreground",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          )}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-general-primary" />
              <span className="text-sm font-semibold">Refine with AI</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 px-4 py-8">
              <Loader2 className="h-4 w-4 animate-spin text-general-primary shrink-0" />
              <span className="text-sm text-muted-foreground">
                Refining your text...
              </span>
            </div>
          ) : refinedPreview ? (
            <div className="px-4 pb-3 pt-2 space-y-3">
              <div className="rounded-xl bg-general-primary/5 border border-general-primary/15 p-3.5">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {refinedPreview}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg"
                  onClick={handleAccept}
                >
                  <Check className="h-3.5 w-3.5" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg"
                  onClick={handleRetry}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg"
                  onClick={handleDiscard}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Discard
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-4 pb-3 pt-2">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tell AI what to do with this text..."
                  rows={2}
                  className={cn(
                    "w-full resize-none rounded-xl border bg-muted/30 px-3.5 py-2.5 pr-10 text-sm",
                    "placeholder:text-muted-foreground/60",
                    "focus:outline-none focus:ring-2 focus:ring-general-primary/30 focus:border-general-primary/50",
                    "transition-colors"
                  )}
                />
                <button
                  type="button"
                  onClick={handleSubmitPrompt}
                  disabled={!promptValue.trim()}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                    promptValue.trim()
                      ? "bg-general-primary text-general-primary-foreground hover:bg-general-primary/90 cursor-pointer"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
              {errorMessage ? (
                <p className="mt-2 text-xs text-destructive">{errorMessage}</p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return createPortal(toolbar, document.body);
}

// ─── DOM / contentEditable variant ───────────────────────────────────

interface AIRefineToolbarDomProps {
  containerRef: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
  onRefine?: (
    action: RefineAction,
    selectedText: string,
    customPrompt?: string
  ) => Promise<string | null | undefined> | string | null | undefined;
  onAccept?: (revisedText: string, selectedText: string) => void | Promise<void>;
  onExpandedChange?: (isExpanded: boolean) => void;
}

export function AIRefineToolbarDom({
  containerRef,
  enabled = true,
  onRefine,
  onAccept,
  onExpandedChange,
}: AIRefineToolbarDomProps) {
  const { coords, hasSelection, selectedText, lock, unlock } =
    useDomSelectionPosition(containerRef);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const resetState = React.useCallback(() => {
    setIsExpanded(false);
    unlock();
  }, [unlock]);

  React.useEffect(() => {
    if (!hasSelection && !isExpanded) resetState();
  }, [hasSelection, isExpanded, resetState]);

  React.useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  const handleExpand = React.useCallback(() => {
    lock();
    setIsExpanded(true);
  }, [lock]);

  const handleClose = React.useCallback(() => {
    resetState();
  }, [resetState]);

  const handleRefine = React.useCallback(
    (action: RefineAction, customPrompt?: string) => {
      return onRefine?.(action, selectedText, customPrompt);
    },
    [onRefine, selectedText]
  );

  const handleAccept = React.useCallback(
    (revisedText: string) => {
      return onAccept?.(revisedText, selectedText);
    },
    [onAccept, selectedText]
  );

  if (!enabled) return null;

  return (
    <RefineToolbarPanel
      coords={coords}
      hasSelection={hasSelection}
      isExpanded={isExpanded}
      onExpand={handleExpand}
      onClose={handleClose}
      onRefine={handleRefine}
      onAccept={handleAccept}
    />
  );
}
