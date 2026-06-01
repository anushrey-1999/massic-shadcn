"use client";

import * as React from "react";
import { ChartHoverTooltip } from "@/components/ui/chart-hover-tooltip";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { BUSINESS_RELEVANCE_PALETTE } from "@/components/organisms/StrategyBubbleChart/strategy-bubble-chart";
import type { ThemeScatterPoint } from "@/types/themes-types";

interface ThemesScatterPlotProps {
  points: ThemeScatterPoint[];
  width?: number;
  height?: number;
}

interface RenderedPoint extends ThemeScatterPoint {
  cx: number;
  cy: number;
  radius: number;
  color: string;
  normalizedScore: number;
}

type TooltipTarget = { kind: "topic"; point: RenderedPoint };

const TOPIC_BASE_RADIUS = 4;
const TOPIC_SCORE_EXTRA = 5;

function normalizeScore(scoreRaw?: number) {
  const score = scoreRaw ?? 0;
  if (!Number.isFinite(score)) return 0;
  if (score <= 1) return Math.max(0, Math.min(1, score));
  if (score <= 100) return Math.max(0, Math.min(1, score / 100));
  return 1;
}

function getPointColor(score: number) {
  const index = Math.max(
    0,
    Math.min(
      BUSINESS_RELEVANCE_PALETTE.length - 1,
      Math.round(score * (BUSINESS_RELEVANCE_PALETTE.length - 1))
    )
  );
  return BUSINESS_RELEVANCE_PALETTE[index];
}

function getBounds(points: ThemeScatterPoint[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX: maxX === minX ? maxX + 1 : maxX,
    minY,
    maxY: maxY === minY ? maxY + 1 : maxY,
  };
}

function toBaseScreen(
  x: number,
  y: number,
  bounds: ReturnType<typeof getBounds>,
  plotWidth: number,
  plotHeight: number,
  padding: { top: number; right: number; bottom: number; left: number }
) {
  const xRange = bounds.maxX - bounds.minX;
  const yRange = bounds.maxY - bounds.minY;
  return {
    cx: padding.left + ((x - bounds.minX) / xRange) * plotWidth,
    cy: padding.top + plotHeight - ((y - bounds.minY) / yRange) * plotHeight,
  };
}

export function ThemesScatterPlot({
  points,
  width = 1200,
  height = 800,
}: ThemesScatterPlotProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = React.useState<TooltipTarget | null>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState({ left: 0, top: 0 });

  const pointsRef = React.useRef<RenderedPoint[]>([]);

  React.useEffect(() => {
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

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const aw = containerSize.width || containerRef.current?.clientWidth || width;
    const ah = containerSize.height || containerRef.current?.clientHeight || height;
    if (aw <= 0 || ah <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const padding = { top: 28, right: 28, bottom: 28, left: 28 };
    const plotWidth = Math.max(1, aw - padding.left - padding.right);
    const plotHeight = Math.max(1, ah - padding.top - padding.bottom);
    const bounds = getBounds(points);

    canvas.width = aw * dpr;
    canvas.height = ah * dpr;
    canvas.style.width = `${aw}px`;
    canvas.style.height = `${ah}px`;

    const renderedPoints: RenderedPoint[] = points.map((point) => {
      const score = normalizeScore(point.business_relevance_score);
      const { cx, cy } = toBaseScreen(point.x, point.y, bounds, plotWidth, plotHeight, padding);
      return {
        ...point,
        cx,
        cy,
        radius: TOPIC_BASE_RADIUS + score * TOPIC_SCORE_EXTRA,
        color: getPointColor(score),
        normalizedScore: score,
      };
    });

    pointsRef.current = renderedPoints;

    const render = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, aw, ah);

      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      const gridSteps = 5;
      for (let i = 0; i <= gridSteps; i++) {
        const gx = padding.left + (plotWidth / gridSteps) * i;
        const gy = padding.top + (plotHeight / gridSteps) * i;
        ctx.beginPath();
        ctx.moveTo(gx, padding.top);
        ctx.lineTo(gx, padding.top + plotHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(padding.left, gy);
        ctx.lineTo(padding.left + plotWidth, gy);
        ctx.stroke();
      }

      for (const point of pointsRef.current) {
        ctx.beginPath();
        ctx.arc(point.cx, point.cy, point.radius, 0, 2 * Math.PI);
        ctx.fillStyle = `${point.color}d9`;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    render();
  }, [containerSize, points, width, height]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const findTarget = (mx: number, my: number): TooltipTarget | null => {
      const hitExtra = 6;

      let best: RenderedPoint | null = null;
      let bestDist = Infinity;
      for (const p of pointsRef.current) {
        const d = Math.sqrt((mx - p.cx) ** 2 + (my - p.cy) ** 2);
        if (d <= p.radius + hitExtra && d < bestDist) {
          best = p;
          bestDist = d;
        }
      }
      if (best) return { kind: "topic", point: best };

      return null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const target = findTarget(e.clientX - rect.left, e.clientY - rect.top);
      setTooltip(target);

      if (target) {
        const cr = container.getBoundingClientRect();
        setTooltipPosition({
          left: Math.max(0, Math.min(e.clientX - cr.left + 12, cr.width - 300)),
          top: Math.max(0, Math.min(e.clientY - cr.top + 12, cr.height - 220)),
        });
      }
    };

    const handleMouseLeave = () => {
      canvas.style.cursor = "default";
      setTooltip(null);
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-xl bg-white select-none"
    >
      {points.length > 0 ? (
        <canvas ref={canvasRef} className="h-full w-full" />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No scatter plot data available.
        </div>
      )}

      {tooltip ? (
        <div
          className="pointer-events-none absolute left-0 top-0 z-10"
          style={{ transform: `translate3d(${tooltipPosition.left}px, ${tooltipPosition.top}px, 0)` }}
        >
          <ChartHoverTooltip typeLabel="Topic" title={tooltip.point.topic_name}>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Relevance</span>
              <RelevancePill score={tooltip.point.normalizedScore} color={tooltip.point.color} />
            </div>
          </ChartHoverTooltip>
        </div>
      ) : null}
    </div>
  );
}
