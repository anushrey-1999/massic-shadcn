"use client";

import { useMemo, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/auth-store";
import { useBusinessProfiles } from "@/hooks/use-business-profiles";
import {
	useBusinessPreviews,
	type BusinessPreviewItem,
} from "@/hooks/use-business-previews";
import { useGoogleAccounts } from "@/hooks/use-google-accounts";
import { cn } from "@/lib/utils";
import { BusinessPreviewCard } from "@/components/molecules/home/BusinessPreviewCard";
import { ProspectsCard } from "@/components/molecules/home/ProspectsCard";
import { Typography } from "@/components/ui/typography";

type PreviewGraphRow = {
	keys?: [string];
	clicks?: string | number;
	impressions?: string | number;
	goal?: string | number;
};

type PreviewGraph = {
	rows?: PreviewGraphRow[];
};

type PreviewStats = {
	Total?: string | number;
	Trend?: "up" | "down" | string;
	Diff?: string | number;
};

type PreviewMainStats = {
	Clicks?: PreviewStats;
	Impressions?: PreviewStats;
	goals?: PreviewStats;
};

function safeJsonParse<T>(value: string | undefined, fallback: T): T {
	if (!value) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
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
function getGreetingName(user: any) {
	return (
		user?.firstName ||
		user?.FirstName ||
		user?.name ||
		user?.Name ||
		user?.username ||
		"there"
	);
}

const HOME_PERIODS = [
	{ label: "7 days", value: "7 days" },
	{ label: "14 days", value: "14 days" },
	{ label: "28 days", value: "28 days" },
	{ label: "3 months", value: "3 months" },
	{ label: "6 months", value: "6 months" },
	{ label: "12 months", value: "12 months" },
] as const;

export function HomeTemplate() {
	const router = useRouter();
	const { user } = useAuthStore();
	const greetingName = getGreetingName(user);
	const showActiveId = useId();
	const showProspectsId = useId();

	const [search, setSearch] = useState("");
	const [period, setPeriod] =
		useState<(typeof HOME_PERIODS)[number]["value"]>("3 months");
	const [showActive, setShowActive] = useState(true);
	const [showProspects, setShowProspects] = useState(false);

	const { profiles } = useBusinessProfiles();
	const { previews, isLoading: previewsLoading } = useBusinessPreviews(period);
	const { connectGoogleAccount } = useGoogleAccounts();

	const joined = useMemo(() => {
		const profileByDomain = new Map<
			string,
			{ name: string; uniqueId: string }
		>();
		for (const profile of profiles) {
			const domain = normalizeUrlDomain(profile.Website || "");
			if (!domain) continue;
			profileByDomain.set(domain, {
				name: profile.Name || profile.DisplayName || domain,
				uniqueId: profile.UniqueId,
			});
		}

		return previews.map((preview) => {
			const domain = normalizeUrlDomain(preview.url);
			const match = profileByDomain.get(domain);
			return {
				preview,
				domain,
				name: match?.name || domain,
				uniqueId: match?.uniqueId || null,
			};
		});
	}, [previews, profiles]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return joined;
		return joined.filter(
			(x) => x.name.toLowerCase().includes(q) || x.domain.includes(q),
		);
	}, [joined, search]);

	const { activeBusinesses, prospects } = useMemo(() => {
		const active: typeof filtered = [];
		const prospect: typeof filtered = [];

		for (const item of filtered) {
			const mainStats = safeJsonParse<PreviewMainStats>(
				item.preview.mainstats,
				{},
			);
			const clicks = mainStats?.Clicks || {};
			const impressions = mainStats?.Impressions || {};

			const showConnectGoogle =
				Object.keys(clicks || {}).length === 0 ||
				Object.keys(impressions || {}).length === 0;

			if (showConnectGoogle) {
				prospect.push(item);
			} else {
				active.push(item);
			}
		}

		return { activeBusinesses: active, prospects: prospect };
	}, [filtered]);

	const handleOpen = (uniqueId: string | null, url: string) => {
		if (uniqueId) {
			router.push(`/business/${uniqueId}/analytics`);
			return;
		}

		if (url) {
			window.open(
				url.startsWith("http") ? url : `https://${url}`,
				"_blank",
			);
		}
	};

	return (
		<div className="bg-muted py-7 px-5 flex flex-col gap-5 min-h-full">
			<div className="flex items-center justify-between gap-4">
				<h1 className="text-3xl font-semibold tracking-tight">
					Hi, {greetingName}
				</h1>

				<div className="flex items-center gap-2">
					<Select
						value={period}
						onValueChange={(value) => setPeriod(value as any)}
					>
						<SelectTrigger className="min-w-[130px]">
							<SelectValue placeholder="Period" />
						</SelectTrigger>
						<SelectContent align="end">
							{HOME_PERIODS.map((p) => (
								<SelectItem key={p.value} value={p.value}>
									{p.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<div className="relative w-[320px]">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search by business name"
							className="pl-9"
						/>
					</div>

					<Button
						type="button"
						onClick={() => router.push("/create-business")}
						className="h-9"
					>
						<Plus className="h-4 w-4 mr-2" />
						Add
					</Button>
				</div>
			</div>

			<div className="flex justify-end">
				<div className="flex items-center gap-4 bg-white px-3 py-2 rounded-lg">
					<div className="flex items-center gap-2">
						<Checkbox
							id={showActiveId}
							checked={showActive}
							onCheckedChange={(checked) => setShowActive(checked === true)}
						/>
						<label
							htmlFor={showActiveId}
							className="text-sm font-medium cursor-pointer"
						>
							Active
						</label>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							id={showProspectsId}
							checked={showProspects}
							onCheckedChange={(checked) => setShowProspects(checked === true)}
						/>
						<label
							htmlFor={showProspectsId}
							className="text-sm font-medium cursor-pointer"
						>
							Prospects
						</label>
					</div>
				</div>
			</div>
			{!showActive && !showProspects && (
				<Card className="flex flex-col gap-3 p-4 border-none shadow-none">
					<p className="text-center text-muted-foreground py-8">
						Please select any option to show the data
					</p>
				</Card>
			)}

			{showActive && (
				<Card className="flex flex-col gap-3 p-4 border-none shadow-none">
					<Typography
						variant="h4"
						className="text-general-unofficial-foreground-alt"
					>
						Active Businesses
					</Typography>

					{previewsLoading ? (
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
							{[1, 2, 3, 4, 5, 6].map((i) => (
								<Card key={i} className="overflow-hidden">
									<div className="px-3 py-2 border-b border-border">
										<Skeleton className="h-4 w-40" />
									</div>
									<div className="px-3 py-2">
										<Skeleton className="h-[115px] w-full" />
									</div>
									<CardContent className="pt-0 pb-3 px-3">
										<div className="flex gap-2">
											<Skeleton className="h-8 flex-1" />
											<Skeleton className="h-8 flex-1" />
											<Skeleton className="h-8 flex-1" />
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
							{activeBusinesses.map(({ preview, name, domain, uniqueId }) => {
								const mainStats = safeJsonParse<PreviewMainStats>(
									preview.mainstats,
									{},
								);
								const graph = safeJsonParse<PreviewGraph>(preview.graph, {});

								return (
									<BusinessPreviewCard
										key={domain}
										name={name}
										url={preview.url}
										graph={graph}
										impressions={mainStats?.Impressions}
										clicks={mainStats?.Clicks}
										goals={mainStats?.goals}
										onConnectGoogle={connectGoogleAccount}
										onClick={() => handleOpen(uniqueId, preview.url)}
									/>
								);
							})}
						</div>
					)}
				</Card>
			)}

			{showProspects && (
				<Card className="flex flex-col gap-3 p-4 border-none shadow-none bg-general-primary-foreground">
					<Typography variant="h4" className="text-general-muted-foreground">
						Prospects
					</Typography>

					<div
						className={cn(
							"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5",
							prospects.length === 0 && "opacity-60",
						)}
					>
						{prospects.map(({ preview, domain }) => (
							<ProspectsCard
								key={domain}
								url={preview.url}
								onConnectGoogle={connectGoogleAccount}
							/>
						))}

						{!previewsLoading && prospects.length === 0 && (
							<Card className="border-border">
								<CardContent className="p-3 text-sm text-muted-foreground">
									No prospects found
								</CardContent>
							</Card>
						)}
					</div>
				</Card>
			)}
		</div>
	);
}
