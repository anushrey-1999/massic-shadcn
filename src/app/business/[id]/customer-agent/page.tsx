"use client";

import React from "react";
import { PageHeader } from "@/components/molecules/PageHeader";
import { CustomerAgentTemplate } from "@/components/templates/CustomerAgentTemplate";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BusinessCustomerAgentPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>("");

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id));
  }, [params]);

  const { profileData, profileDataLoading } = useBusinessProfileById(businessId || null);
  const businessName = profileData?.Name || profileData?.DisplayName || "Business";

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
        <PageHeader
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: businessName },
            { label: "Customer Agent", href: `/business/${businessId}/customer-agent` },
          ]}
        />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <CustomerAgentTemplate businessId={businessId} businessName={businessName} />;
}
