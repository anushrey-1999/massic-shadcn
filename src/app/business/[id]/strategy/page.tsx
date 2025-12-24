"use client";

import React from "react";
import { StrategyTableClient } from "@/components/organisms/StrategyTable/strategy-table-client";
import { AudienceTableClient } from "@/components/organisms/AudienceTable/audience-table-client";
import { LandscapeTableClient } from "@/components/organisms/LandscapeTable/landscape-table-client";
import { PageHeader } from "@/components/molecules/PageHeader";
import { WorkflowStatusBanner } from "@/components/molecules/WorkflowStatusBanner";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useStrategy } from "@/hooks/use-strategy";
import { useQuery } from "@tanstack/react-query";
import {
	BUSINESS_RELEVANCE_PALETTE,
	StrategyBubbleChart,
} from "@/components/organisms/StrategyBubbleChart/strategy-bubble-chart";
import { Card } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";

interface PageProps {
	params: Promise<{
		id: string;
	}>;
}

function StrategyEntitledContent({ businessId }: { businessId: string }) {
	const [isStrategySplitView, setIsStrategySplitView] = React.useState(false);
	const [isAudienceSplitView, setIsAudienceSplitView] = React.useState(false);
	const [strategyView, setStrategyView] = React.useState<"list" | "bubble">(
		"list",
	);

	const router = useRouter();
	const pathname = usePathname();

	const { fetchFullDataFromDownloadUrl } = useStrategy(businessId);

	// Fetch full data for bubble chart when bubble view is active
	const {
		data: fullData,
		isLoading: isLoadingFullData,
		error: fullDataError,
	} = useQuery({
		queryKey: ["strategy-full-data", businessId],
		queryFn: () => fetchFullDataFromDownloadUrl(businessId),
		enabled: strategyView === "bubble" && !!businessId,
		staleTime: 5 * 60 * 1000, // Cache for 5 minutes
	});

	const handleTabChange = React.useCallback(() => {
		router.replace(pathname);
	}, [router, pathname]);

	return (
		<div className="container mx-auto flex-1 min-h-0 p-5 flex flex-col">
			<Tabs
				defaultValue="strategy"
				onValueChange={handleTabChange}
				className="flex flex-col flex-1 min-h-0"
			>
				{!(isStrategySplitView || isAudienceSplitView) && (
					<TabsList className="shrink-0">
						<TabsTrigger value="strategy">Strategy</TabsTrigger>
						<TabsTrigger value="audience">Audience</TabsTrigger>
						<TabsTrigger value="landscape">Landscape</TabsTrigger>
					</TabsList>
				)}
				<TabsContent
					value="strategy"
					className={cn(
						"flex-1 min-h-0 overflow-hidden flex flex-col",
						!(isStrategySplitView || isAudienceSplitView) && "mt-4",
					)}
				>
					<Tabs
						defaultValue="list"
						value={strategyView}
						onValueChange={(value) =>
							setStrategyView(value as "list" | "bubble")
						}
						className="flex flex-col flex-1 min-h-0"
					>
						<TabsList className="shrink-0 mb-4">
							<TabsTrigger value="list">List View</TabsTrigger>
							<TabsTrigger value="bubble">Bubble View</TabsTrigger>
						</TabsList>
						<TabsContent
							value="list"
							className="flex-1 min-h-0 overflow-hidden mt-0"
						>
							<StrategyTableClient
								businessId={businessId}
								onSplitViewChange={setIsStrategySplitView}
							/>
						</TabsContent>
						<TabsContent
							value="bubble"
							className="flex-1 min-h-0 overflow-hidden mt-0"
						>
							{isLoadingFullData && (
								<div className="flex items-center justify-center h-full">
									<p className="text-muted-foreground">Loading full data...</p>
								</div>
							)}
							{fullDataError && (
								<div className="flex items-center justify-center h-full">
									<p className="text-destructive">
										Error loading data: {String(fullDataError)}
									</p>
								</div>
							)}
							{fullData?.data && (
								<Card className="h-full w-full p-4 rounded-lg border-none shadow-none flex flex-col gap-3">
									<div className="flex items-center justify-between">
										<div>
											<Typography
												variant="p"
												className="font-mono mb-2 text-base text-general-muted-foreground"
											>
												Topic Coverage
											</Typography>
											<div className="relative h-5 w-[320px] max-w-full rounded-full overflow-hidden">
												<div className="absolute inset-0 flex">
													{BUSINESS_RELEVANCE_PALETTE.map((color) => (
														<div
																key={color}
															className="h-full flex-1 shadow-inner"
															style={{ backgroundColor: color }}
														/>
													))}
												</div>
												<div className="absolute inset-0 flex items-center justify-between px-3">
													<span className="text-[10px] font-medium text-general-muted-foreground">
														Low
													</span>
													<span className="text-[10px] font-medium text-general-muted-foreground">
														High
													</span>
												</div>
											</div>
										</div>

										<Typography
											variant="p"
											className="text-base font-mono text-general-muted-foreground"
										>
											{fullData.data.length} total topic
											{fullData.data.length === 1 ? "" : "s"}
										</Typography>
									</div>
									<div className="flex-1 min-h-0">
										<StrategyBubbleChart data={fullData.data} />
									</div>
								</Card>
							)}
						</TabsContent>
					</Tabs>
				</TabsContent>
				<TabsContent
					value="audience"
					className={cn(
						"flex-1 min-h-0 overflow-hidden",
						!(isStrategySplitView || isAudienceSplitView) && "mt-4",
					)}
				>
					<AudienceTableClient
						businessId={businessId}
						onSplitViewChange={setIsAudienceSplitView}
					/>
				</TabsContent>
				<TabsContent
					value="landscape"
					className={cn(
						"flex-1 min-h-0 overflow-hidden",
						!(isStrategySplitView || isAudienceSplitView) && "mt-4",
					)}
				>
					<LandscapeTableClient businessId={businessId} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

export default function BusinessStrategyPage({ params }: PageProps) {
	const [businessId, setBusinessId] = React.useState<string>("");

	React.useEffect(() => {
		params.then(({ id }) => setBusinessId(id));
	}, [params]);

	const { profileData, profileDataLoading } = useBusinessProfileById(
		businessId || null,
	);
	const { data: jobDetails, isLoading: jobLoading } = useJobByBusinessId(
		businessId || null,
	);

	const businessName =
		profileData?.Name || profileData?.DisplayName || "Business";
	const workflowStatus = jobDetails?.workflow_status?.status;
	const showContent = workflowStatus === "success";
	const showBanner =
		workflowStatus === "processing" ||
		workflowStatus === "error" ||
		!jobDetails;

	const breadcrumbs = React.useMemo(
		() => [
			{ label: "Home", href: "/" },
			{ label: businessName },
			{ label: "Strategy", href: `/business/${businessId}/strategy` },
		],
		[businessName, businessId],
	);

	if (!businessId) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (profileDataLoading || jobLoading) {
		return (
			<div className="flex flex-col h-screen">
				<PageHeader breadcrumbs={breadcrumbs} />
				<div className="flex items-center justify-center flex-1">
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen">
			<PageHeader breadcrumbs={breadcrumbs} />
			{showBanner && (
				<div className="container mx-auto px-5 pt-5">
					<WorkflowStatusBanner businessId={businessId} />
				</div>
			)}
			{showContent && jobDetails && (
				<EntitlementsGuard entitlement="strategy" businessId={businessId}>
					<StrategyEntitledContent businessId={businessId} />
				</EntitlementsGuard>
			)}
		</div>
	);
}
