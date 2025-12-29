"use client";

import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/organisms/settings/ProfileSettings";
import { BillingSettings } from "@/components/organisms/settings/BillingSettings";
import { TeamSettings } from "@/components/organisms/settings/TeamSettings";
import { PageHeader } from "@/components/molecules/PageHeader";
import { ReceiptText, Settings, Users } from "lucide-react";

const SettingsTemplate = () => {
  const breadcrumbs = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: "Settings" },
    ],
    []
  );

  return (
    <div className="bg-muted min-h-screen">
      <div className="sticky top-0 z-11 bg-foreground-light">
        <PageHeader breadcrumbs={breadcrumbs} />
      </div>
      <div className="p-7 max-w-[1224px]">
        <div className="w-full ">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList>
              <TabsTrigger value="profile">
                <Settings /> Profile
              </TabsTrigger>
              <TabsTrigger value="billing">
                <ReceiptText /> Billing
              </TabsTrigger>
              <TabsTrigger value="team">
                <Users /> Team
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <ProfileSettings />
            </TabsContent>

            <TabsContent value="billing" className="mt-6">
              <BillingSettings />
            </TabsContent>

            <TabsContent value="team" className="mt-6">
              <TeamSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SettingsTemplate;