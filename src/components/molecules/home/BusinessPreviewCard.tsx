"use client";

import { useState, type MouseEvent } from "react";
import {
	AlertTriangle,
	ArrowRight,
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
} from "@/hooks/use-health-status";
import {
	HEALTH_LABEL,
	HealthDailyMetrics,
	HealthSignalPill,
	HealthTrendIndicator,
	healthTooltipNarrativeBlock,
} from "./health-signal-ui";
import { HealthStreakSheet } from "./HealthStreakSheet";

function HealthTooltipBody({ s }: { s: HealthStatusRow }) {
	const color = s.health_color;
	const hasAny = s.recent_leads != null || s.recent_traffic != null;
	const narrative =
		color && color !== "gray"
			? healthTooltipNarrativeBlock(color, s.confidence ?? "medium")
			: null;

	return (
		<div className="w-56 space-y-2 py-0.5">
			<div className="flex items-center justify-between gap-2">
				<span className="text-[11px] font-medium text-foreground">
					{color ? HEALTH_LABEL[color] : "Insufficient data"}
					{healthStatusStreakLabel(s)}
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

			{hasAny && (
				<div className="space-y-1.5 border-t border-border/50 pt-2">
					<HealthDailyMetrics status={s} />
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

function healthStatusStreakLabel(status: HealthStatusRow) {
	const days = status.current_streak?.days;
	if (!days) return "";
	return ` · ${days}-day streak`;
}

// ─── Health badge wrapped in a metrics tooltip ─────────────────────────────────

function HealthBadge({
	healthStatus,
	businessId,
	businessName,
}: {
	healthStatus: HealthStatusRow;
	businessId: string;
	businessName: string;
}) {
	const [sheetOpen, setSheetOpen] = useState(false);
	const color = healthStatus.health_color;
	if (!color) return null;

	const label = HEALTH_LABEL[color];

	return (
		<div
			className="shrink-0"
			onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
			onPointerDown={event => {
				// Sheet portals still bubble through this React tree. Only isolate
				// pointer events that originated inside the visible badge itself.
				if (event.currentTarget.contains(event.target as Node)) {
					event.stopPropagation();
				}
			}}
		>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						className="group flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full transition-transform duration-150 hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						aria-label={`${label}${healthStatusStreakLabel(healthStatus)}. Open daily details`}
						aria-haspopup="dialog"
						aria-expanded={sheetOpen}
						onClick={(event: MouseEvent<HTMLButtonElement>) => {
							event.stopPropagation();
							setSheetOpen(true);
						}}
					>
						<HealthSignalPill
							color={color}
							streakDays={healthStatus.current_streak?.days}
							className="transition-[filter,box-shadow] duration-150 group-hover:brightness-[0.97] group-hover:shadow-xs"
						/>
						<HealthTrendIndicator trend={healthStatus.trend_arrow} />
					</button>
				</TooltipTrigger>

				<TooltipContent
					side="bottom"
					align="end"
					sideOffset={6}
					hideArrow
					className="min-w-[232px] max-w-[280px] border border-border bg-background px-3 py-2.5 text-foreground shadow-xl ring-1 ring-black/5"
				>
					<HealthTooltipBody s={healthStatus} />
				</TooltipContent>
			</Tooltip>
			<HealthStreakSheet
				businessId={businessId}
				businessName={businessName}
				status={healthStatus}
				open={sheetOpen}
				onOpenChange={setSheetOpen}
			/>
		</div>
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
	businessId,
	url,
	graph,
	impressions,
	clicks,
	goals,
	isGa4Connected,
	period,
	healthStatus,
	onConnectGoogle,
	onClick,
}: {
	name?: string;
	businessId?: string;
	url?: string;
	graph?: PreviewGraph;
	impressions?: PreviewStats;
	clicks?: PreviewStats;
	goals?: PreviewStats;
	isGa4Connected?: boolean;
	period?: HomeTimePeriodValue;
	healthStatus?: HealthStatusRow;
	onConnectGoogle?: () => void;
	onClick?: () => void;
}) {
	const showConnectAnalytics = isGa4Connected !== true;
	const showConnectGoogle =
		Object.keys(clicks || {}).length === 0 ||
		Object.keys(impressions || {}).length === 0;

	const domain = normalizeUrlDomain(url || "");

	if (showConnectGoogle) return null;

	return (
		<Card
			onClick={onClick}
			className="h-full cursor-pointer overflow-hidden rounded-lg border border-[#f4f4f4] p-2 shadow-none transition-[border-color,box-shadow] duration-150 hover:border-border hover:shadow-xs gap-4 flex flex-col"
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
					{healthStatus && businessId && (
						<HealthBadge
							healthStatus={healthStatus}
							businessId={businessId}
							businessName={name || domain}
						/>
					)}
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
