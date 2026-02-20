"use client";

import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";

type HeaderBlockProps = {
  title: string;
  url: string;
  generatedAtLabel?: string;
  generatedAt?: string;
};

function stripProtocol(url: string): string {
  return String(url || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function HeaderBlock({
  title,
  url,
  generatedAtLabel = "GENERATED",
  generatedAt,
}: HeaderBlockProps) {
  const href = String(url || "").trim();
  const displayUrl = stripProtocol(href);

  return (
    <Card className="shadow-none gap-2 rounded-lg py-4">
      <CardContent className="flex items-start justify-between">
        <div className="min-w-0">
          <Typography variant="h3" className="text-general-foreground">
            {title}
          </Typography>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 underline underline-offset-4 break-all"
            >
              {displayUrl || href}
            </a>
          ) : null}
        </div>

        <div className="text-right shrink-0 pl-6">
          <Typography
            variant="extraSmall"
            className="uppercase tracking-wide text-general-muted-foreground"
          >
            {generatedAtLabel}
          </Typography>
          {generatedAt ? (
            <Typography variant="muted" className="text-general-muted-foreground">
              {generatedAt}
            </Typography>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

