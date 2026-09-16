"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

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

/**
 * Next.js App Router exposes no navigation blocker API, so every exit path is
 * intercepted here in one place instead of per page: link clicks are caught in
 * the capture phase, browser/OS back is absorbed by a history sentinel, and tab
 * close falls back to the native `beforeunload` prompt.
 */

/** Marks the duplicate history entry that absorbs the first back press. */
const SENTINEL_STATE_KEY = "__massicUnsavedChangesSentinel";

/** Deferred navigation waiting on the user's answer in the dialog. */
type PendingNavigation =
  | { kind: "href"; href: string }
  | { kind: "history-back" }
  | { kind: "callback"; run: () => void };

type UnsavedChangesContextValue = {
  /** Reports whether a page currently holds unsaved changes. */
  setGuardDirty: (id: string, isDirty: boolean) => void;
  unregisterGuard: (id: string) => void;
  /**
   * Runs `navigate` immediately when clean, otherwise defers it behind the
   * confirmation dialog. Use for in-page controls such as back/cancel buttons.
   */
  requestNavigation: (navigate: string | (() => void)) => void;
  /**
   * Escape hatch for navigation the app itself owns (for example right after a
   * successful save), where prompting the user would be wrong.
   */
  allowNavigation: (run: () => void) => void;
};

const UnsavedChangesContext =
  React.createContext<UnsavedChangesContextValue | null>(null);

export function useUnsavedChangesContext(): UnsavedChangesContextValue {
  const context = React.useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error(
      "useUnsavedChangesContext must be used within an UnsavedChangesProvider"
    );
  }
  return context;
}

/** Clicks the browser should handle natively, never our dialog. */
function shouldIgnoreAnchorClick(
  event: MouseEvent,
  anchor: HTMLAnchorElement
): boolean {
  if (event.defaultPrevented) return true;
  if (event.button !== 0) return true;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return true;
  }
  if (anchor.hasAttribute("download")) return true;
  if (anchor.target && anchor.target !== "_self") return true;
  if (anchor.rel.split(/\s+/).includes("external")) return true;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return true;

  let destination: URL;
  try {
    destination = new URL(anchor.href, window.location.href);
  } catch {
    return true;
  }

  if (destination.protocol !== "http:" && destination.protocol !== "https:") {
    return true;
  }
  if (destination.origin !== window.location.origin) return true;

  const current = window.location.pathname + window.location.search;
  return destination.pathname + destination.search === current;
}

export function UnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const dirtyGuardsRef = React.useRef(new Set<string>());
  const [dirtyGuardCount, setDirtyGuardCount] = React.useState(0);
  const pendingNavigationRef = React.useRef<PendingNavigation | null>(null);
  // Suppresses interception while we perform a navigation the user just
  // confirmed, or one the app explicitly allowed.
  const bypassRef = React.useRef(false);
  const hasSentinelRef = React.useRef(false);
  const sentinelPathRef = React.useRef<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const hasUnsavedChanges = React.useCallback(
    () => !bypassRef.current && dirtyGuardsRef.current.size > 0,
    []
  );

  const setGuardDirty = React.useCallback((id: string, isDirty: boolean) => {
    const guards = dirtyGuardsRef.current;
    if (isDirty) {
      guards.add(id);
    } else {
      guards.delete(id);
    }
    setDirtyGuardCount(guards.size);
  }, []);

  const unregisterGuard = React.useCallback((id: string) => {
    dirtyGuardsRef.current.delete(id);
    setDirtyGuardCount(dirtyGuardsRef.current.size);
  }, []);

  const pushSentinel = React.useCallback(() => {
    if (hasSentinelRef.current) return;
    // The existing state is carried over so the App Router still finds its own
    // routing data on this entry and renders the same page.
    window.history.pushState(
      { ...window.history.state, [SENTINEL_STATE_KEY]: true },
      "",
      window.location.href
    );
    hasSentinelRef.current = true;
  }, []);

  const runNavigation = React.useCallback(
    (navigation: PendingNavigation) => {
      bypassRef.current = true;
      try {
        switch (navigation.kind) {
          case "href":
            router.push(navigation.href);
            break;
          case "history-back":
            window.history.back();
            break;
          case "callback":
            navigation.run();
            break;
        }
      } finally {
        // Released on a macrotask so the in-flight navigation is not re-guarded
        // by listeners that fire during the same tick.
        window.setTimeout(() => {
          bypassRef.current = false;
        }, 0);
      }
    },
    [router]
  );

  const confirmBeforeNavigating = React.useCallback(
    (navigation: PendingNavigation) => {
      if (!hasUnsavedChanges()) {
        runNavigation(navigation);
        return;
      }
      pendingNavigationRef.current = navigation;
      setIsDialogOpen(true);
    },
    [hasUnsavedChanges, runNavigation]
  );

  const requestNavigation = React.useCallback(
    (navigate: string | (() => void)) => {
      confirmBeforeNavigating(
        typeof navigate === "string"
          ? { kind: "href", href: navigate }
          : { kind: "callback", run: navigate }
      );
    },
    [confirmBeforeNavigating]
  );

  const allowNavigation = React.useCallback(
    (run: () => void) => {
      runNavigation({ kind: "callback", run });
    },
    [runNavigation]
  );

  // `popstate` cannot be cancelled, so while a page is dirty we keep a
  // duplicate history entry in front of it. The first back press pops that
  // duplicate, which leaves the URL and rendered route untouched and gives us a
  // chance to ask the user before the real navigation happens.
  React.useEffect(() => {
    if (sentinelPathRef.current !== pathname) {
      // A new entry: any sentinel we pushed belongs to the previous route.
      hasSentinelRef.current = false;
      sentinelPathRef.current = pathname;
    }
    if (dirtyGuardCount > 0) {
      pushSentinel();
    }
  }, [dirtyGuardCount, pathname, pushSentinel]);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (shouldIgnoreAnchorClick(event, anchor)) return;
      if (!hasUnsavedChanges()) return;

      event.preventDefault();
      event.stopPropagation();
      const destination = new URL(anchor.href, window.location.href);
      pendingNavigationRef.current = {
        kind: "href",
        href: destination.pathname + destination.search + destination.hash,
      };
      setIsDialogOpen(true);
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [hasUnsavedChanges]);

  React.useEffect(() => {
    const handlePopState = () => {
      const absorbedBySentinel = hasSentinelRef.current;
      hasSentinelRef.current = false;

      if (!hasUnsavedChanges()) return;
      // Without a sentinel the browser has already left the page, so a prompt
      // would only be confusing.
      if (!absorbedBySentinel) return;

      pendingNavigationRef.current = { kind: "history-back" };
      setIsDialogOpen(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasUnsavedChanges]);

  const handleStay = React.useCallback(() => {
    pendingNavigationRef.current = null;
    setIsDialogOpen(false);
    // Restores the guard when the sentinel was spent on a back press.
    if (hasUnsavedChanges()) {
      pushSentinel();
    }
  }, [hasUnsavedChanges, pushSentinel]);

  const handleLeave = React.useCallback(() => {
    const navigation = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    setIsDialogOpen(false);
    if (navigation) {
      runNavigation(navigation);
    }
  }, [runNavigation]);

  const contextValue = React.useMemo<UnsavedChangesContextValue>(
    () => ({
      setGuardDirty,
      unregisterGuard,
      requestNavigation,
      allowNavigation,
    }),
    [allowNavigation, requestNavigation, setGuardDirty, unregisterGuard]
  );

  return (
    <UnsavedChangesContext.Provider value={contextValue}>
      {children}
      <AlertDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleStay();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you leave now, they will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStay}>
              Stay on this page
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave}>
              Leave without saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
}
