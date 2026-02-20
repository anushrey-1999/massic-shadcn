"use client";

import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Typography } from "@/components/ui/typography";

type QuickEvaluationBlockProps = {
  data: unknown;
  isLoading: boolean;
  errorMessage?: string;
};

type QuickEvaluation = {
  url?: string;
  domain?: string;
  techStack?: {
    cms?: string | null;
    cdnProvider?: string | null;
    hostingProvider?: string | null;
  };
  analytics?: {
    hasGSC?: boolean;
    hasGA4?: boolean;
    hasGTM?: boolean;
    detectedPixels?: unknown[];
  };
  domain_info?: {
    domainAge?: number | null;
    domainRegistrar?: string | null;
  };
  businessInfo?: {
    socialMediaLinks?: Record<string, string | null | undefined> | null;
    revenueModel?: string | null;
    ctaButtons?: string[] | null;
  };
  meta?: {
    pageTitle?: string | null;
    metaDescription?: string | null;
    h1Tags?: string[] | null;
    schemaOrgTypes?: string[] | null;
  };
};

function isNonNullObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toQuickEvaluation(value: unknown): QuickEvaluation | null {
  if (!isNonNullObject(value)) return null;

  const direct = value;
  const nested = isNonNullObject((value as any).quick_evaluation)
    ? ((value as any).quick_evaluation as Record<string, any>)
    : null;

  const candidate = nested ?? direct;
  if (!isNonNullObject(candidate)) return null;

  const hasAny =
    Boolean(String((candidate as any).url || "").trim()) ||
    Boolean(String((candidate as any).domain || "").trim()) ||
    Boolean((candidate as any).techStack) ||
    Boolean((candidate as any).analytics) ||
    Boolean((candidate as any).domain_info) ||
    Boolean((candidate as any).businessInfo) ||
    Boolean((candidate as any).meta);

  return hasAny ? (candidate as QuickEvaluation) : null;
}

function displayValue(value: unknown): string {
  const s = String(value ?? "").trim();
  return s ? s : "Not detected";
}

function formatDomainAgeYears(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "Not detected";
  const fixed = n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
  return `${fixed} years`;
}

function MissingText({ children }: { children: string }) {
  return (
    <Typography variant="p" className="text-sm italic text-destructive">
      {children}
    </Typography>
  );
}

function Dot({ variant }: { variant: "good" | "bad" | "warn" }) {
  const cls =
    variant === "good"
      ? "bg-emerald-500"
      : variant === "warn"
        ? "bg-amber-500"
        : "bg-red-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

function OnPageRow({
  label,
  value,
  missingLabel,
}: {
  label: string;
  value: string | null;
  missingLabel: string;
}) {
  const v = String(value || "").trim();
  return (
    <div className="rounded-lg border border-general-border bg-white p-4">
      <Typography
        variant="extraSmall"
        className="uppercase tracking-wide text-general-muted-foreground"
      >
        {label}
      </Typography>
      <div className="mt-1">
        {v ? (
          <Typography variant="p" className="text-sm font-mono text-general-foreground">
            {v}
          </Typography>
        ) : (
          <MissingText>{missingLabel}</MissingText>
        )}
      </div>
    </div>
  );
}

function Pill({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: "neutral" | "info";
}) {
  const cls =
    variant === "info"
      ? "border-blue-200 text-blue-700 bg-blue-50/60"
      : "border-general-border text-general-muted-foreground bg-white";
  return (
    <span
      className={[
        "inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium",
        cls,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export function QuickEvaluationBlock({
  data,
  isLoading,
  errorMessage,
}: QuickEvaluationBlockProps) {
  const qe = React.useMemo(() => toQuickEvaluation(data), [data]);

  const cms = qe?.techStack?.cms ?? null;
  const cdn = qe?.techStack?.cdnProvider ?? null;
  const hosting = qe?.techStack?.hostingProvider ?? null;
  const registrar = qe?.domain_info?.domainRegistrar ?? null;
  const domainAge = qe?.domain_info?.domainAge ?? null;
  const revenueModel = qe?.businessInfo?.revenueModel ?? null;
  const ctaButtons = Array.isArray(qe?.businessInfo?.ctaButtons)
    ? qe?.businessInfo?.ctaButtons
    : [];
  const socialMediaLinks = qe?.businessInfo?.socialMediaLinks;
  const socialEntries = React.useMemo(() => {
    if (!socialMediaLinks || typeof socialMediaLinks !== "object") return [];
    return Object.entries(socialMediaLinks)
      .map(([k, v]) => [String(k || "").trim(), String(v || "").trim()] as const)
      .filter(([k, v]) => k && v);
  }, [socialMediaLinks]);

  const hasGSC = Boolean(qe?.analytics?.hasGSC);
  const hasGA4 = Boolean(qe?.analytics?.hasGA4);
  const hasGTM = Boolean(qe?.analytics?.hasGTM);
  const pixels = Array.isArray(qe?.analytics?.detectedPixels) ? qe?.analytics?.detectedPixels : [];

  const pageTitle = qe?.meta?.pageTitle ?? null;
  const metaDescription = qe?.meta?.metaDescription ?? null;
  const h1 = Array.isArray(qe?.meta?.h1Tags) ? qe?.meta?.h1Tags?.[0] ?? null : null;
  const schema = Array.isArray(qe?.meta?.schemaOrgTypes)
    ? qe?.meta?.schemaOrgTypes?.join(", ")
    : null;

  return (
    <div className="flex flex-col">
      {isLoading ? (
        <Card className="shadow-none gap-0 rounded-lg py-4">
          <CardContent>
            <Typography variant="muted" className="text-general-muted-foreground">
              Running quick evaluation…
            </Typography>
          </CardContent>
        </Card>
      ) : errorMessage ? (
        <Card className="shadow-none gap-0 rounded-lg py-4">
          <CardContent>
            <Typography variant="p" className="text-sm text-destructive">
              {errorMessage}
            </Typography>
          </CardContent>
        </Card>
      ) : qe == null ? (
        <Card className="shadow-none gap-0 rounded-lg py-4">
          <CardContent>
            <Typography variant="muted" className="text-general-muted-foreground">
              No quick evaluation data yet.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col">
          <Separator className="bg-general-unofficial-outline" />

          <div className="py-6">
            <Typography
              variant="p"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-general-muted-foreground mb-4"
            >
              Tech stack
            </Typography>

            <div className="rounded-lg border border-general-border overflow-hidden bg-white">
              <div className="grid grid-cols-3">
                {[
                  { label: "CMS", value: cms },
                  { label: "CDN", value: cdn },
                  { label: "Hosting", value: hosting },
                  { label: "Registrar", value: registrar },
                  { label: "Domain age", value: formatDomainAgeYears(domainAge) },
                  { label: "Revenue model", value: revenueModel },
                ].map((item, idx) => {
                  const isRightEdge = idx % 3 === 2;
                  const isBottomRow = idx >= 3;
                  return (
                    <div
                      key={idx}
                      className={[
                        "p-4",
                        !isRightEdge ? "border-r border-general-border" : "",
                        !isBottomRow ? "border-b border-general-border" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <Typography variant="extraSmall" className="text-general-muted-foreground">
                        {item.label}
                      </Typography>
                      <Typography variant="p" className="text-sm font-semibold text-general-foreground mt-1">
                        {item.label === "Domain age"
                          ? String(item.value || "Not detected")
                          : displayValue(item.value)}
                      </Typography>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <Separator className="bg-general-unofficial-outline" />

          <div className="py-6">
            <Typography
              variant="p"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-general-muted-foreground mb-4"
            >
              Analytics &amp; tracking
            </Typography>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Dot variant={hasGSC ? "good" : "bad"} />
                <Typography variant="p" className="text-sm text-general-foreground">
                  <span className="font-semibold">GSC</span>{" "}
                  <span className="text-general-muted-foreground">
                    {hasGSC ? "Detected" : "Not detected"}
                  </span>
                </Typography>
              </div>
              <div className="flex items-center gap-2">
                <Dot variant={hasGA4 ? "good" : "bad"} />
                <Typography variant="p" className="text-sm text-general-foreground">
                  <span className="font-semibold">GA4</span>{" "}
                  <span className="text-general-muted-foreground">
                    {hasGA4 ? "Detected" : "Not detected"}
                  </span>
                </Typography>
              </div>
              <div className="flex items-center gap-2">
                <Dot variant={hasGTM ? "good" : "bad"} />
                <Typography variant="p" className="text-sm text-general-foreground">
                  <span className="font-semibold">GTM</span>{" "}
                  <span className="text-general-muted-foreground">
                    {hasGTM ? "Detected" : "Not detected"}
                  </span>
                </Typography>
              </div>
              <div className="flex items-center gap-2">
                <Dot variant="warn" />
                <Typography variant="p" className="text-sm text-general-foreground">
                  <span className="font-semibold">Pixels</span>{" "}
                  <span className="text-general-muted-foreground">
                    {pixels.length ? `${pixels.length}` : "None"}
                  </span>
                </Typography>
              </div>
            </div>
          </div>

          <Separator className="bg-general-unofficial-outline" />

          <div className="py-6">
            <Typography
              variant="p"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-general-muted-foreground mb-4"
            >
              On-page SEO
            </Typography>

            <div className="flex flex-col gap-3">
              <OnPageRow label="Page title" value={pageTitle} missingLabel="Missing" />
              <OnPageRow
                label="Meta description"
                value={metaDescription}
                missingLabel="Missing"
              />
              <OnPageRow label="H1" value={h1} missingLabel="Missing" />
              <OnPageRow
                label="Schema"
                value={schema}
                missingLabel="None detected"
              />
            </div>
          </div>

          <Separator className="bg-general-unofficial-outline" />

          <div className="py-6">
            <Typography
              variant="p"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-general-muted-foreground mb-4"
            >
              CTAs detected
            </Typography>

            <div className="flex flex-wrap gap-2">
              {ctaButtons.length ? (
                ctaButtons.map((cta, idx) => (
                  <Pill key={`${cta}-${idx}`} variant="info">
                    {String(cta || "").trim() || "CTA"}
                  </Pill>
                ))
              ) : (
                <Pill>No CTAs detected</Pill>
              )}
            </div>
          </div>

          <Separator className="bg-general-unofficial-outline" />

          <div className="py-6">
            <Typography
              variant="p"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-general-muted-foreground mb-4"
            >
              Social &amp; presence
            </Typography>

            <div className="flex flex-wrap gap-2">
              {socialEntries.length ? (
                socialEntries.map(([platform, url]) => (
                  <a
                    key={`${platform}-${url}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="no-underline"
                  >
                    <Pill>
                      <span className="capitalize">{platform}</span>
                    </Pill>
                  </a>
                ))
              ) : (
                <Pill>No social links detected</Pill>
              )}
            </div>
          </div>

          <Separator className="bg-general-unofficial-outline" />
        </div>
      )}
    </div>
  );
}

