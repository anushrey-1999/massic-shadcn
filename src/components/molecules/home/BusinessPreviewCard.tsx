"use client";

import { useState, type MouseEvent } from "react";
import {
	AlertTriangle,
	ArrowRight,
	ArrowUp,
	ArrowDown,
	Eye,
	MousePointerClick,
	Target,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizeDomainForFavicon } from "@/utils/utils";
import { StatsBadge } from "@/components/molecules/analytics";
import {
	MiniAreaChart,
	type PreviewGraph,
	type HomeTimePeriodValue,
} from "@/components/molecules/home/MiniAreaChart";
import { Typography } from "@/components/ui/typography";
import {
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from "@/components/ui/tooltip";
import type {
	HealthStatusRow,
	HealthColor,
	Confidence,
} from "@/hooks/use-health-status";

// PRD §2.1 — signal colors
const HEALTH_ACCENT_COLOR: Record<NonNullable<HealthColor>, string> = {
	green: "#639922",
	amber: "#EF9F27",
	red:   "#E24B4A",
	gray:  "#B4B2A9",
};

const HEALTH_LABEL: Record<NonNullable<HealthColor>, string> = {
	green: "Strong",
	amber: "Dip",
	red:   "Check",
	gray:  "No Signal",
};

const HEALTH_BADGE_CLASSNAME: Record<NonNullable<HealthColor>, string> = {
	green: "border-transparent bg-[#EEF6E4] text-[#639922]",
	amber: "border-transparent bg-[#FFF3E2] text-[#EF9F27]",
	red: "border-transparent bg-[#FDECEC] text-[#E24B4A]",
	gray: "border-transparent bg-[#F2F1EE] text-[#7E7B73]",
};

/** Strong / Dip / Check × (high | medium vs low) — medium uses high copy per product spec. */
const HEALTH_TOOLTIP_NARRATIVE: Record<
	"green" | "amber" | "red",
	{ strongSignal: { subtitle: string; footer: string }; thinData: { subtitle: string; footer: string } }
> = {
	green: {
		strongSignal: {
			subtitle: "Performing well and holding steady",
			footer: "Strong signal · 14 days of data",
		},
		thinData: {
			subtitle: "Looking good so far — check back as more data comes in",
			footer: "Thin data · too early to confirm",
		},
	},
	amber: {
		strongSignal: {
			subtitle: "Healthy, but momentum is softening",
			footer: "Strong signal · 14 days of data",
		},
		thinData: {
			subtitle: "Some soft signals — could be noise",
			footer: "Thin data · too early to act on this",
		},
	},
	red: {
		strongSignal: {
			subtitle: "Traffic is down and the pattern is consistent",
			footer: "Strong signal · 14 days of data",
		},
		thinData: {
			subtitle: "Some dips, but not enough data to confirm a real problem",
			footer: "Thin data · hold off before drawing conclusions",
		},
	},
};

function healthTooltipNarrativeBlock(
	color: NonNullable<HealthColor>,
	confidence: Confidence
): { subtitle: string; footer: string } | null {
	if (color === "gray") return null;
	const row = HEALTH_TOOLTIP_NARRATIVE[color];
	const thin = confidence === "low";
	return thin ? row.thinData : row.strongSignal;
}

// ─── Tooltip helpers ──────────────────────────────────────────────────────────

function formatCompact(n: number | null | undefined): string {
	if (n == null) return "—";
	const abs = Math.abs(n);
	if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (abs >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
	return String(Math.round(n));
}

function formatPct(pct: number | null | undefined): string {
	if (pct == null) return "—";
	const rounded = Math.round(pct * 100);
	return rounded >= 0 ? `+${rounded}%` : `${rounded}%`;
}

function MetricRow({
	icon,
	label,
	recent,
	baseline,
	changePct,
}: {
	icon: React.ReactNode;
	label: string;
	recent: number | null;
	baseline: number | null;
	changePct: number | null;
}) {
	if (recent == null && baseline == null) return null;

	const pctColor = changePct == null ? "text-muted-foreground"
	               : changePct >= 0    ? "text-green-600"
	               :                     "text-red-600";

	return (
		<div className="flex items-center justify-between gap-3">
			<div className="flex items-center gap-1 shrink-0">
				{icon}
				<span className="text-[11px] text-muted-foreground">{label}</span>
			</div>
			<div className="flex items-center gap-1 text-[11px] tabular-nums">
				<span className="font-medium text-foreground">{formatCompact(recent)}</span>
				<span className={cn("font-semibold", pctColor)}>{formatPct(changePct)}</span>
				<span className="text-muted-foreground text-[10px]">vs {formatCompact(baseline)}</span>
			</div>
		</div>
	);
}

function HealthTooltipBody({ s }: { s: HealthStatusRow }) {
	const color = s.health_color;
	const hasAny = s.recent_leads != null || s.recent_traffic != null;
	const narrative =
		color && color !== "gray"
			? healthTooltipNarrativeBlock(color, s.confidence ?? "medium")
			: null;

	return (
		<div className="w-56 space-y-2 py-0.5">
			{/* Header */}
			<div className="flex items-center justify-between gap-2">
				<span className="text-[11px] font-semibold text-foreground">
					{color ? HEALTH_LABEL[color] : "Insufficient data"}
				</span>
				<span className="text-[10px] text-muted-foreground shrink-0">14d vs prior 14d</span>
			</div>

			{narrative && (
				<p className="text-[10px] leading-snug text-muted-foreground">
					{narrative.subtitle}
				</p>
			)}

			{color === "gray" && (
				<p className="text-[10px] leading-snug text-muted-foreground">
					{s.reason_text ?? "Insufficient data to score"}
				</p>
			)}

			{/* Metric rows — Goals (70% weight) first, Clicks (30%) second */}
			{hasAny && (
				<div className="space-y-1.5 border-t border-border/50 pt-2">
					<MetricRow
						icon={<Target className="h-3 w-3 text-emerald-600 shrink-0" />}
						label="Goals"
						recent={s.recent_leads}
						baseline={s.baseline_leads}
						changePct={s.lead_change_pct}
					/>
					<MetricRow
						icon={<MousePointerClick className="h-3 w-3 text-blue-600 rotate-90 shrink-0" />}
						label="Clicks"
						recent={s.recent_traffic}
						baseline={s.baseline_traffic}
						changePct={s.traffic_change_pct}
					/>
				</div>
			)}

			{narrative && (
				<div className="border-t border-border/50 pt-1.5 space-y-1">
					<p className="text-[10px] text-muted-foreground leading-snug">
						{narrative.footer}
					</p>
					{s.is_stale && (
						<span className="text-[10px] text-amber-600">Stale data</span>
					)}
				</div>
			)}

			{color === "gray" && s.is_stale && (
				<div className="border-t border-border/50 pt-1.5">
					<span className="text-[10px] text-amber-600">Stale data</span>
				</div>
			)}
		</div>
	);
}

// ─── Health badge wrapped in a metrics tooltip ─────────────────────────────────

function HealthBadge({ healthStatus }: { healthStatus: HealthStatusRow }) {
	const color = healthStatus.health_color;
	if (!color) return null;

	const badgeColor = HEALTH_ACCENT_COLOR[color];
	const label = HEALTH_LABEL[color];
	const trendArrow = healthStatus.trend_arrow;

	const trendIndicator =
		color === "gray" || trendArrow === "flat" || trendArrow === "none" || !trendArrow ? (
			<span className="text-[11px] font-semibold leading-none text-[#667085]">-</span>
		) : trendArrow === "up" ? (
			<ArrowUp className="h-3 w-3 shrink-0 text-[#667085]" strokeWidth={2} />
		) : (
			<ArrowDown className="h-3 w-3 shrink-0 text-[#667085]" strokeWidth={2} />
		);

	return (
		<Tooltip>
			<TooltipTrigger
				asChild
				onClick={(e: MouseEvent) => e.stopPropagation()}
			>
				<div
					className="flex shrink-0 items-center gap-1.5 cursor-default"
				>
					<div
						className={cn(
							"inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium leading-none shrink-0",
							HEALTH_BADGE_CLASSNAME[color]
						)}
					>
						<span
							className="h-2 w-2 rounded-full shrink-0"
							style={{ backgroundColor: badgeColor }}
						/>
						{label}
					</div>
					{trendIndicator}
				</div>
			</TooltipTrigger>

			<TooltipContent
				side="bottom"
				align="end"
				sideOffset={6}
				hideArrow
				className="bg-background text-foreground border border-border shadow-xl ring-1 ring-black/5 min-w-[232px] max-w-[280px] px-3 py-2.5"
			>
				<HealthTooltipBody s={healthStatus} />
			</TooltipContent>
		</Tooltip>
	);
}

type PreviewStats = {
	Total?: string | number;
	Trend?: "up" | "down" | string;
	Diff?: string | number;
};

function formatTotal(value: string | number | undefined) {
	if (value === undefined || value === null) return "—";
	return String(value);
}

function parsePercent(
	diff: string | number | undefined,
	trend: string | undefined,
): number {
	if (diff === undefined || diff === null) return 0;
	const raw =
		typeof diff === "number"
			? diff
			: Number(String(diff).replace(/[^0-9.]/g, ""));
	if (!Number.isFinite(raw)) return 0;
	return (trend || "").toLowerCase() === "down" ? -raw : raw;
}

const FAVICON_URL = "https://www.google.com/s2/favicons?domain=";

interface BusinessIconProps {
	website?: string;
	name?: string;
}

function BusinessIcon({ website, name }: BusinessIconProps) {
	const [imgError, setImgError] = useState(false);
	const fallbackInitial = name?.charAt(0).toUpperCase() || "B";

	const normalizedDomain = normalizeDomainForFavicon(website);

	if (!normalizedDomain || imgError) {
		return (
			<div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border border-dashed border-black dark:border-white text-[9px] font-medium text-foreground aspect-square">
				{fallbackInitial}
			</div>
		);
	}

	return (
		<div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs overflow-hidden bg-accent aspect-square">
			<img
				src={`${FAVICON_URL}${normalizedDomain}`}
				alt=""
				width={16}
				height={16}
				className="h-full w-full object-contain grayscale"
				onError={() => setImgError(true)}
			/>
		</div>
	);
}

function normalizeUrlDomain(input: string) {
	const raw = (input || "").trim().toLowerCase();
	if (!raw) return "";
	try {
		const withProto = raw.startsWith("http") ? raw : `https://${raw}`;
		const url = new URL(withProto);
		return url.hostname.replace(/^www\./, "");
	} catch {
		return (
			raw
				.replace(/^https?:\/\//, "")
				.replace(/^www\./, "")
				.split("/")[0] || raw
		);
	}
}

export function BusinessPreviewCard({
	name,
	url,
	graph,
	impressions,
	clicks,
	goals,
	period,
	healthStatus,
	onConnectGoogle,
	onClick,
}: {
	name?: string;
	url?: string;
	graph?: PreviewGraph;
	impressions?: PreviewStats;
	clicks?: PreviewStats;
	goals?: PreviewStats;
	period?: HomeTimePeriodValue;
	healthStatus?: HealthStatusRow;
	onConnectGoogle?: () => void;
	onClick?: () => void;
}) {
	const showConnectAnalytics = Object.keys(goals || {}).length === 0;
	const showConnectGoogle =
		Object.keys(clicks || {}).length === 0 ||
		Object.keys(impressions || {}).length === 0;

	const domain = normalizeUrlDomain(url || "");

	if (showConnectGoogle) return null;

	return (
		<Card
			onClick={onClick}
			className="overflow-hidden border border-[#f4f4f4] p-2 shadow-none rounded-lg gap-4 flex flex-col h-full cursor-pointer"
		>
			<CardTitle className="text-sm font-medium p-0 shrink-0">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<BusinessIcon website={url} name={name} />
						<Typography
							variant="p"
							className="min-w-0 flex-1 truncate text-base font-mono text-general-unofficial-foreground-alt"
						>
							{name || domain}
						</Typography>
					</div>
					{healthStatus && <HealthBadge healthStatus={healthStatus} />}
				</div>
			</CardTitle>

			{/* <a
				href={href}
				target={isExternal ? "_blank" : undefined}
				rel={isExternal ? "noopener noreferrer" : undefined}
				className="w-full text-left cursor-pointer block"
			> */}

			<CardContent className="p-0 flex-1 flex flex-col">
				{/* Connect Google Analytics - START */}
				{showConnectAnalytics && (
					<div className="rounded-md px-2 py-1 flex items-center justify-between mb-2 bg-[#FEF2F2] shrink-0">
						<div className="flex items-center gap-2 text-red-600">
							<AlertTriangle className="h-4 w-4" />
							<span className="text-xs font-medium">
								Connect Google Analytics
							</span>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-6 w-6 text-red-600"
							onClick={(e: MouseEvent) => {
								e.preventDefault();
								e.stopPropagation();
								onConnectGoogle?.();
							}}
						>
							<ArrowRight className="h-4 w-4" />
						</Button>
					</div>
				)}
				{/* Connect Google Analytics -- END */}
				<div className="flex-1 h-full flex items-end ">
					<MiniAreaChart graph={graph} period={period} />
				</div>
			</CardContent>
			{/* </a> */}

			<CardFooter className="w-full flex justify-between px-0 gap-0 shrink-0">
				{/* Left metric (impressions) */}
				<div className="relative flex-1 h-7 ">
					<svg
						className="absolute inset-0 w-full h-full"
						viewBox="0 0 100 28"
						preserveAspectRatio="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path
							d="M 5 0 Q 0 0 0 5 L 0 23 Q 0 28 5 28 L 94 28 L 100 14 L 94 0 Z"
							className="fill-foreground-light "
							strokeWidth="0.5"
						/>
					</svg>
					<div className="relative h-full flex items-center justify-center gap-1.5 ">
						<div className="flex items-center gap-0.5">
							<Eye className="text-gray-500 w-3 h-3 " />
							<span className="text-xs font-medium text-general-unofficial-foreground-alt leading-none">
								{formatTotal(impressions?.Total)}
							</span>
						</div>
						<StatsBadge
							value={parsePercent(impressions?.Diff, impressions?.Trend)}
							variant="big"
							className="flex items-center text-xs"
						/>
					</div>
				</div>

				{/* Middle metric (clicks) */}
				<div className="relative flex-1 h-7 flex justify-center">
					<svg
						className="absolute inset-0 w-full h-full"
						viewBox="0 0 100 28"
						preserveAspectRatio="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path
							d="M 0 0 L 94 0 L 100 14 L 94 28 L 0 28 L 6 14 Z"
							className="fill-foreground-light "
							strokeWidth="0.5"
						/>
					</svg>
					<div className="relative h-full flex items-center justify-center gap-1.5">
						<div className="flex items-center gap-0.5">
							<MousePointerClick className="text-blue-600 w-3 h-3 rotate-90" />
							<span className="text-xs font-medium text-general-unofficial-foreground-alt leading-none">
								{formatTotal(clicks?.Total)}
							</span>
						</div>
						<StatsBadge
							value={parsePercent(clicks?.Diff, clicks?.Trend)}
							variant="big"
							className="flex items-center text-xs"
						/>
					</div>
				</div>

				{/* Right metric (goals) */}
				<div className="relative flex-1 h-7">
					<svg
						className="absolute inset-0 w-full h-full"
						viewBox="0 0 100 28"
						preserveAspectRatio="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path
							d="M 0 0 L 95 0 Q 100 0 100 5 L 100 23 Q 100 28 95 28 L 0 28 L 6 14 Z"
							className="fill-foreground-light "
							strokeWidth="0.5"
						/>
					</svg>
					<div className="relative h-full flex items-center justify-center gap-1.5">
						<div className="flex items-center gap-0.5">
							<Target className="text-emerald-600 w-3 h-3 " />
							<span className="text-xs font-medium text-general-unofficial-foreground-alt leading-none">
								{formatTotal(goals?.Total)}
							</span>
						</div>
						<StatsBadge
							value={parsePercent(goals?.Diff, goals?.Trend)}
							variant="big"
							className="flex items-center text-xs"
						/>
					</div>
				</div>
			</CardFooter>
		</Card>
	);
}
