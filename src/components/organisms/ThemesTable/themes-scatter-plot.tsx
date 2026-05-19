"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { RelevancePill } from "@/components/ui/relevance-pill";
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
}

function getPointColor(score: number) {
  const normalized = Math.max(0, Math.min(1, score || 0));
  if (normalized >= 0.75) return "#65a30d";
  if (normalized >= 0.5) return "#d97706";
  return "#dc2626";
}

function getBounds(points: ThemeScatterPoint[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
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

function formatAxisValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function ThemesScatterPlot({
  points,
  width = 1200,
  height = 800,
}: ThemesScatterPlotProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
  const [tooltipPoint, setTooltipPoint] = React.useState<RenderedPoint | null>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState({ left: 0, top: 0 });
  const renderedPointsRef = React.useRef<RenderedPoint[]>([]);

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

    const actualWidth = containerSize.width || containerRef.current?.clientWidth || width;
    const actualHeight = containerSize.height || containerRef.current?.clientHeight || height;
    if (actualWidth <= 0 || actualHeight <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const padding = {
      top: 28,
      right: 28,
      bottom: 44,
      left: 56,
    };
    const plotWidth = Math.max(1, actualWidth - padding.left - padding.right);
    const plotHeight = Math.max(1, actualHeight - padding.top - padding.bottom);
    const bounds = getBounds(points);
    const xRange = bounds.maxX - bounds.minX;
    const yRange = bounds.maxY - bounds.minY;

    canvas.width = actualWidth * dpr;
    canvas.height = actualHeight * dpr;
    canvas.style.width = `${actualWidth}px`;
    canvas.style.height = `${actualHeight}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, actualWidth, actualHeight);

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.font = "11px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const x = padding.left + (plotWidth / gridSteps) * i;
      const y = padding.top + (plotHeight / gridSteps) * i;
      const xValue = bounds.minX + (xRange / gridSteps) * i;
      const yValue = bounds.maxY - (yRange / gridSteps) * i;

      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + plotHeight);
      ctx.stroke();
      ctx.fillText(formatAxisValue(xValue), x, padding.top + plotHeight + 10);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotWidth, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(formatAxisValue(yValue), padding.left - 10, y);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
    }

    ctx.strokeStyle = "#94a3b8";
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + plotHeight);
    ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
    ctx.stroke();

    const renderedPoints = points.map((point) => {
      const score = Math.max(0, Math.min(1, point.business_relevance_score || 0));
      return {
        ...point,
        cx: padding.left + ((point.x - bounds.minX) / xRange) * plotWidth,
        cy: padding.top + plotHeight - ((point.y - bounds.minY) / yRange) * plotHeight,
        radius: 4 + score * 5,
        color: getPointColor(score),
      };
    });

    renderedPoints.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.cx, point.cy, point.radius + 3, 0, 2 * Math.PI);
      ctx.fillStyle = `${point.color}24`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(point.cx, point.cy, point.radius, 0, 2 * Math.PI);
      ctx.fillStyle = `${point.color}d9`;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    renderedPointsRef.current = renderedPoints;
  }, [containerSize.height, containerSize.width, height, points, width]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const findPoint = (x: number, y: number) => {
      let found: RenderedPoint | null = null;
      let closestDistance = Infinity;

      renderedPointsRef.current.forEach((point) => {
        const dx = x - point.cx;
        const dy = y - point.cy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= point.radius + 6 && distance < closestDistance) {
          found = point;
          closestDistance = distance;
        }
      });

      return found;
    };

    const handleMouseMove = (event: MouseEvent) => {
      const canvasRect = canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const point = findPoint(event.clientX - canvasRect.left, event.clientY - canvasRect.top);

      canvas.style.cursor = point ? "pointer" : "default";
      setTooltipPoint(point);

      if (point) {
        setTooltipPosition({
          left: Math.max(0, Math.min(event.clientX - containerRect.left + 12, containerRect.width - 300)),
          top: Math.max(0, Math.min(event.clientY - containerRect.top + 12, containerRect.height - 170)),
        });
      }
    };

    const handleMouseLeave = () => {
      canvas.style.cursor = "default";
      setTooltipPoint(null);
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
      className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-white"
    >
      {points.length > 0 ? (
        <canvas ref={canvasRef} className="h-full w-full" />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No scatter plot data available.
        </div>
      )}

      {tooltipPoint ? (
        <div
          className="pointer-events-none absolute left-0 top-0 z-10"
          style={{ transform: `translate3d(${tooltipPosition.left}px, ${tooltipPosition.top}px, 0)` }}
        >
          <Card
            variant="profileCard"
            className="w-[280px] rounded-xl border-none bg-foreground-light p-3"
          >
            <div className="mb-1.5">
              <Badge
                variant="outline"
                className="border border-general-border"
                style={{ borderLeftColor: tooltipPoint.color, borderLeftWidth: 3 }}
              >
                Topic
              </Badge>
            </div>
            <CardTitle className="text-sm font-medium leading-snug text-general-primary">
              {tooltipPoint.topic_name}
            </CardTitle>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Relevance</span>
              <RelevancePill score={tooltipPoint.business_relevance_score} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>X {tooltipPoint.x.toFixed(2)}</span>
              <span>Y {tooltipPoint.y.toFixed(2)}</span>
            </div>
          </Card>
        </div>
      ) : null}

      <div className="absolute bottom-3 right-3 rounded border border-border bg-white/80 px-2 py-1 text-xs text-muted-foreground select-none">
        Hover points for topic details
      </div>
    </div>
  );
}
