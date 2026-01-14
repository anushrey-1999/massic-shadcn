"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import * as d3 from "d3";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { BUSINESS_RELEVANCE_PALETTE } from "@/components/organisms/StrategyBubbleChart/strategy-bubble-chart";

export type SocialBubbleDatum = {
	channel_name: string;
	channel_relevance?: number;
	campaign_name: string;
	campaign_relevance?: number;
	cluster_name?: string;
	cluster_relevance?: number;
};

interface SocialBubbleChartProps {
	data: SocialBubbleDatum[];
	width?: number;
	height?: number;
}

interface HierarchyNode {
	name: string;
	children?: HierarchyNode[];
	value?: number;
	type: "root" | "channel" | "campaign" | "cluster";
	data?: {
		relevanceScore?: number;
	};
}

type PackedNode = d3.HierarchyCircularNode<HierarchyNode>;

function normalizeScore(scoreRaw?: number) {
	const score = scoreRaw ?? 0;
	if (!Number.isFinite(score)) return 0;
	if (score <= 1) return Math.max(0, Math.min(1, score));
	if (score <= 100) return Math.max(0, Math.min(1, score / 100));
	return 1;
}

function formatScorePercent(scoreRaw?: number) {
	if (scoreRaw === undefined || scoreRaw === null) return "-";
	if (!Number.isFinite(scoreRaw)) return "-";
	const normalized = scoreRaw <= 1 ? scoreRaw * 100 : scoreRaw;
	return `${Math.round(normalized)}%`;
}

export function SocialBubbleChart({
	data,
	width = 1200,
	height = 800,
}: SocialBubbleChartProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const [tooltipNode, setTooltipNode] = useState<PackedNode | null>(null);
	const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
		width: 0,
		height: 0,
	});

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		let rafId: number | null = null;

		const update = () => {
			const next = { width: el.clientWidth, height: el.clientHeight };
			setContainerSize((prev) => {
				if (prev.width === next.width && prev.height === next.height) return prev;
				return next;
			});
		};

		const ro = new ResizeObserver(() => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(update);
		});

		ro.observe(el);
		update();

		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			ro.disconnect();
		};
	}, []);

	const hierarchyData = useMemo(() => {
		const byChannel = new Map<
			string,
			{
				channel_relevance?: number;
				campaigns: Map<
					string,
					{
						campaign_relevance?: number;
						clusters: Map<string, { cluster_relevance?: number }>;
					}
				>;
			}
		>();

		for (const row of data) {
			const channel = (row.channel_name || "").trim();
			const campaign = (row.campaign_name || "").trim();
			const cluster = (row.cluster_name || "").trim();
			if (!channel || !campaign) continue;

			const existing = byChannel.get(channel);
			if (!existing) {
				const campaignEntry = {
					campaign_relevance: row.campaign_relevance,
					clusters: new Map<string, { cluster_relevance?: number }>(),
				};
				if (cluster) {
					campaignEntry.clusters.set(cluster, { cluster_relevance: row.cluster_relevance });
				}
				byChannel.set(channel, {
					channel_relevance: row.channel_relevance,
					campaigns: new Map([[campaign, campaignEntry]]),
				});
				continue;
			}

			if (existing.channel_relevance === undefined && row.channel_relevance !== undefined) {
				existing.channel_relevance = row.channel_relevance;
			}

			const existingCampaign = existing.campaigns.get(campaign);
			if (!existingCampaign) {
				const campaignEntry = {
					campaign_relevance: row.campaign_relevance,
					clusters: new Map<string, { cluster_relevance?: number }>(),
				};
				if (cluster) {
					campaignEntry.clusters.set(cluster, { cluster_relevance: row.cluster_relevance });
				}
				existing.campaigns.set(campaign, campaignEntry);
			} else {
				if (
					existingCampaign.campaign_relevance === undefined &&
					row.campaign_relevance !== undefined
				) {
					existingCampaign.campaign_relevance = row.campaign_relevance;
				}

				if (cluster) {
					const existingCluster = existingCampaign.clusters.get(cluster);
					if (!existingCluster) {
						existingCampaign.clusters.set(cluster, {
							cluster_relevance: row.cluster_relevance,
						});
					} else if (
						existingCluster.cluster_relevance === undefined &&
						row.cluster_relevance !== undefined
					) {
						existingCluster.cluster_relevance = row.cluster_relevance;
					}
				}
			}
		}

		const channels = Array.from(byChannel.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([channelName, channelData]) => {
				const campaigns = Array.from(channelData.campaigns.entries())
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([campaignName, campaignData]) => {
						const clusters = Array.from(campaignData.clusters.entries())
							.sort(([a], [b]) => a.localeCompare(b))
							.map(([clusterName, clusterData]) => ({
								name: clusterName,
								type: "cluster" as const,
								value: 1,
								data: {
									relevanceScore: clusterData.cluster_relevance,
								},
							}));

						if (!clusters.length) {
							return {
								name: campaignName,
								type: "campaign" as const,
								value: 1,
								data: {
									relevanceScore: campaignData.campaign_relevance,
								},
							};
						}

						return {
							name: campaignName,
							type: "campaign" as const,
							data: {
								relevanceScore: campaignData.campaign_relevance,
							},
							children: clusters,
						};
					});

				return {
					name: channelName,
					type: "channel" as const,
					data: {
						relevanceScore: channelData.channel_relevance,
					},
					children: campaigns,
				};
			});

		const root: HierarchyNode = {
			name: "Channels",
			type: "root" as const,
			children: channels,
		}

		return root;
	}, [data]);

	const getColor = useCallback((node: PackedNode) => {
		const palette = BUSINESS_RELEVANCE_PALETTE;

		const channelAncestor =
			node.data.type === "channel"
				? node
				: node.ancestors().find((a): a is PackedNode => a.data.type === "channel") ??
					null;

		const scoreRaw =
			node.data.type === "channel"
				? node.data.data?.relevanceScore
				: node.data.type === "campaign"
					? node.data.data?.relevanceScore ?? channelAncestor?.data.data?.relevanceScore
					: node.data.type === "cluster"
						? node.data.data?.relevanceScore
						: channelAncestor?.data.data?.relevanceScore;

		const score = normalizeScore(scoreRaw);
		const index = Math.max(
			0,
			Math.min(palette.length - 1, Math.round(score * (palette.length - 1)))
		);
		return palette[index];
	}, []);

	useEffect(() => {
		if (!canvasRef.current || !hierarchyData.children?.length) return;

		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d", { alpha: false });
		if (!ctx) return;

		const actualWidth = containerSize.width || containerRef.current?.clientWidth || width;
		const actualHeight = containerSize.height || containerRef.current?.clientHeight || height;
		if (actualWidth <= 0 || actualHeight <= 0) return;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = actualWidth * dpr;
		canvas.height = actualHeight * dpr;
		canvas.style.width = `${actualWidth}px`;
		canvas.style.height = `${actualHeight}px`;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.scale(dpr, dpr);

		const pack = d3.pack<HierarchyNode>().size([actualWidth, actualHeight]).padding(3);
		const root = d3
			.hierarchy<HierarchyNode>(hierarchyData)
			.sum((d) => d.value || 0)
			.sort((a, b) => (b.value || 0) - (a.value || 0));

		const packedData = pack(root);
		const allNodes = packedData.descendants();

		const centerX = actualWidth / 2;
		const centerY = actualHeight / 2;
		const minDim = Math.min(actualWidth, actualHeight);

		let focusNode = packedData;
		let view: [number, number, number] = [packedData.x, packedData.y, packedData.r * 2];
		let currentHoveredNode: PackedNode | null = null;

		const getScale = () => minDim / view[2];

		const render = () => {
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(0, 0, actualWidth, actualHeight);

			const k = getScale();

			allNodes.forEach((node) => {
				if (node.data.type === "root") return;

				const x = (node.x - view[0]) * k + centerX;
				const y = (node.y - view[1]) * k + centerY;
				const r = node.r * k;
				if (r < 0.5) return;

				ctx.beginPath();
				ctx.arc(x, y, r, 0, 2 * Math.PI);

				const color = getColor(node);
				let alpha = 0.7;
				if (node.data.type === "campaign") alpha = 0.6;
				if (node.data.type === "cluster") alpha = 0.5;
				ctx.fillStyle =
					color + Math.round(alpha * 255).toString(16).padStart(2, "0");
				ctx.fill();

				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = node.data.type === "channel" ? 2 : node.data.type === "campaign" ? 1.5 : 1;
				ctx.stroke();
			});

			// Draw a subtle boundary for the root circle to visually wrap all channels.
			{
				const rootX = (packedData.x - view[0]) * k + centerX;
				const rootY = (packedData.y - view[1]) * k + centerY;
				const rootR = packedData.r * k;

				ctx.save();
				ctx.globalAlpha = 0.12;
				ctx.beginPath();
				ctx.arc(rootX, rootY, rootR, 0, 2 * Math.PI);
				ctx.strokeStyle = "#000000";
				ctx.lineWidth = 2;
				ctx.stroke();
				ctx.restore();
			}

			if (currentHoveredNode && currentHoveredNode !== focusNode) {
				const k = getScale();
				const x = (currentHoveredNode.x - view[0]) * k + centerX;
				const y = (currentHoveredNode.y - view[1]) * k + centerY;
				const r = currentHoveredNode.r * k;

				ctx.beginPath();
				ctx.arc(x, y, r, 0, 2 * Math.PI);
				ctx.strokeStyle = "#000000";
				ctx.lineWidth = 1;
				ctx.stroke();
			}
		};

		const zoomTo = (node: PackedNode, duration = 750) => {
			const target: [number, number, number] = [node.x, node.y, node.r * 2];
			const start = view;

			if (duration === 0) {
				focusNode = node;
				view = target;
				render();
				return;
			}

			const interpolate = d3.interpolateZoom(start, target);
			const startTime = performance.now();

			const animate = (now: number) => {
				const t = Math.min((now - startTime) / duration, 1);
				const eased = d3.easeCubicInOut(t);
				view = interpolate(eased);
				render();

				if (t < 1) {
					requestAnimationFrame(animate);
				} else {
					focusNode = node;
					view = target;
					render();
				}
			};

			requestAnimationFrame(animate);
		};

		const findNode = (x: number, y: number): PackedNode | null => {
			let found: PackedNode | null = null;
			let minRadius = Infinity;

			const k = getScale();

			for (let i = 0; i < allNodes.length; i++) {
				const node = allNodes[i];
				if (node.data.type === "root") continue;

				const nx = (node.x - view[0]) * k + centerX;
				const ny = (node.y - view[1]) * k + centerY;
				const nr = node.r * k;
				if (nr < 0.5) continue;

				const dx = x - nx;
				const dy = y - ny;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance <= nr && nr < minRadius) {
					found = node;
					minRadius = nr;
				}
			}

			return found;
		};

		const handleClick = (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			const clicked = findNode(x, y);
			if (clicked && clicked !== focusNode) {
				zoomTo(clicked);
			} else if (!clicked) {
				zoomTo(packedData);
			}
		};

		const updateTooltipPosition = (clientX: number, clientY: number) => {
			const tooltipEl = tooltipRef.current;
			const containerEl = containerRef.current;
			if (!tooltipEl || !containerEl) return;

			const containerRect = containerEl.getBoundingClientRect();
			const x = clientX - containerRect.left;
			const y = clientY - containerRect.top;

			const offset = 12;
			const tooltipWidth = 260;
			const tooltipHeight = 100;

			const left = Math.max(
				0,
				Math.min(x + offset, containerRect.width - tooltipWidth)
			);
			const top = Math.max(
				0,
				Math.min(y + offset, containerRect.height - tooltipHeight)
			);

			tooltipEl.style.transform = `translate3d(${left}px, ${top}px, 0)`;
		};

		const handleMouseMove = (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			const node = findNode(x, y);
			if (node !== currentHoveredNode) {
				currentHoveredNode = node;
				canvas.style.cursor = node ? "pointer" : "default";
				setTooltipNode(node);
				render();
			}

			const tooltipEl = tooltipRef.current;
			if (tooltipEl) tooltipEl.style.opacity = node ? "1" : "0";
			if (node) updateTooltipPosition(e.clientX, e.clientY);
		};

		const handleMouseLeave = () => {
			currentHoveredNode = null;
			canvas.style.cursor = "default";
			setTooltipNode(null);
			const tooltipEl = tooltipRef.current;
			if (tooltipEl) tooltipEl.style.opacity = "0";
			render();
		};

		canvas.addEventListener("click", handleClick);
		canvas.addEventListener("mousemove", handleMouseMove);
		canvas.addEventListener("mouseleave", handleMouseLeave);

		zoomTo(packedData, 0);

		return () => {
			canvas.removeEventListener("click", handleClick);
			canvas.removeEventListener("mousemove", handleMouseMove);
			canvas.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [hierarchyData, containerSize.width, containerSize.height, width, height, getColor]);

	const tooltipTitle = tooltipNode?.data.name;
	const tooltipType = tooltipNode?.data.type;
	const tooltipTypeLabel =
		tooltipType === "channel"
			? "Channel"
			: tooltipType === "campaign"
				? "Campaign"
				: tooltipType === "cluster"
					? "Sub Topic"
					: null;
	const tooltipRelevance = formatScorePercent(tooltipNode?.data.data?.relevanceScore);

	return (
		<div
			ref={containerRef}
			className="relative w-full h-full flex items-center justify-center bg-white rounded-lg"
		>
			<canvas ref={canvasRef} className="w-full h-full" />

			<div
				ref={tooltipRef}
				className="pointer-events-none absolute left-0 top-0 z-10 opacity-0 transition-opacity"
			>
				{tooltipNode ? (
					<Card
						variant="profileCard"
						className="w-[260px] p-3 bg-foreground-light border-none rounded-xl"
					>
						{tooltipTypeLabel ? (
							<div className="mb-1">
								<Badge
									variant="outline"
									className="border border-general-border"
								>
									{tooltipTypeLabel}
								</Badge>
							</div>
						) : null}
						<CardTitle className="text-sm font-medium text-general-primary">
							{tooltipTitle}
						</CardTitle>
						<div className="mt-2 flex flex-col items-start flex-wrap gap-2">
							<Badge variant="outline">
								Relevance&nbsp;<span className="text-general-foreground">{tooltipRelevance}</span>
							</Badge>
						</div>
					</Card>
				) : null}
			</div>
		</div>
	);
}
