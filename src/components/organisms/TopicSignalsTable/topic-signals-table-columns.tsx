"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpRight,
  Calendar,
  CalendarCheck,
  Clock3,
  Gauge,
  Globe2,
  Hash,
  Signal,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { Typography } from "@/components/ui/typography";
import { formatVolume } from "@/lib/format";
import type { TopicSignalLabel, TopicSignalRow } from "@/types/topic-signals-types";
import { TopicSignalLabelBadge } from "./topic-signal-label-badge";

const textOperators = [
  { label: "Contains", value: "iLike" as const },
  { label: "Is", value: "eq" as const },
  { label: "Does not contain", value: "notILike" as const },
];

const labelOptions: TopicSignalLabel[] = [
  "Emerging",
  "Rising",
  "Seasonal",
  "Seasonal+Rising",
  "Breakout",
  "Steady",
];

function formatPercent(value?: number | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

function formatNumber(value?: number | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  return String(Math.round(value * 10) / 10);
}

function PeakMonthsCell({ months }: { months?: string[] | null }) {
  if (!months?.length) return <span className="text-muted-foreground">—</span>;
  const visible = months.slice(0, 2);
  const overflow = months.length - visible.length;
  return (
    <div className="flex min-w-[112px] items-center gap-1">
      {visible.map((month) => (
        <Badge
          key={month}
          variant="outline"
          className="h-6 rounded-md border-blue-200 bg-blue-50 px-2 text-[11px] text-blue-700"
        >
          {month.slice(0, 3)}
        </Badge>
      ))}
      {overflow > 0 ? (
        <Badge variant="secondary" className="h-6 rounded-md px-2 text-[11px]">
          +{overflow}
        </Badge>
      ) : null}
    </div>
  );
}

function TimingCell({
  rampState,
  monthsToPeak,
}: {
  rampState?: TopicSignalRow["ramp_state"];
  monthsToPeak?: number | null;
}) {
  if (!rampState) return <span className="text-muted-foreground">—</span>;
  const config = {
    peak: {
      label: "Peak",
      detail: "now",
      icon: CalendarCheck,
      className: "border-rose-200 bg-rose-50 text-rose-700",
    },
    ramping: {
      label: "Ramping",
      detail: typeof monthsToPeak === "number" ? `${monthsToPeak} mo` : "soon",
      icon: TrendingUp,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    pre: {
      label: "Pre",
      detail: typeof monthsToPeak === "number" ? `${monthsToPeak} mo` : "later",
      icon: Clock3,
      className: "border-sky-200 bg-sky-50 text-sky-700",
    },
    post: {
      label: "Post",
      detail: "after",
      icon: TrendingDown,
      className: "border-slate-200 bg-slate-50 text-slate-600",
    },
  }[rampState];
  const Icon = config.icon;
  return (
    <div className="inline-flex min-w-[118px] items-center justify-between rounded-full border bg-white p-0.5">
      <span
        className={`inline-flex h-7 min-w-[78px] items-center justify-center gap-1.5 rounded-full border px-2 text-[11px] font-medium ${config.className}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </span>
      <span className="px-2 text-[11px] font-medium text-muted-foreground">
        {config.detail}
      </span>
    </div>
  );
}

export function getTopicSignalsTableColumns(): ColumnDef<TopicSignalRow>[] {
  return [
    {
      id: "term",
      accessorKey: "term",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Topic" />,
      cell: ({ row }) => (
        <div className="group inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-muted">
          <Typography
            variant="p"
            className="truncate font-medium text-general-primary group-hover:underline"
            title={row.original.term}
          >
            {row.original.term}
          </Typography>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-general-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      ),
      meta: {
        label: "Topic",
        placeholder: "Search topics...",
        variant: "text",
        operators: textOperators,
        icon: Sparkles,
      },
      enableSorting: true,
      enableColumnFilter: true,
      size: 280,
      minSize: 220,
    },
    {
      id: "label",
      accessorKey: "label",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Label" />,
      cell: ({ row }) => <TopicSignalLabelBadge label={row.original.label} />,
      meta: {
        label: "Label",
        variant: "multiSelect",
        options: labelOptions.map((label) => ({ label, value: label })),
        operators: [{ label: "Is any of", value: "inArray" as const }],
        closeOnSelect: true,
        icon: Signal,
      },
      enableSorting: true,
      enableColumnFilter: true,
      size: 170,
    },
    {
      id: "trend_score",
      accessorKey: "trend_score",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Score" />,
      cell: ({ row }) => <RelevancePill score={row.original.trend_score || 0} />,
      meta: {
        label: "Trend Score",
        variant: "range",
        range: [0, 1],
        icon: TrendingUp,
      },
      enableSorting: true,
      enableColumnFilter: true,
      size: 130,
    },
    {
      id: "confidence",
      accessorKey: "confidence",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Confidence" />,
      cell: ({ row }) => <RelevancePill score={row.original.confidence || 0} />,
      meta: {
        label: "Confidence",
        variant: "range",
        range: [0, 1],
        icon: Gauge,
      },
      enableSorting: true,
      enableColumnFilter: true,
      size: 140,
    },
    {
      id: "growth",
      accessorFn: (row) => row.growth?.annualized_pct ?? null,
      header: ({ column }) => <DataTableColumnHeader column={column} label="Growth" />,
      cell: ({ row }) => (
        <Typography variant="p">
          {formatPercent(row.original.growth?.annualized_pct)}
        </Typography>
      ),
      enableSorting: true,
      enableColumnFilter: false,
      size: 110,
    },
    {
      id: "trend_geography",
      accessorKey: "trend_geography",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Geo" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.trend_geography}
        </Badge>
      ),
      meta: {
        label: "Geo",
        variant: "multiSelect",
        options: ["local", "regional", "national"].map((value) => ({
          label: value,
          value,
        })),
        operators: [{ label: "Is any of", value: "inArray" as const }],
        closeOnSelect: true,
        icon: Globe2,
      },
      enableSorting: true,
      enableColumnFilter: true,
      size: 120,
    },
    {
      id: "local_volume",
      accessorKey: "local_volume",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Volume" />,
      cell: ({ row }) => (
        <Typography variant="p">{formatVolume(row.original.local_volume || 0)}</Typography>
      ),
      meta: {
        label: "Volume",
        variant: "range",
        range: [0, 100000],
        icon: Hash,
      },
      enableSorting: true,
      enableColumnFilter: true,
      size: 120,
    },
    {
      id: "seasonal_peak_months",
      accessorKey: "seasonal_peak_months",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Peaks" />,
      cell: ({ row }) => <PeakMonthsCell months={row.original.seasonal_peak_months} />,
      enableSorting: false,
      enableColumnFilter: false,
      size: 140,
    },
    {
      id: "ramp_state",
      accessorKey: "ramp_state",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Timing" />,
      cell: ({ row }) => (
        <TimingCell
          rampState={row.original.ramp_state}
          monthsToPeak={row.original.months_to_peak}
        />
      ),
      meta: {
        label: "Timing",
        variant: "multiSelect",
        options: ["pre", "ramping", "peak", "post"].map((value) => ({
          label: value,
          value,
        })),
        operators: [{ label: "Is any of", value: "inArray" as const }],
        closeOnSelect: true,
        icon: Calendar,
      },
      enableSorting: true,
      enableColumnFilter: true,
      size: 170,
    },
    {
      id: "momentum",
      accessorKey: "momentum",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Momentum" />,
      cell: ({ row }) => <Typography variant="p">{formatNumber(row.original.momentum)}</Typography>,
      meta: {
        label: "Momentum",
        variant: "range",
        range: [-100, 100],
        icon: TrendingUp,
      },
      enableSorting: true,
      enableColumnFilter: true,
      size: 130,
    },
    {
      id: "display_rank",
      accessorKey: "display_rank",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Rank" />,
      cell: ({ row }) => <Typography variant="p">{row.original.display_rank}</Typography>,
      enableSorting: true,
      enableColumnFilter: false,
      size: 90,
    },
  ];
}
