"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import type { BusinessInfoFormData } from "@/schemas/ProfileFormSchema";
import {
  reconcileProfileForm,
  rememberOfferingRemovals,
} from "@/utils/profile-form-reconciliation";
import { stableStringify } from "@/utils/stable-stringify";

export function useProfileFormSync({
  form,
  serverValues,
  loading,
  saving,
}: {
  form: any;
  serverValues: BusinessInfoFormData;
  loading: boolean;
  saving: boolean;
}) {
  const dirtyState = useFormDirtyState({ form });
  const { resetBaseline, rebaseBaseline } = dirtyState;
  const baselineRef = useRef<BusinessInfoFormData | null>(null);
  const appliedRevision = useRef<string | null>(null);
  const retiredOfferings = useRef<
    NonNullable<BusinessInfoFormData["offeringsList"]>
  >([]);
  const [saveFailed, setSaveFailed] = useState(false);
  const [hydratedRevision, setHydratedRevision] = useState<string | null>(null);
  const revision = stableStringify(serverValues);

  useEffect(() => {
    if (loading || saving || appliedRevision.current === revision) return;
    const current = form.state.values as BusinessInfoFormData;
    retiredOfferings.current = rememberOfferingRemovals(
      baselineRef.current?.offeringsList ?? [],
      current.offeringsList ?? [],
      retiredOfferings.current,
    );
    const reconciled = reconcileProfileForm(
      baselineRef.current,
      current,
      serverValues,
      retiredOfferings.current,
    );
    if (!baselineRef.current) {
      // Keep useForm's fixed defaults: changing them here lets its next options
      // update reset an untouched form back to the initial loading values.
      form.reset(reconciled.values, { keepDefaultValues: true });
    } else {
      for (const key of Object.keys(reconciled.values) as Array<
        keyof BusinessInfoFormData
      >) {
        if (
          stableStringify(current[key]) !==
          stableStringify(reconciled.values[key])
        ) {
          form.setFieldValue(key, reconciled.values[key], {
            dontUpdateMeta: true,
          });
        }
      }
    }
    baselineRef.current = reconciled.baseline;
    appliedRevision.current = revision;
    rebaseBaseline(reconciled.baseline);
    setHydratedRevision(revision);
  }, [form, loading, rebaseBaseline, revision, saving, serverValues]);

  const markSaved = useCallback(
    (submitted: BusinessInfoFormData) => {
      retiredOfferings.current = rememberOfferingRemovals(
        baselineRef.current?.offeringsList ?? [],
        submitted.offeringsList ?? [],
        retiredOfferings.current,
      );
      baselineRef.current = submitted;
      appliedRevision.current = null;
      resetBaseline(submitted);
      setSaveFailed(false);
    },
    [resetBaseline],
  );

  const markSaveFailed = useCallback(() => setSaveFailed(true), []);
  return {
    isHydrated: hydratedRevision === revision,
    isDirty: dirtyState.isDirty || saveFailed,
    markSaved,
    markSaveFailed,
  };
}
