"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/organisms/settings/ProfileSettings";
import { BillingSettings } from "@/components/organisms/settings/BillingSettings";
import { TeamSettings } from "@/components/organisms/settings/TeamSettings";
import { AccessRequestSettings } from "@/components/organisms/settings/AccessRequestSettings";
import { PageHeader } from "@/components/molecules/PageHeader";
import { ReceiptText, Settings, Users, Share2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";

const SettingsTemplate = () => {
  const user = useAuthStore((state) => state.user);
  const permissions = usePermissions();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAnalyst = user?.accountRole === "ANALYST" || (!permissions.canManageBilling && !permissions.canManageTeam);
  const canManageBilling = permissions.canManageBilling;
  const canManageTeam = permissions.canManageTeam;
  const [activeTab, setActiveTab] = useState("profile");
  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: "Settings" },
    ],
    []
  );

  useEffect(() => {
    const tabParam = searchParams.get("tab") ?? searchParams.get("t");
    const normalizedTab = tabParam ? tabParam.split("?")[0] : null;
    const billingFlag = searchParams.get("billing");
    const rawSearch =
      typeof window !== "undefined" ? window.location.search : "";
    const shouldShowBilling =
      normalizedTab === "billing" ||
      (tabParam ? tabParam.startsWith("billing") : false) ||
      billingFlag === "true" ||
      billingFlag === "1" ||
      rawSearch.includes("t=billing");

    if (shouldShowBilling && canManageBilling) {
      setActiveTab("billing");
      router.replace(pathname, { scroll: false });
    } else if (normalizedTab === "access-requests") {
      setActiveTab("access-requests");
      router.replace(pathname, { scroll: false });
    }
  }, [canManageBilling, pathname, router, searchParams]);

  return (
    <div className="bg-muted min-h-screen">
      <div className="sticky top-0 z-11 bg-foreground-light">
        <PageHeader breadcrumbs={breadcrumbs} />
      </div>
      <div className="p-7 max-w-[1224px]">
        <div className="w-full ">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="profile">
                <Settings /> {isAnalyst ? "Linked Businesses" : "Profile"}
              </TabsTrigger>
              {canManageBilling && (
                <TabsTrigger value="billing">
                  <ReceiptText /> Billing
                </TabsTrigger>
              )}
              {canManageTeam && (
                <TabsTrigger value="team">
                  <Users /> Team
                </TabsTrigger>
              )}
              <TabsTrigger value="access-requests">
                <Share2 /> Access Requests
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <ProfileSettings linkedBusinessesOnly={isAnalyst} />
            </TabsContent>

            {canManageBilling && (
              <TabsContent value="billing" className="mt-6">
                <BillingSettings />
              </TabsContent>
            )}

            {canManageTeam && (
              <TabsContent value="team" className="mt-6">
                <TeamSettings />
              </TabsContent>
            )}

            <TabsContent value="access-requests" className="mt-6">
              <AccessRequestSettings isActive={activeTab === "access-requests"} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SettingsTemplate;
