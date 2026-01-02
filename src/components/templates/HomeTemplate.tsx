"use client";

import { useMemo, useState, useId, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { api } from "@/hooks/use-api";
import type { JobDetails } from "@/hooks/use-jobs";
import { cn } from "@/lib/utils";
import { BusinessPreviewCard } from "@/components/molecules/home/BusinessPreviewCard";
import { ProspectsCard } from "@/components/molecules/home/ProspectsCard";
import { OnboardingCard } from "@/components/molecules/home/OnboardingCard";
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
	const cleaned = raw.replace(/^sc-domain:/, "");
	try {
		const withProto = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
		const url = new URL(withProto);
		return url.hostname.replace(/^www\./, "");
	} catch {
		return (
			cleaned
				.replace(/^https?:\/\//, "")
				.replace(/^www\./, "")
				.split("/")[0] || raw
		);
	}
}

function compareStrings(a: string, b: string) {
	return a.localeCompare(b, undefined, { sensitivity: "base" });
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

const HOME_SECTIONS_STORAGE_KEY = "home:sections";

function parseStoredHomeSections(value: string | null) {
	if (!value) return null;
	try {
		const parsed = JSON.parse(value) as any;
		if (!parsed || typeof parsed !== "object") return null;
		const { showActive, showOnboarding, showProspects } = parsed;
		if (
			typeof showActive !== "boolean" ||
			typeof showOnboarding !== "boolean" ||
			typeof showProspects !== "boolean"
		)
			return null;
		return { showActive, showOnboarding, showProspects };
	} catch {
		return null;
	}
}

export function HomeTemplate() {
	const router = useRouter();
	const { user } = useAuthStore();
	const greetingName = getGreetingName(user);
	const showActiveId = useId();
	const showOnboardingId = useId();
	const showProspectsId = useId();

	const [search, setSearch] = useState("");
	const [period, setPeriod] =
		useState<(typeof HOME_PERIODS)[number]["value"]>("3 months");
	// Default to nothing selected on first render to avoid briefly showing the wrong
	// selection before localStorage is read.
	const [showActive, setShowActive] = useState(false);
	const [showOnboarding, setShowOnboarding] = useState(false);
	const [showProspects, setShowProspects] = useState(false);
	const [sectionsReady, setSectionsReady] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const stored = parseStoredHomeSections(
			window.localStorage.getItem(HOME_SECTIONS_STORAGE_KEY),
		);
		if (stored) {
			setShowActive(stored.showActive);
			setShowOnboarding(stored.showOnboarding);
			setShowProspects(stored.showProspects);
		} else {
			// Only default Active when nothing is stored.
			setShowActive(true);
			setShowOnboarding(false);
			setShowProspects(false);
		}
		setSectionsReady(true);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!sectionsReady) return;
		window.localStorage.setItem(
			HOME_SECTIONS_STORAGE_KEY,
			JSON.stringify({ showActive, showOnboarding, showProspects }),
		);
	}, [sectionsReady, showActive, showOnboarding, showProspects]);

	const { profiles } = useBusinessProfiles();
	const { previews, isLoading: previewsLoading } = useBusinessPreviews(period);
	const { connectGoogleAccount } = useGoogleAccounts();

	const joined = useMemo(() => {
		const profileByUniqueId = new Map<
			string,
			{ name: string; domain: string }
		>();
		for (const profile of profiles) {
			const uniqueId = profile.UniqueId;
			if (!uniqueId) continue;
			const domain = normalizeUrlDomain(profile.Website || "");
			profileByUniqueId.set(String(uniqueId), {
				name: profile.Name || profile.DisplayName || domain || String(uniqueId),
				domain,
			});
		}

		return previews.map((preview) => {
			const domain = normalizeUrlDomain(preview.url);
			const uniqueId = preview.businessUniqueId ? String(preview.businessUniqueId) : null;
			const match = uniqueId ? profileByUniqueId.get(uniqueId) : undefined;
			return {
				preview,
				domain: match?.domain || domain,
				name: match?.name || domain,
				uniqueId,
			};
		});
	}, [previews, profiles]);

	const onboardingCandidates = useMemo(() => {
		return joined.filter(
			(item) =>
				Boolean(item.uniqueId) &&
				(item.preview as BusinessPreviewItem | undefined)?.isGscConnected === true,
		);
	}, [joined]);

	const onboardingCandidateIds = useMemo(() => {
		const ids = onboardingCandidates
			.map((item) => item.uniqueId)
			.filter((x): x is string => Boolean(x));
		ids.sort();
		return ids;
	}, [onboardingCandidates]);

	const {
		data: onboardingJobsByBusinessId = {},
		isLoading: onboardingJobsLoading,
	} = useQuery<Record<string, JobDetails | null>>({
		queryKey: ["homeOnboardingJobs", onboardingCandidateIds],
		queryFn: async () => {
			if (onboardingCandidateIds.length === 0) return {};

			const results = await Promise.all(
				onboardingCandidateIds.map(async (businessId) => {
					try {
						const job = await api.get<JobDetails>(`/job/${businessId}`, "python");
						return [businessId, job || null] as const;
					} catch (error: any) {
						if (error?.response?.status === 404) {
							return [businessId, null] as const;
						}
						return [businessId, null] as const;
					}
				}),
			);

			return Object.fromEntries(results);
		},
		enabled: onboardingCandidateIds.length > 0,
		staleTime: 30 * 1000,
		gcTime: 30 * 60 * 1000,
	});

	const onboardingCards = useMemo(() => {
		return onboardingCandidates
			.filter((item) => {
				const preview = item.preview as BusinessPreviewItem;
				const businessId = item.uniqueId;
				if (!businessId) return false;

				const job = onboardingJobsByBusinessId[businessId] || null;
				const jobExists = Boolean(job?.job_id);
				const isGa4Connected = preview?.isGa4Connected === true;
				const isGbpConnected = preview?.isGbpConnected === true;

				return !isGa4Connected || !isGbpConnected || !jobExists;
			})
			.map((item) => {
				const preview = item.preview as BusinessPreviewItem;
				const businessId = item.uniqueId as string;

				const job = onboardingJobsByBusinessId[businessId] || null;
				const jobExists = Boolean(job?.job_id);

				const tasks = [
					{
						id: `${businessId}-gsc`,
						title: "Connect Google Search Console",
						description: "See how your site performs in search",
						completed: preview?.isGscConnected === true,
						action: "settings" as const,
					},
					{
						id: `${businessId}-ga4`,
						title: "Connect Google Analytics",
						description: "Tie search traffic to real business outcomes",
						completed: preview?.isGa4Connected === true,
						action: "settings" as const,
					},
					{
						id: `${businessId}-gbp`,
						title: "Connect Google Business Profile",
						description: "Improve local and map visibility",
						completed: preview?.isGbpConnected === true,
						action: "settings" as const,
					},
					{
						id: `${businessId}-job`,
						title: "Complete profile",
						description: "Tailor strategy to your unique business",
						completed: jobExists,
						action: "profile" as const,
					},
				];

				const completedCount = tasks.filter((t) => t.completed).length;
				const percent = Math.round((completedCount / 4) * 100);

				return {
					id: businessId,
					businessName: item.name,
					progressLabel: `${percent}% complete`,
					tasks,
				};
			})
			.sort((a, b) => compareStrings(a.businessName, b.businessName));
	}, [onboardingCandidates, onboardingJobsByBusinessId]);

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

		active.sort((a, b) => compareStrings(a.name, b.name));
		prospect.sort((a, b) => compareStrings(a.domain, b.domain));
		return { activeBusinesses: active, prospects: prospect };
	}, [filtered]);

	const selectedCount = Number(showActive) + Number(showOnboarding) + Number(showProspects);
	const showThreeColumnLayout = selectedCount === 3;

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
		<div className="bg-muted min-h-full">
			<div className="w-full max-w-[1224px] py-7 px-5 flex flex-col gap-5 min-h-full">
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
								id={showOnboardingId}
								checked={showOnboarding}
								onCheckedChange={(checked) =>
									setShowOnboarding(checked === true)
								}
							/>
							<label
								htmlFor={showOnboardingId}
								className="text-sm font-medium cursor-pointer"
							>
								Onboarding
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
				{selectedCount === 0 && (
					<Card className="flex flex-col gap-3 p-4 border-none shadow-none">
						<p className="text-center text-muted-foreground py-8">
							Please select any option to show the data
						</p>
					</Card>
				)}

				{selectedCount > 0 && showThreeColumnLayout && (
					<div className="grid grid-cols-1 xl:grid-cols-3 gap-2.5">
						{showActive && (
							<Card className="flex flex-col gap-3 p-4 border-none shadow-none">
								<Typography
									variant="h4"
									className="text-general-unofficial-foreground-alt"
								>
									Active Businesses
								</Typography>

								{previewsLoading ? (
									<div className="flex flex-col gap-2.5">
										{[1, 2, 3].map((i) => (
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
									<div className="flex flex-col gap-2.5">
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

						{showOnboarding && (
							<Card className="flex flex-col gap-3 p-4 border-none shadow-none bg-general-primary-foreground rounded-(--rounded-12,12px)">
								<Typography
									variant="h4"
									className="text-general-unofficial-foreground-alt"
								>
									Onboarding
								</Typography>

								{previewsLoading || onboardingJobsLoading ? (
									<div className="flex flex-col gap-2.5">
										{[1, 2].map((i) => (
											<Card key={i} className="p-3 border-border">
												<div className="flex items-center justify-between">
													<Skeleton className="h-4 w-40" />
													<Skeleton className="h-6 w-24" />
												</div>
												<div className="mt-3 flex flex-col gap-2">
													<Skeleton className="h-10 w-full" />
													<Skeleton className="h-10 w-full" />
													<Skeleton className="h-10 w-full" />
													<Skeleton className="h-10 w-full" />
												</div>
											</Card>
										))}
									</div>
								) : (
									<div className="flex flex-col gap-2.5">
										{onboardingCards.map((card) => (
											<OnboardingCard
												key={card.id}
												businessId={card.id}
												businessName={card.businessName}
												progressLabel={card.progressLabel}
												tasks={card.tasks}
											/>
										))}

										{!previewsLoading && !onboardingJobsLoading && onboardingCards.length === 0 && (
											<Card className="border-border">
												<CardContent className="p-3 text-sm text-muted-foreground">
													No onboarding businesses found
												</CardContent>
											</Card>
										)}
									</div>
								)}
							</Card>
						)}

						{showProspects && (
							<Card className="flex flex-col gap-3 p-4 border-none shadow-none bg-general-primary-foreground">
								<Typography
									variant="h4"
									className="text-general-muted-foreground"
								>
									Prospects
								</Typography>

								{previewsLoading ? (
									<div className="flex flex-col gap-2.5">
										{[1, 2].map((i) => (
											<Card key={i} className="p-2 border-border shadow-none rounded-lg flex flex-col gap-4">
												<div className="flex items-center justify-between">
													<Skeleton className="h-4 w-40" />
													<Skeleton className="h-9 w-32" />
												</div>
											</Card>
										))}
									</div>
								) : (
									<div
										className={cn(
											"flex flex-col gap-2.5",
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

										{prospects.length === 0 && (
											<Card className="border-border">
												<CardContent className="p-3 text-sm text-muted-foreground">
													No prospects found
												</CardContent>
											</Card>
										)}
									</div>
								)}
							</Card>
						)}
					</div>
				)}

				{selectedCount > 0 && !showThreeColumnLayout && (
					<>
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

						{showOnboarding && (
							<Card className="flex flex-col gap-3 p-4 border-none shadow-none bg-general-primary-foreground rounded-(--rounded-12,12px)">
								<Typography
									variant="h4"
									className="text-general-unofficial-foreground-alt"
								>
									Onboarding
								</Typography>

								{previewsLoading || onboardingJobsLoading ? (
									<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
										{[1, 2, 3].map((i) => (
											<Card key={i} className="p-3 border-border">
												<div className="flex items-center justify-between">
													<Skeleton className="h-4 w-40" />
													<Skeleton className="h-6 w-24" />
												</div>
												<div className="mt-3 flex flex-col gap-2">
													<Skeleton className="h-10 w-full" />
													<Skeleton className="h-10 w-full" />
													<Skeleton className="h-10 w-full" />
													<Skeleton className="h-10 w-full" />
												</div>
											</Card>
										))}
									</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
										{onboardingCards.map((card) => (
											<OnboardingCard
												key={card.id}
												businessId={card.id}
												businessName={card.businessName}
												progressLabel={card.progressLabel}
												tasks={card.tasks}
											/>
										))}

										{!previewsLoading && !onboardingJobsLoading && onboardingCards.length === 0 && (
											<Card className="border-border">
												<CardContent className="p-3 text-sm text-muted-foreground">
													No onboarding businesses found
												</CardContent>
											</Card>
										)}
									</div>
								)}
							</Card>
						)}

						{showProspects && (
							<Card className="flex flex-col gap-3 p-4 border-none shadow-none bg-general-primary-foreground">
								<Typography variant="h4" className="text-general-muted-foreground">
									Prospects
								</Typography>

								{previewsLoading ? (
									<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
										{[1, 2, 3].map((i) => (
											<Card key={i} className="p-2 border-border shadow-none rounded-lg flex flex-col gap-4">
												<Skeleton className="h-4 w-40" />
												<div className="flex justify-end">
													<Skeleton className="h-9 w-32" />
												</div>
											</Card>
										))}
									</div>
								) : (
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

										{prospects.length === 0 && (
											<Card className="border-border">
												<CardContent className="p-3 text-sm text-muted-foreground">
													No prospects found
												</CardContent>
											</Card>
										)}
									</div>
								)}
							</Card>
						)}
					</>
				)}
			</div>
		</div>
	);
}
