"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import * as d3 from "d3";
import type { StrategyRow } from "@/types/strategy-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";

export const BUSINESS_RELEVANCE_PALETTE = [
  "#F58787",
  "#F69387",
  "#F79F87",
  "#F8AB87",
  "#F8B787",
  "#F9C387",
  "#FACF87",
  "#EED282",
  "#E2D47D",
  "#D5D779",
  "#C9D974",
  "#BDDB6F",
  "#B1DE6A",
];

interface StrategyBubbleChartProps {
  data: StrategyRow[];
  width?: number;
  height?: number;
}

interface HierarchyNode {
  name: string;
  children?: HierarchyNode[];
  value?: number;
  type: "root" | "topic" | "cluster" | "keyword";
  data?: {
    relevanceScore?: number;
    searchVolume?: number;
    coverage?: number;
    keywordsCount?: number;
  };
}

type PackedNode = d3.HierarchyCircularNode<HierarchyNode>;

export function StrategyBubbleChart({
  data,
  width = 1200,
  height = 800,
}: StrategyBubbleChartProps) {
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
    console.log('Building hierarchy from data:', data.length, 'topics');
    
    const root: HierarchyNode = {
      name: "Topics",
      type: "root",
      children: data.map((topic) => ({
        name: topic.topic,
        type: "topic" as const,
        data: {
          relevanceScore: topic.business_relevance_score,
          coverage: topic.topic_cluster_topic_coverage,
          searchVolume: topic.total_search_volume,
          keywordsCount: topic.total_keywords,
        },
        children: topic.clusters.map((cluster) => ({
          name: cluster.cluster,
          type: "cluster" as const,
          data: {
            searchVolume: cluster.total_search_volume,
            coverage: cluster.intent_cluster_topic_coverage,
            keywordsCount: cluster.keywords.length,
          },
          children: cluster.keywords.map((keyword) => ({
            name: keyword,
            type: "keyword" as const,
            value: 1,
            data: {
              keywordsCount: 1,
            },
          })),
        })),
      })),
    };

    console.log('Hierarchy built:', root);
    return root;
  }, [data]);

  const getColor = useCallback((node: PackedNode) => {
    const palette = BUSINESS_RELEVANCE_PALETTE;

    const normalizeScore = (scoreRaw?: number) => {
      const score = scoreRaw ?? 0;
      if (!Number.isFinite(score)) return 0;
      if (score <= 1) return Math.max(0, Math.min(1, score));
      if (score <= 100) return Math.max(0, Math.min(1, score / 100));
      return 1;
    };

    const topicNode =
      node.data.type === "topic"
        ? node
        : node
            .ancestors()
            .find((a): a is PackedNode => a.data.type === "topic") ?? null;

    const score = normalizeScore(topicNode?.data.data?.relevanceScore);
    const index = Math.max(
      0,
      Math.min(palette.length - 1, Math.round(score * (palette.length - 1)))
    );

    return palette[index];
  }, []);

  const formatCompactNumber = useCallback((value?: number) => {
    if (value === undefined || value === null) return "-";
    if (!Number.isFinite(value)) return "-";
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 10_000) return `${(value / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`;
    return Math.round(value).toString();
  }, []);

  const formatCoveragePercent = useCallback((value?: number) => {
    if (value === undefined || value === null) return "-";
    if (!Number.isFinite(value)) return "-";
    const normalized = value <= 1 ? value * 100 : value;
    return `${Math.round(normalized)}%`;
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !hierarchyData.children?.length) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const actualWidth = containerSize.width || containerRef.current?.clientWidth || width;
    const actualHeight = containerSize.height || containerRef.current?.clientHeight || height;

    if (actualWidth <= 0 || actualHeight <= 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = actualWidth * dpr;
    canvas.height = actualHeight * dpr;
    canvas.style.width = `${actualWidth}px`;
    canvas.style.height = `${actualHeight}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const pack = d3
      .pack<HierarchyNode>()
      .size([actualWidth, actualHeight])
      .padding(3);

    const root = d3
      .hierarchy(hierarchyData)
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
        if (node.data.type === "cluster") alpha = 0.6;
        if (node.data.type === "keyword") alpha = 0.5;
        
        ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();

        if (node.data.type !== "keyword") {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = node.data.type === "topic" ? 2 : 1;
          ctx.stroke();
        }

      });

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

    const findNode = (
      x: number,
      y: number,
      options?: { includeKeywords?: boolean }
    ): PackedNode | null => {
      let found: PackedNode | null = null;
      let minRadius = Infinity;

      const includeKeywords = options?.includeKeywords ?? false;

      const k = getScale();

      for (let i = 0; i < allNodes.length; i++) {
        const node = allNodes[i];
        if (node.data.type === "root") continue;
        if (!includeKeywords && node.data.type === "keyword") continue;

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

      const clicked = findNode(x, y, { includeKeywords: false });
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
      const tooltipHeight = 120;

      const left = Math.max(0, Math.min(x + offset, containerRect.width - tooltipWidth));
      const top = Math.max(0, Math.min(y + offset, containerRect.height - tooltipHeight));

      tooltipEl.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const node = findNode(x, y, { includeKeywords: true });
      if (node !== currentHoveredNode) {
        currentHoveredNode = node;
        canvas.style.cursor = node && node.data.type !== "keyword" ? "pointer" : "default";
        setTooltipNode(node);
        render();
      }

      const tooltipEl = tooltipRef.current;
      if (tooltipEl) {
        tooltipEl.style.opacity = node ? "1" : "0";
      }
      if (node) {
        updateTooltipPosition(e.clientX, e.clientY);
      }
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
  }, [hierarchyData, width, height, getColor, containerSize.width, containerSize.height]);

  const tooltipTitle = tooltipNode?.data.name;
  const tooltipType = tooltipNode?.data.type;
  const tooltipTypeLabel =
    tooltipType === "topic"
      ? "Topic"
      : tooltipType === "cluster"
        ? "Cluster"
        : tooltipType === "keyword"
          ? "Keyword"
          : null;
  const tooltipCoverage = formatCoveragePercent(tooltipNode?.data.data?.coverage);
  const tooltipKeywords = tooltipNode?.data.data?.keywordsCount;
  const tooltipVolume = tooltipNode?.data.data?.searchVolume;

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
          <Card variant="profileCard" className="w-[260px] p-3 bg-foreground-light border-none rounded-xl">
            {tooltipTypeLabel ? (
              <div className="mb-1">
                <Badge variant="outline" className="border border-general-border">{tooltipTypeLabel}</Badge>
              </div>
            ) : null}
            <CardTitle className="text-sm font-medium text-general-primary">
              {tooltipTitle}
            </CardTitle>
            <div className="mt-2 flex flex-col items-start flex-wrap gap-2">
              <Badge variant="outline">Topic Coverage&nbsp;<span className="text-general-foreground">{tooltipCoverage}</span></Badge>
              <Badge variant="outline">Keywords&nbsp;<span className="text-general-foreground"> {tooltipKeywords ?? 0}</span></Badge>
              {tooltipVolume !== undefined ? (
                <Badge variant="outline">
                  Cluster Vol&nbsp;<span className="text-general-foreground">{formatCompactNumber(tooltipVolume)}</span>
                </Badge>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
