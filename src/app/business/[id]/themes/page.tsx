"use client";

import React from "react";
import { PageHeader } from "@/components/molecules/PageHeader";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { ThemesTableClient } from "@/components/organisms/ThemesTable/themes-table-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BusinessThemesPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>("");

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id));
  }, [params]);

  const { profileData, profileDataLoading } = useBusinessProfileById(
    businessId || null
  );

  const businessName =
    profileData?.Name || profileData?.DisplayName || "Business";

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Themes", href: `/business/${businessId}/themes` },
    ],
    [businessName, businessId]
  );

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (profileDataLoading) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader breadcrumbs={breadcrumbs} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} />
      <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
        <ThemesTableClient businessId={businessId} />
      </div>
    </div>
  );
}
