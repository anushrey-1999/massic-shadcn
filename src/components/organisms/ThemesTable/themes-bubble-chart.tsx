"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import * as d3 from "d3";
import { ChartHoverTooltip } from "@/components/ui/chart-hover-tooltip";
import { BUSINESS_RELEVANCE_PALETTE } from "@/components/organisms/StrategyBubbleChart/strategy-bubble-chart";
import type { ThemeRow } from "@/types/themes-types";

function normalizeScore(scoreRaw?: number) {
  const score = scoreRaw ?? 0;
  if (!Number.isFinite(score)) return 0;
  if (score <= 1) return Math.max(0, Math.min(1, score));
  if (score <= 100) return Math.max(0, Math.min(1, score / 100));
  return 1;
}

interface BubbleNode {
  name: string;
  type: "root" | "theme" | "topic";
  value?: number;
  children?: BubbleNode[];
  themeData?: ThemeRow;
  data?: {
    relevanceScore?: number;
    coverage?: number;
  };
}

type PackedNode = d3.HierarchyCircularNode<BubbleNode>;

interface ThemesBubbleChartProps {
  data: ThemeRow[];
  width?: number;
  height?: number;
}

export function ThemesBubbleChart({
  data,
  width = 1200,
  height = 800,
}: ThemesBubbleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipNode, setTooltipNode] = useState<PackedNode | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const update = () => {
      const next = { width: el.clientWidth, height: el.clientHeight };
      setContainerSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next
      );
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

  const hierarchyData = useMemo((): BubbleNode => {
    return {
      name: "root",
      type: "root",
      children: data.map((theme) => ({
        name: theme.theme_name,
        type: "theme",
        themeData: theme,
        data: {
          relevanceScore: theme.business_relevance_score,
          coverage: theme.topic_coverage,
        },
        children:
          (theme.topics ?? []).length > 0
            ? theme.topics.map((topic) => ({
                name: topic.topic_name,
                type: "topic" as const,
                value: 1,
                data: {
                  relevanceScore: topic.business_relevance_score,
                  coverage: topic.topic_coverage,
                },
              }))
            : [
                {
                  name: theme.theme_name,
                  type: "topic" as const,
                  value: Math.max(theme.topic_count ?? 1, 1),
                  data: {
                    relevanceScore: theme.business_relevance_score,
                    coverage: theme.topic_coverage,
                  },
                },
              ],
      })),
    };
  }, [data]);

  const getColor = useCallback((node: PackedNode): string => {
    const themeAncestor =
      node.data.type === "theme"
        ? node
        : node.ancestors().find((a): a is PackedNode => a.data.type === "theme") ?? null;
    const score = normalizeScore(
      node.data.data?.coverage ??
        themeAncestor?.data.data?.coverage ??
        node.data.data?.relevanceScore ??
        themeAncestor?.data.data?.relevanceScore
    );
    const index = Math.max(
      0,
      Math.min(
        BUSINESS_RELEVANCE_PALETTE.length - 1,
        Math.round(score * (BUSINESS_RELEVANCE_PALETTE.length - 1))
      )
    );
    return BUSINESS_RELEVANCE_PALETTE[index];
  }, []);

  const formatPercent = useCallback((value?: number) => {
    if (value === undefined || value === null) return "-";
    if (!Number.isFinite(value)) return "-";
    const normalized = value <= 1 ? value * 100 : value;
    return `${Math.round(normalized)}%`;
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

    const pack = d3
      .pack<BubbleNode>()
      .size([actualWidth, actualHeight])
      .padding((node) => {
        if (node.depth === 0) return 10;
        if (node.depth === 1) return 4;
        return 2;
      });

    const root = d3
      .hierarchy<BubbleNode>(hierarchyData)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

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

        const color = getColor(node);

        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);

        if (node.data.type === "theme") {
          ctx.fillStyle = color + "26";
          ctx.fill();
          ctx.strokeStyle = color + "cc";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (node.data.type === "topic") {
          ctx.fillStyle = color + "d9";
          ctx.fill();
          ctx.strokeStyle = "#ffffff99";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      if (currentHoveredNode && currentHoveredNode !== focusNode) {
        const hx = (currentHoveredNode.x - view[0]) * k + centerX;
        const hy = (currentHoveredNode.y - view[1]) * k + centerY;
        const hr = currentHoveredNode.r * k;
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, 2 * Math.PI);
        ctx.strokeStyle = "#00000055";
        ctx.lineWidth = 1.5;
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
        view = interpolate(d3.easeCubicInOut(t));
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

    const findNode = (px: number, py: number): PackedNode | null => {
      let found: PackedNode | null = null;
      let minR = Infinity;
      const k = getScale();

      for (const node of allNodes) {
        if (node.data.type === "root") continue;
        const nx = (node.x - view[0]) * k + centerX;
        const ny = (node.y - view[1]) * k + centerY;
        const nr = node.r * k;
        if (nr < 0.5) continue;
        const dx = px - nx;
        const dy = py - ny;
        if (dx * dx + dy * dy <= nr * nr && nr < minR) {
          found = node;
          minR = nr;
        }
      }
      return found;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clicked = findNode(e.clientX - rect.left, e.clientY - rect.top);
      if (clicked && clicked !== focusNode) {
        zoomTo(clicked);
      } else if (!clicked) {
        zoomTo(packedData);
      }
    };

    const updateTooltipPos = (clientX: number, clientY: number) => {
      const tooltipEl = tooltipRef.current;
      const containerEl = containerRef.current;
      if (!tooltipEl || !containerEl) return;
      const rect = containerEl.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const left = Math.max(0, Math.min(x + 12, rect.width - 290));
      const top = Math.max(0, Math.min(y + 12, rect.height - 180));
      tooltipEl.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const node = findNode(e.clientX - rect.left, e.clientY - rect.top);
      if (node !== currentHoveredNode) {
        currentHoveredNode = node;
        canvas.style.cursor = node && node.data.type !== "topic" ? "pointer" : "default";
        setTooltipNode(node);
        render();
      }
      const tooltipEl = tooltipRef.current;
      if (tooltipEl) tooltipEl.style.opacity = node ? "1" : "0";
      if (node) updateTooltipPos(e.clientX, e.clientY);
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
  }, [
    hierarchyData,
    containerSize.width,
    containerSize.height,
    width,
    height,
    getColor,
  ]);

  const tooltipType = tooltipNode?.data.type;
  const tooltipTypeLabel =
    tooltipType === "theme"
      ? "Theme"
      : tooltipType === "topic"
        ? "Topic"
        : null;
  const tooltipThemeData = tooltipNode?.data.themeData;
  const tooltipRelevance = formatPercent(tooltipNode?.data.data?.relevanceScore);
  const tooltipCoverage = formatPercent(tooltipNode?.data.data?.coverage);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-white rounded-lg border border-border"
    >
      <canvas ref={canvasRef} className="w-full h-full" />

      <div
        ref={tooltipRef}
        className="pointer-events-none absolute left-0 top-0 z-10 opacity-0 transition-opacity duration-150"
      >
        {tooltipNode ? (
          <ChartHoverTooltip
            typeLabel={tooltipTypeLabel}
            title={tooltipNode.data.name}
            metrics={
              tooltipType === "theme" && tooltipThemeData
                ? [
                    { label: "Topics", value: tooltipThemeData.topic_count ?? 0 },
                    { label: "Coverage", value: tooltipCoverage },
                    { label: "Relevance", value: tooltipRelevance },
                  ]
                : tooltipType === "topic"
                  ? [
                      { label: "Coverage", value: tooltipCoverage },
                      { label: "Relevance", value: tooltipRelevance },
                    ]
                : []
            }
          >
            {tooltipType === "theme" &&
              tooltipThemeData?.topics &&
              tooltipThemeData.topics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tooltipThemeData.topics.slice(0, 5).map((t, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground"
                    >
                      {t.topic_name}
                    </span>
                  ))}
                  {tooltipThemeData.topics.length > 5 && (
                    <span className="text-[10px] text-muted-foreground self-center">
                      +{tooltipThemeData.topics.length - 5} more
                    </span>
                  )}
                </div>
              )}
            {tooltipType === "topic" && (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium">Theme:</span> {tooltipNode.parent?.data.name}
              </p>
            )}
          </ChartHoverTooltip>
        ) : null}
      </div>

      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-white/80 px-2 py-1 rounded border border-border select-none">
        Click to zoom · Click outside to reset
      </div>
    </div>
  );
}
