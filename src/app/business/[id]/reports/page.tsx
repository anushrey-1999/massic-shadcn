"use client";

import * as React from "react";
import { Ellipsis, Eye, ListChecks, Sparkles, Zap } from "lucide-react";

import { PageHeader } from "@/components/molecules/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function BusinessReportsPage({ params }: PageProps) {
  const [businessId, setBusinessId] = React.useState<string>("");

  React.useEffect(() => {
    params.then(({ id }) => setBusinessId(id));
  }, [params]);

  const { profileData, profileDataLoading } = useBusinessProfileById(
    businessId || null,
  );

  const businessName =
    profileData?.Name || profileData?.DisplayName || "Business";

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      {
        icon: <Ellipsis className="h-4 w-4 text-general-muted-foreground" />,
      },
      { label: businessName },
      { label: "Reports" },
    ],
    [businessName],
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
      <div className="flex-1 min-h-0 bg-foreground-light p-5">
        <div className="w-full max-w-[1224px] mx-auto">
          <div className="bg-background rounded-lg p-24 h-[844px]">
            <div className="flex flex-col md:flex-row items-stretch gap-4 h-full">
              <Card className="flex-1 h-full bg-background border border-general-primary shadow-none rounded-xl p-8 gap-4 items-start">
                <div className="flex flex-col h-full w-full gap-4">
                  <div className="flex items-start gap-2">
                    <Zap className="h-6 w-6 text-general-primary" />
                    <h2 className="text-[30px] leading-none font-semibold text-general-primary tracking-[-0.3px]">
                      Snapshot
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-start gap-2">
                    <Badge
                      className="min-h-[24px] rounded-lg border border-border bg-transparent px-2 py-[3px] text-[10px] font-medium tracking-[0.15px] text-general-foreground"
                    >
                      5 pitches included in your Starter plan
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="min-h-[24px] rounded-lg px-2 py-[3px] text-[10px] font-medium tracking-[0.15px]"
                    >
                      2 of 5 used
                    </Badge>
                  </div>

                  <p className="flex-1 w-full text-base leading-normal text-schemes-on-surface">
                    A super-fast, low-cost snapshot of your SEO opportunity. In 10–20
                    seconds, it gives you a personalized, high-impact teaser of where
                    you stand and what you could gain—using only your basic business
                    info and current rankings. It’s designed to spark quick insight
                    and help you decide when it’s worth diving deeper with a full
                    Massic Pitch.
                  </p>

                  <div className="w-full">
                    <Button className="w-full h-9 rounded-lg gap-2">
                      <Sparkles className="size-[13.25px]" />
                      Generate
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="flex-1 h-full bg-background border border-general-primary shadow-none rounded-xl p-8 gap-4 items-start">
                <div className="flex flex-col h-full w-full gap-4">
                  <div className="flex-1 w-full flex flex-col gap-4">
                    <div className="flex items-start gap-2">
                      <ListChecks className="h-6 w-6 text-general-primary" />
                      <h2 className="text-[30px] leading-none font-semibold text-general-primary tracking-[-0.3px]">
                        Detailed
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-start gap-2">
                      <Badge className="min-h-[24px] rounded-lg border border-border bg-transparent px-2 py-[3px] text-[10px] font-medium tracking-[0.15px] text-general-foreground">
                        100 credits per pitch
                      </Badge>
                    </div>

                    <p className="w-full text-base leading-normal text-schemes-on-surface">
                      A full, data-driven growth proposal built from Massic’s complete
                      strategy workflows. It combines deterministic calculations, real
                      search data, and the SEO Segment Matrix to generate a rich,
                      narrative plan tailored to your business. This is the in-depth
                      version—actionable, comprehensive, and grounded entirely in your
                      actual inputs and proven tactics.
                    </p>
                  </div>

                  <div className="w-full flex flex-col gap-2">
                    <p className="w-full text-center font-mono text-xs leading-normal text-general-muted-foreground">
                      Generated on 12th Jan 2025
                    </p>
                    <Button
                      variant="secondary"
                      className="w-full h-9 rounded-lg gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
