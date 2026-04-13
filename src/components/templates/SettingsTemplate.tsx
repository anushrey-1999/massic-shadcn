"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/organisms/settings/ProfileSettings";
import { BillingSettings } from "@/components/organisms/settings/BillingSettings";
import { TeamSettings } from "@/components/organisms/settings/TeamSettings";
import { PageHeader } from "@/components/molecules/PageHeader";
import { ReceiptText, Settings, Users } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SettingsTemplate = () => {
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTeamMember = user?.isTeamMember || false;
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

    if (shouldShowBilling) {
      setActiveTab("billing");
      router.replace(pathname, { scroll: false });
    }
  }, [pathname, router, searchParams]);

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
                <Settings /> Profile
              </TabsTrigger>
              <TabsTrigger value="billing">
                <ReceiptText /> Billing
              </TabsTrigger>
              <TabsTrigger
                value="team"
                disabled={isTeamMember}
                className={isTeamMember ? "hidden" : undefined}
              >
                <Users /> Team
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <ProfileSettings />
            </TabsContent>

            <TabsContent value="billing" className="mt-6">
              <BillingSettings />
            </TabsContent>

            <TabsContent
              value="team"
              className={isTeamMember ? "hidden" : "mt-6"}
            >
              <TeamSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SettingsTemplate;
