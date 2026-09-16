"use client";

import * as React from "react";

import { stableStringify } from "@/utils/stable-stringify";

/**
 * Minimal structural view of a TanStack Form instance. Declared locally so the
 * hook works with any form shape without depending on the library's generics.
 */
type FormStoreLike<TValues> = {
  readonly state: { readonly values: TValues };
  subscribe: (listener: () => void) => () => void;
};

type DirtyTrackableForm<TValues> = {
  readonly store: FormStoreLike<TValues>;
  readonly state: { readonly values: TValues };
};

export type FormDirtyState = {
  /** True when the current form values differ from the baseline snapshot. */
  isDirty: boolean;
  /** Whether a baseline exists yet. Reads a ref, so it is safe inside effects. */
  hasBaseline: () => boolean;
  /**
   * Marks the given values (or the current form values) as the new clean state.
   * Call this after a successful save or when server data repopulates the form.
   */
  resetBaseline: (values?: unknown) => void;
  /** Drops the baseline, so nothing is considered dirty until one is set again. */
  clearBaseline: () => void;
};

/**
 * Tracks whether a form has unsaved changes by comparing a stable serialization
 * of its values against a baseline snapshot.
 *
 * Comparisons are batched into a single animation frame so fast typing does not
 * serialize the whole form on every keystroke, and `isDirty` state is only set
 * when the result actually flips.
 */
export function useFormDirtyState<TValues>(options: {
  form: DirtyTrackableForm<TValues>;
  /**
   * Fixed clean state to compare against, for forms that start from known
   * defaults. Omit to snapshot the form's initial values on mount instead.
   */
  baseline?: unknown;
  /** Set false to stop tracking, for example while the form is still loading. */
  enabled?: boolean;
}): FormDirtyState {
  const { form, baseline, enabled = true } = options;

  const baselineRef = React.useRef<string | null>(null);
  const isDirtyRef = React.useRef(false);
  const compareFrameRef = React.useRef<number | null>(null);
  const captureFrameRef = React.useRef<number | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);

  const values = React.useSyncExternalStore(
    React.useCallback(
      (onStoreChange: () => void) => form.store.subscribe(onStoreChange),
      [form]
    ),
    () => form.store.state.values,
    () => form.store.state.values
  );

  const markClean = React.useCallback(() => {
    if (compareFrameRef.current !== null) {
      cancelAnimationFrame(compareFrameRef.current);
      compareFrameRef.current = null;
    }
    isDirtyRef.current = false;
    setIsDirty(false);
  }, []);

  const resetBaseline = React.useCallback(
    (nextValues?: unknown) => {
      markClean();

      if (nextValues !== undefined) {
        baselineRef.current = stableStringify(nextValues);
        return;
      }

      // Callers that pass no values usually reset right after writing fields,
      // and a form can still be mid-update at that point. Snapshotting on the
      // next frame captures the values the form actually settled on, instead
      // of a partial state that would immediately read as dirty.
      if (captureFrameRef.current !== null) {
        cancelAnimationFrame(captureFrameRef.current);
      }
      captureFrameRef.current = requestAnimationFrame(() => {
        captureFrameRef.current = null;
        baselineRef.current = stableStringify(form.store.state.values);
        markClean();
      });
    },
    [form, markClean]
  );

  const clearBaseline = React.useCallback(() => {
    baselineRef.current = null;
    markClean();
  }, [markClean]);

  const hasBaseline = React.useCallback(() => baselineRef.current !== null, []);

  const serializedBaseline = React.useMemo(
    () => (baseline === undefined ? null : stableStringify(baseline)),
    [baseline]
  );

  // Establish the initial baseline: the caller-provided one when available,
  // otherwise a snapshot of the values the form mounted with.
  React.useEffect(() => {
    if (baselineRef.current !== null) return;
    baselineRef.current =
      serializedBaseline ?? stableStringify(form.store.state.values);
  }, [form, serializedBaseline]);

  React.useEffect(() => {
    if (!enabled || baselineRef.current === null) {
      if (isDirtyRef.current) markClean();
      return;
    }

    // A baseline capture is still pending, so there is nothing stable to
    // compare against yet.
    if (captureFrameRef.current !== null) return;

    if (compareFrameRef.current !== null) {
      cancelAnimationFrame(compareFrameRef.current);
    }

    compareFrameRef.current = requestAnimationFrame(() => {
      compareFrameRef.current = null;
      const nextIsDirty = stableStringify(values) !== baselineRef.current;
      if (isDirtyRef.current === nextIsDirty) return;
      isDirtyRef.current = nextIsDirty;
      setIsDirty(nextIsDirty);
    });

    return () => {
      if (compareFrameRef.current !== null) {
        cancelAnimationFrame(compareFrameRef.current);
        compareFrameRef.current = null;
      }
    };
  }, [enabled, markClean, values]);

  React.useEffect(
    () => () => {
      if (captureFrameRef.current !== null) {
        cancelAnimationFrame(captureFrameRef.current);
        captureFrameRef.current = null;
      }
    },
    []
  );

  return { isDirty, hasBaseline, resetBaseline, clearBaseline };
}
