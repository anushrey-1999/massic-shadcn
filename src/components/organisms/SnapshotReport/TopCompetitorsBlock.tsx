"use client";

import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Typography } from "@/components/ui/typography";

export type Competitor = {
  name?: string | null;
  website: string;
};

type TopCompetitorsBlockProps = {
  competitors: Competitor[];
};

function stripProtocol(url: string): string {
  return String(url || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function TopCompetitorsBlock({ competitors }: TopCompetitorsBlockProps) {
  const items = (Array.isArray(competitors) ? competitors : [])
    .map((c) => ({
      name: String(c?.name || "").trim(),
      website: String(c?.website || "").trim(),
    }))
    .filter((c) => c.website);

  if (items.length === 0) return null;

  return (
    <Card className="shadow-none gap-0 rounded-lg py-4">
      <CardContent className="px-0">
        <div className="px-6 pb-3">
          <Typography className="text-[11px] font-semibold uppercase tracking-[0.08em] text-general-muted-foreground mb-0">
            Top competitors
          </Typography>
        </div>
        <Separator className="bg-general-unofficial-outline" />
        <div className="px-6 pt-4 flex flex-col gap-2">
          {items.map((c, idx) => {
            const display = stripProtocol(c.website);
            return (
              <a
                key={`${c.website}-${idx}`}
                href={c.website}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-general-border bg-[#fafafa] px-4 py-3 no-underline"
              >
                <div className="flex items-center gap-3">
                  <Typography
                    variant="extraSmall"
                    className="text-general-muted-foreground w-5 text-center"
                  >
                    {idx + 1}
                  </Typography>
                  <Typography
                    variant="p"
                    className="text-sm font-mono text-blue-600 wrap-break-word"
                  >
                    {c.name ? `${c.name} — ${display}` : display}
                  </Typography>
                </div>
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

