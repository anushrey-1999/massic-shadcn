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
				<div className="flex items-center gap-2">
					<BusinessIcon website={url} name={name} />
					<Typography
						variant="p"
						className="text-base font-mono text-general-unofficial-foreground-alt"
					>
						{name || domain}
					</Typography>
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
							<Eye className="text-[#8662D0] w-3 h-3 " />
							<span className="text-xs font-medium text-[#8662D0] leading-0 ">
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
							<Target className="text-general-unofficial-foreground-alt w-3 h-3 " />
							<span className="text-xs font-medium text-general-unofficial-foreground-alt">
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
