"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";

export function UnsupportedWebPageTypeState() {
  const router = useRouter();

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
      <Card className="p-4">
        <Typography variant="h4">Content unavailable</Typography>
        <Typography variant="muted" className="mt-1">
          This page does not have a supported page type. Rerun the webpage strategy to update it.
        </Typography>
      </Card>
    </div>
  );
}
