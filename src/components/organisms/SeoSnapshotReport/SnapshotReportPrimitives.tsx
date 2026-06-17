"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type SnapshotBadgeTone =
  | "default"
  | "outline"
  | "muted"
  | "blue"
  | "red"
  | "green"
  | "orange";

const badgeToneClass: Record<SnapshotBadgeTone, string> = {
  default: "bg-secondary text-secondary-foreground border-transparent",
  outline: "border-general-border bg-general-unofficial-outline text-general-muted-foreground",
  muted: "border-transparent bg-secondary text-secondary-foreground",
  blue: "border-transparent bg-blue-100 text-blue-600",
  red: "border-general-border bg-red-100 text-red-600",
  green: "border-transparent bg-green-100 text-green-700",
  orange: "border-transparent bg-orange-100 text-orange-700",
};

export function SnapshotBadge({
  tone = "default",
  icon: Icon,
  children,
  className,
}: {
  tone?: SnapshotBadgeTone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center justify-center gap-1.5 rounded-lg border px-2 py-[3px] text-center text-[12px] font-medium leading-[1.5] tracking-[0.18px]",
        badgeToneClass[tone],
        className
      )}
    >
      {Icon ? <Icon className="size-3 shrink-0" /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function SnapshotReportShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-[1096px] max-w-full bg-white px-6 pb-6 pt-6">
      {children}
      <div className="pt-6 text-center text-[10px] font-normal leading-[1.5] tracking-[0.15px] text-general-muted-foreground">
        {footer}
      </div>
    </div>
  );
}

export function SnapshotReportHeader({
  title,
  website,
  verifiedText,
  logo,
  verifiedIcon: VerifiedIcon,
}: {
  title: string;
  website: string;
  verifiedText: string;
  logo: React.ReactNode;
  verifiedIcon?: LucideIcon;
}) {
  return (
    <div className="flex items-start justify-between border-b border-general-border pb-4">
      <div className="flex items-start gap-2">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#d9d9d9] text-[18px] font-semibold leading-none text-general-muted-foreground">
          {logo}
        </div>
        <div className="flex flex-col items-start gap-2">
          <h1 className="whitespace-nowrap text-[20px] font-semibold leading-[1.2] tracking-[-0.4px] text-black">
            {title}
          </h1>
          {website ? (
            <SnapshotBadge
              tone="default"
              className="max-w-[220px] border-0 text-[10px] tracking-[0.15px]"
            >
              {website}
            </SnapshotBadge>
          ) : null}
        </div>
      </div>
      {verifiedText ? (
        <SnapshotBadge
          tone="blue"
          icon={VerifiedIcon}
          className="max-w-[260px] text-[10px] tracking-[0.15px]"
        >
          {verifiedText}
        </SnapshotBadge>
      ) : null}
    </div>
  );
}

export function SnapshotSectionCard({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col items-start gap-4 rounded-lg bg-white p-4 shadow-[0px_2px_2px_rgba(0,0,0,0.10),0px_4px_3px_rgba(0,0,0,0.10)]",
        className
      )}
    >
      <div className="font-mono text-[12px] font-normal uppercase leading-[1.5] text-general-muted-foreground">
        {eyebrow}
      </div>
      {title || description ? (
        <div className="flex flex-col items-start gap-1.5">
          {title ? (
            <h2 className="text-[24px] font-semibold leading-[1.2] tracking-[-0.48px] text-general-foreground">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="text-[12px] font-medium leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SnapshotMetricTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 rounded-lg border border-general-border bg-[#fafafa] p-3">
      <div className="flex items-center gap-1.5 text-[12px] font-medium leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
        {Icon ? <Icon className="size-4 shrink-0" /> : null}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "text-[24px] font-semibold leading-[1.2] tracking-[-0.48px]",
          accent ? "text-red-600" : "text-general-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function SnapshotProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

  return (
    <div className={cn("flex h-1.5 w-full overflow-hidden rounded-[300px] bg-[#e5e5e5]", className)}>
      <div
        className="h-full bg-gradient-to-r from-general-primary to-general-primary-gradient-to"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function SnapshotVisibilityMeter({
  notVisible,
  weak,
  visible,
}: {
  notVisible: number;
  weak: number;
  visible: number;
}) {
  const total = Math.max(1, notVisible + weak + visible);
  const segments = [
    { label: "not visible", value: notVisible, className: "bg-red-600" },
    { label: "weak", value: weak, className: "bg-orange-500" },
    { label: "visible", value: visible, className: "bg-green-600" },
  ];

  return (
    <div className="w-full rounded-lg border border-general-border p-3">
      <div className="flex w-full items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[12px] font-medium leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
            Search visibility
          </div>
          <p className="text-[12px] font-normal leading-[1.5] tracking-[0.18px] text-general-muted-foreground/60">
            Across the {total} high-value searches tracked
          </p>
        </div>
        <div className="flex items-center gap-0.5 text-[12px] leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
          <span className="text-[14px] font-medium tracking-[0.07px] text-general-primary">
            {visible}
          </span>
          <span>/</span>
          <span>{total} visible</span>
        </div>
      </div>
      <div className="mt-2 flex h-[23px] w-full overflow-hidden rounded-[300px]">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={cn(
              "flex h-full min-w-0 items-center justify-center text-[12px] font-medium leading-[1.5] tracking-[0.18px] text-white",
              segment.className
            )}
            style={{ width: `${(segment.value / total) * 100}%` }}
          >
            {segment.value > 0 ? (
              <span className="truncate px-2">
                {segment.value} <span className="opacity-60">{segment.label}</span>
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SnapshotDataTable({
  headers,
  rows,
  minWidth = 760,
}: {
  headers: { label: string; className?: string }[];
  rows: React.ReactNode[][];
  minWidth?: number;
}) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-general-border bg-white">
      <div className="overflow-x-auto">
        <table
          className="w-full table-fixed border-collapse"
          style={{ minWidth }}
        >
          <thead>
            <tr className="bg-[#fafafa]">
              {headers.map((header) => (
                <th
                  key={header.label}
                  className={cn(
                    "border-b border-general-border px-2 py-[7.5px] text-left text-[14px] font-medium leading-[1.5] tracking-[0.07px] text-general-muted-foreground",
                    header.className
                  )}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border-b border-general-border px-2 py-2.5 align-middle text-[14px] font-normal leading-[1.5] tracking-[0.07px] text-general-foreground last:border-b"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-2 py-8 text-center text-[14px] text-general-muted-foreground"
                >
                  No rows available for this section yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
