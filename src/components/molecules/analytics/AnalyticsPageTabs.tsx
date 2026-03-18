"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnalyticsPageTabsProps {
  businessId?: string | null;
}

type AnalyticsTabValue = "overview" | "organic-deep-dive" | "reports";

export function AnalyticsPageTabs({ businessId }: AnalyticsPageTabsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = useMemo<AnalyticsTabValue>(() => {
    // Keep deepdive route grouped under dashboard tab while the tab is hidden.
    if (pathname.includes("/organic-deepdive")) return "overview";
    if (pathname.includes("/reports")) return "reports";
    return "overview";
  }, [pathname]);

  const handleChange = (value: string) => {
    if (!businessId) return;

    if (value === "overview") {
      router.push(`/business/${businessId}/analytics`);
      return;
    }

    if (value === "reports") {
      router.push(`/business/${businessId}/reports`);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleChange}>
      <TabsList>
        <TabsTrigger value="overview">Dashboard</TabsTrigger>
        {/* <TabsTrigger value="organic-deep-dive">Organic Deep Dive</TabsTrigger> */}
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
