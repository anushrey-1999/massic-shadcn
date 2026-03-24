"use client";

import { useState, type MouseEvent } from "react";
import {
	AlertTriangle,
	ArrowRight,
	TrendingUp,
	TrendingDown,
	Minus,
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
import type { HealthStatusRow, HealthColor, TrendArrow } from "@/hooks/use-health-status";

// PRD §2.1 — signal colors
const HEALTH_BORDER_COLOR: Record<NonNullable<HealthColor>, string> = {
	green: "#639922",
	amber: "#EF9F27",
	red:   "#E24B4A",
	gray:  "#B4B2A9",
};

const HEALTH_LABEL: Record<NonNullable<HealthColor>, string> = {
	green: "Healthy",
	amber: "Watch Closely",
	red:   "Needs Attention",
	gray:  "",
};

// Squiggly trend-line icons (TrendingUp / TrendingDown / Minus)
function TrendIcon({ arrow, color }: { arrow: TrendArrow; color: string }) {
	const cls = "h-3.5 w-3.5 shrink-0";
	if (arrow === "up")   return <TrendingUp   className={cls} style={{ color }} />;
	if (arrow === "down") return <TrendingDown  className={cls} style={{ color }} />;
	if (arrow === "flat") return <Minus         className={cls} style={{ color }} />;
	return null;
}

// ─── Tooltip helpers ──────────────────────────────────────────────────────────

// Score → colored dot matching PRD signal colors
// score: 100 = green, 50 = amber, 0 = red, null = no data
function ScoreDot({ score }: { score: number | null }) {
	if (score == null) return null;
	const color =
		score >= 100 ? HEALTH_BORDER_COLOR.green
		: score >= 50 ? HEALTH_BORDER_COLOR.amber
		:               HEALTH_BORDER_COLOR.red;
	return (
		<span
			className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
			style={{ backgroundColor: color }}
		/>
	);
}

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
	score,
}: {
	icon: React.ReactNode;
	label: string;
	recent: number | null;
	baseline: number | null;
	changePct: number | null;
	score: number | null;
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
				<ScoreDot score={score} />
			</div>
		</div>
	);
}

function HealthTooltipBody({ s }: { s: HealthStatusRow }) {
	const color = s.health_color;
	const hasAny = s.recent_leads != null || s.recent_traffic != null;

	return (
		<div className="w-56 space-y-2 py-0.5">
			{/* Header */}
			<div className="flex items-center justify-between gap-2">
				<span className="text-[11px] font-semibold text-foreground">
					{color && color !== "gray" ? HEALTH_LABEL[color] : "Insufficient data"}
				</span>
				<span className="text-[10px] text-muted-foreground shrink-0">14d vs prior 14d</span>
			</div>

			{/* Metric rows — Goals (70% weight) first, Clicks (30%) second */}
			{hasAny && (
				<div className="space-y-1.5 border-t border-border/50 pt-2">
					<MetricRow
						icon={<Target className="h-3 w-3 text-emerald-600 shrink-0" />}
						label="Goals"
						recent={s.recent_leads}
						baseline={s.baseline_leads}
						changePct={s.lead_change_pct}
						score={s.leads_score}
					/>
					<MetricRow
						icon={<MousePointerClick className="h-3 w-3 text-blue-600 rotate-90 shrink-0" />}
						label="Clicks"
						recent={s.recent_traffic}
						baseline={s.baseline_traffic}
						changePct={s.traffic_change_pct}
						score={s.traffic_score}
					/>
				</div>
			)}

			{/* Confidence + stale notice */}
			<div className="flex items-center justify-between border-t border-border/50 pt-1.5">
				{s.confidence && (
					<span className="text-[10px] text-muted-foreground">
						Confidence: <span className="font-medium">{s.confidence}</span>
					</span>
				)}
				{s.is_stale && (
					<span className="text-[10px] text-amber-600 ml-auto">stale data</span>
				)}
			</div>
		</div>
	);
}

// ─── Health badge (label + trend icon) wrapped in a metrics tooltip ───────────

function HealthBadge({ healthStatus }: { healthStatus: HealthStatusRow }) {
	const color = healthStatus.health_color;
	if (!color || color === "gray" || !healthStatus.ga4_connected) return null;

	const borderColor = HEALTH_BORDER_COLOR[color];
	const label       = HEALTH_LABEL[color];
	const arrow       = healthStatus.trend_arrow;

	return (
		<Tooltip>
			<TooltipTrigger
				asChild
				onClick={(e: MouseEvent) => e.stopPropagation()}
			>
				<div className="flex items-center gap-1 shrink-0 cursor-default">
					<span
						className="text-xs font-medium leading-none"
						style={{ color: borderColor }}
					>
						{label}
					</span>
					{arrow && arrow !== "none" && (
						<TrendIcon arrow={arrow} color={borderColor} />
					)}
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
				className="h-full w-full object-contain"
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

	// Compute left-border color from health status (PRD §2.1)
	const healthColor = healthStatus?.health_color ?? null;
	const borderLeftStyle =
		healthColor && HEALTH_BORDER_COLOR[healthColor]
			? { borderLeft: `4px solid ${HEALTH_BORDER_COLOR[healthColor]}` }
			: undefined;

	return (
		<Card
			onClick={onClick}
			style={borderLeftStyle}
			className="overflow-hidden border border-[#f4f4f4] p-2 shadow-none rounded-lg gap-4 flex flex-col h-full cursor-pointer"
		>
			<CardTitle className="text-sm font-medium p-0 shrink-0">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<BusinessIcon website={url} name={name} />
						<Typography
							variant="p"
							className="text-base font-mono text-general-unofficial-foreground-alt truncate"
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
							<span className="text-xs font-medium text-gray-500 leading-0 ">
								{formatTotal(impressions?.Total)}
							</span>
						</div>
						<StatsBadge
							value={parsePercent(impressions?.Diff, impressions?.Trend)}
							variant="big"
							className="flex items-baseline"
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
						<div className="flex items-center gap-0.5 leading-[150%]">
							<MousePointerClick className="text-blue-600 w-3 h-3 rotate-90" />
							<span className="text-xs font-medium  text-blue-600">
								{formatTotal(clicks?.Total)}
							</span>
						</div>
						<StatsBadge
							value={parsePercent(clicks?.Diff, clicks?.Trend)}
							variant="big"
							className="flex items-baseline"
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
						<div className="flex items-center gap-0.5 leading-[150%]">
							<Target className="text-emerald-600 w-3 h-3 " />
							<span className="text-xs font-medium text-emerald-600">
								{formatTotal(goals?.Total)}
							</span>
						</div>
						<StatsBadge
							value={parsePercent(goals?.Diff, goals?.Trend)}
							variant="big"
							className="flex items-baseline"
						/>
					</div>
				</div>
			</CardFooter>
		</Card>
	);
}
