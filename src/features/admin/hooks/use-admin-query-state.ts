"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AdminRangeKey } from "../types";

export function useAdminQueryState() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = (searchParams.get("range") || "last_28_days") as AdminRangeKey;
  const groupBy = searchParams.get("groupBy") || undefined;
  const metric = searchParams.get("metric") || undefined;
  const agencyId = searchParams.get("agencyId") || undefined;
  const industry = searchParams.get("industry") || undefined;
  const plan = searchParams.get("plan") || undefined;
  const status = searchParams.get("status") || undefined;

  const setQuery = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { range, groupBy, metric, agencyId, industry, plan, status, setQuery };
}
