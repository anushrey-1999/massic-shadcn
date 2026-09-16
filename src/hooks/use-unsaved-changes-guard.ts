"use client";

import * as React from "react";

import { useUnsavedChangesContext } from "@/components/providers/unsaved-changes-provider";

export type UnsavedChangesGuard = {
  /**
   * Confirms with the user before navigating when the form is dirty. Use for
   * in-page controls such as back and cancel buttons.
   */
  requestNavigation: (navigate: string | (() => void)) => void;
  /** Navigates without prompting, for app-owned redirects such as post-save. */
  allowNavigation: (run: () => void) => void;
};

/**
 * Registers a page's dirty state with the app-wide unsaved changes guard, so
 * link clicks, browser back, and tab close are all confirmed before the user
 * loses work.
 */
export function useUnsavedChangesGuard(options: {
  isDirty: boolean;
  /** Set false to keep the page unguarded, for example while it still loads. */
  enabled?: boolean;
}): UnsavedChangesGuard {
  const { isDirty, enabled = true } = options;
  const { setGuardDirty, unregisterGuard, requestNavigation, allowNavigation } =
    useUnsavedChangesContext();

  const guardId = React.useId();

  React.useEffect(() => {
    setGuardDirty(guardId, isDirty && enabled);
  }, [enabled, guardId, isDirty, setGuardDirty]);

  React.useEffect(
    () => () => {
      unregisterGuard(guardId);
    },
    [guardId, unregisterGuard]
  );

  return React.useMemo(
    () => ({ requestNavigation, allowNavigation }),
    [allowNavigation, requestNavigation]
  );
}
