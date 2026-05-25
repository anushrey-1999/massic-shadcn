"use client";

import * as React from "react";
import * as d3 from "d3";
import { ChartHoverTooltip } from "@/components/ui/chart-hover-tooltip";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { BUSINESS_RELEVANCE_PALETTE } from "@/components/organisms/StrategyBubbleChart/strategy-bubble-chart";
import type { ThemeScatterPoint, ThemeRow } from "@/types/themes-types";

interface ThemesScatterPlotProps {
  points: ThemeScatterPoint[];
  themes?: ThemeRow[];
  width?: number;
  height?: number;
}

interface RenderedPoint extends ThemeScatterPoint {
  cx: number;
  cy: number;
  radius: number;
  color: string;
  themeName?: string;
}

interface ThemeCluster {
  theme: ThemeRow;
  points: RenderedPoint[];
  cx: number;
  cy: number;
  // hull in base screen coords, already inflated with padding
  hull: [number, number][];
  color: string;
}

type TooltipTarget =
  | { kind: "topic"; point: RenderedPoint }
  | { kind: "theme"; cluster: ThemeCluster };

const CLUSTER_PADDING = 32;
const TOPIC_BASE_RADIUS = 4;
const TOPIC_SCORE_EXTRA = 5;
const MIN_SCALE = 0.3;
const MAX_SCALE = 20;

function getPointColor(score: number) {
  const n = Math.max(0, Math.min(1, score || 0));
  if (n >= 0.75) return BUSINESS_RELEVANCE_PALETTE[BUSINESS_RELEVANCE_PALETTE.length - 1];
  if (n >= 0.5) return BUSINESS_RELEVANCE_PALETTE[6];
  return BUSINESS_RELEVANCE_PALETTE[0];
}

function getThemeColor(theme: ThemeRow): string {
  const n = Math.max(0, Math.min(1, theme.business_relevance_score ?? 0));
  const idx = Math.round(n * (BUSINESS_RELEVANCE_PALETTE.length - 1));
  return BUSINESS_RELEVANCE_PALETTE[Math.max(0, Math.min(BUSINESS_RELEVANCE_PALETTE.length - 1, idx))];
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

// Expand a point outward from the centroid by `padding` px
function expandPoint(
  px: number, py: number,
  cx: number, cy: number,
  padding: number
): [number, number] {
  const dx = px - cx;
  const dy = py - cy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return [px + padding, py];
  return [px + (dx / len) * padding, py + (dy / len) * padding];
}

// Build expanded input points for hull computation: each topic point becomes
// a small ring of sample points so single/two-point clusters still get a blob
function expandedHullInputs(
  points: RenderedPoint[],
  cx: number, cy: number,
  padding: number
): [number, number][] {
  const pts: [number, number][] = [];
  for (const p of points) {
    const r = p.radius + padding;
    // Sample 8 points around each topic dot, expanded outward from centroid
    const base = expandPoint(p.cx, p.cy, cx, cy, 0);
    for (let a = 0; a < 8; a++) {
      const angle = (a / 8) * Math.PI * 2;
      pts.push([base[0] + Math.cos(angle) * r, base[1] + Math.sin(angle) * r]);
    }
  }
  return pts;
}

// Draw a smooth blob through hull points using quadratic bezier midpoints
function drawSmoothBlob(ctx: CanvasRenderingContext2D, hull: [number, number][]) {
  if (hull.length < 2) return;
  const n = hull.length;

  if (n === 2) {
    // fallback: rounded capsule
    ctx.beginPath();
    ctx.moveTo(hull[0][0], hull[0][1]);
    ctx.lineTo(hull[1][0], hull[1][1]);
    return;
  }

  // Midpoints between consecutive hull vertices
  const mids: [number, number][] = hull.map((p, i) => {
    const q = hull[(i + 1) % n];
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  });

  ctx.beginPath();
  ctx.moveTo(mids[0][0], mids[0][1]);
  for (let i = 0; i < n; i++) {
    const cp = hull[(i + 1) % n];       // hull vertex = quadratic control point
    const end = mids[(i + 1) % n];      // next midpoint = end point
    ctx.quadraticCurveTo(cp[0], cp[1], end[0], end[1]);
  }
  ctx.closePath();
}

function buildClusters(
  themes: ThemeRow[],
  renderedPoints: RenderedPoint[]
): { clusters: ThemeCluster[]; orphans: RenderedPoint[] } {
  const nameToPoint = new Map<string, RenderedPoint>();
  for (const rp of renderedPoints) {
    nameToPoint.set(rp.topic_name.trim().toLowerCase(), rp);
  }

  const claimedKeys = new Set<string>();
  const clusters: ThemeCluster[] = [];

  for (const theme of themes) {
    const matched: RenderedPoint[] = [];
    for (const t of theme.topics ?? []) {
      const key = t.topic_name.trim().toLowerCase();
      const rp = nameToPoint.get(key);
      if (rp) {
        matched.push({ ...rp, themeName: theme.theme_name });
        claimedKeys.add(key);
      }
    }
    if (matched.length === 0) continue;

    const cx = matched.reduce((s, p) => s + p.cx, 0) / matched.length;
    const cy = matched.reduce((s, p) => s + p.cy, 0) / matched.length;

    const inputs = expandedHullInputs(matched, cx, cy, CLUSTER_PADDING);
    const rawHull = d3.polygonHull(inputs);

    clusters.push({
      theme,
      points: matched,
      cx,
      cy,
      hull: rawHull ?? inputs.slice(0, 4) as [number, number][],
      color: getThemeColor(theme),
    });
  }

  const orphans = renderedPoints.filter(
    (rp) => !claimedKeys.has(rp.topic_name.trim().toLowerCase())
  );

  return { clusters, orphans };
}

export function ThemesScatterPlot({
  points,
  themes = [],
  width = 1200,
  height = 800,
}: ThemesScatterPlotProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = React.useState<TooltipTarget | null>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState({ left: 0, top: 0 });

  const txRef = React.useRef(0);
  const tyRef = React.useRef(0);
  const scaleRef = React.useRef(1);

  const animFrameRef = React.useRef<number | null>(null);
  const isDraggingRef = React.useRef(false);
  const hasDraggedRef = React.useRef(false);
  const dragStartRef = React.useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const clustersRef = React.useRef<ThemeCluster[]>([]);
  const orphansRef = React.useRef<RenderedPoint[]>([]);
  const renderRef = React.useRef<(() => void) | null>(null);
  const actualSizeRef = React.useRef({ width: 0, height: 0 });
  const selectedClusterRef = React.useRef<ThemeCluster | null>(null);

  // Resize observer
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

  // Draw effect
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const aw = containerSize.width || containerRef.current?.clientWidth || width;
    const ah = containerSize.height || containerRef.current?.clientHeight || height;
    if (aw <= 0 || ah <= 0) return;

    actualSizeRef.current = { width: aw, height: ah };

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
      const score = Math.max(0, Math.min(1, point.business_relevance_score || 0));
      const { cx, cy } = toBaseScreen(point.x, point.y, bounds, plotWidth, plotHeight, padding);
      return {
        ...point,
        cx,
        cy,
        radius: TOPIC_BASE_RADIUS + score * TOPIC_SCORE_EXTRA,
        color: getPointColor(score),
      };
    });

    const { clusters, orphans } = themes.length > 0
      ? buildClusters(themes, renderedPoints)
      : { clusters: [], orphans: renderedPoints };

    clustersRef.current = clusters;
    orphansRef.current = orphans;

    const render = () => {
      const tx = txRef.current;
      const ty = tyRef.current;
      const k = scaleRef.current;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, aw, ah);

      ctx.save();
      ctx.transform(k, 0, 0, k, tx, ty);

      // Grid
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1 / k;
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

      const sel = selectedClusterRef.current;
      const hasSelection = sel !== null;

      // Theme blobs
      for (const cluster of clustersRef.current) {
        if (cluster.hull.length < 2) continue;
        const isSelected = hasSelection && cluster.theme.id === sel!.theme.id;
        const dimmed = hasSelection && !isSelected;

        drawSmoothBlob(ctx, cluster.hull);
        ctx.fillStyle = dimmed
          ? cluster.color + "08"
          : isSelected
            ? cluster.color + "28"
            : cluster.color + "15";
        ctx.fill();

        drawSmoothBlob(ctx, cluster.hull);
        ctx.strokeStyle = dimmed
          ? cluster.color + "28"
          : isSelected
            ? cluster.color + "cc"
            : cluster.color + "88";
        ctx.lineWidth = (isSelected ? 2 : 1.5) / k;
        if (!isSelected) ctx.setLineDash([6 / k, 4 / k]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Orphan dots
      for (const point of orphansRef.current) {
        ctx.beginPath();
        ctx.arc(point.cx, point.cy, point.radius, 0, 2 * Math.PI);
        ctx.fillStyle = hasSelection ? "#9ca3af33" : "#9ca3af88";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5 / k;
        ctx.stroke();
      }

      // Clustered topic dots
      for (const cluster of clustersRef.current) {
        const isSelected = hasSelection && cluster.theme.id === sel!.theme.id;
        const dimmed = hasSelection && !isSelected;
        for (const point of cluster.points) {
          const r = isSelected ? point.radius + 1.5 : point.radius;
          ctx.beginPath();
          ctx.arc(point.cx, point.cy, r, 0, 2 * Math.PI);
          ctx.fillStyle = dimmed ? `${point.color}33` : `${point.color}d9`;
          ctx.fill();
          ctx.strokeStyle = dimmed ? "transparent" : "#ffffff";
          ctx.lineWidth = 1.5 / k;
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    renderRef.current = render;
    render();
  }, [containerSize, points, themes, width, height]);

  // Event handlers
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const inversePos = (sx: number, sy: number) => ({
      bx: (sx - txRef.current) / scaleRef.current,
      by: (sy - tyRef.current) / scaleRef.current,
    });

    const findTarget = (mx: number, my: number): TooltipTarget | null => {
      const { bx, by } = inversePos(mx, my);
      const hitExtra = 6 / scaleRef.current;

      // Topics first
      let best: RenderedPoint | null = null;
      let bestDist = Infinity;
      const allPoints = [
        ...clustersRef.current.flatMap((c) => c.points),
        ...orphansRef.current,
      ];
      for (const p of allPoints) {
        const d = Math.sqrt((bx - p.cx) ** 2 + (by - p.cy) ** 2);
        if (d <= p.radius + hitExtra && d < bestDist) {
          best = p;
          bestDist = d;
        }
      }
      if (best) return { kind: "topic", point: best };

      // Then blob regions
      for (const cluster of clustersRef.current) {
        if (d3.polygonContains(cluster.hull, [bx, by])) {
          return { kind: "theme", cluster };
        }
      }

      return null;
    };

    const animateZoom = (targetTx: number, targetTy: number, targetScale: number, duration = 600) => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const startTx = txRef.current;
      const startTy = tyRef.current;
      const startScale = scaleRef.current;
      const startTime = performance.now();

      const tick = (now: number) => {
        const t = Math.min((now - startTime) / duration, 1);
        const ease = d3.easeCubicInOut(t);
        txRef.current = startTx + (targetTx - startTx) * ease;
        tyRef.current = startTy + (targetTy - startTy) * ease;
        scaleRef.current = startScale + (targetScale - startScale) * ease;
        renderRef.current?.();
        if (t < 1) animFrameRef.current = requestAnimationFrame(tick);
      };

      animFrameRef.current = requestAnimationFrame(tick);
    };

    const zoomToCluster = (cluster: ThemeCluster) => {
      const { width: aw, height: ah } = actualSizeRef.current;
      const xs = cluster.hull.map((p) => p[0]);
      const ys = cluster.hull.map((p) => p[1]);
      const hullCx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const hullCy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const hullW = Math.max(...xs) - Math.min(...xs);
      const hullH = Math.max(...ys) - Math.min(...ys);
      const targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE,
        Math.min(aw / (hullW + 80), ah / (hullH + 80)) * 0.85
      ));
      animateZoom(
        aw / 2 - hullCx * targetScale,
        ah / 2 - hullCy * targetScale,
        targetScale
      );
    };

    const resetZoom = () => animateZoom(0, 0, 1);

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current * factor));
      const realFactor = newScale / scaleRef.current;
      txRef.current = mx - (mx - txRef.current) * realFactor;
      tyRef.current = my - (my - tyRef.current) * realFactor;
      scaleRef.current = newScale;
      renderRef.current?.();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      dragStartRef.current = { x: e.clientX, y: e.clientY, tx: txRef.current, ty: tyRef.current };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDraggedRef.current = true;
        txRef.current = dragStartRef.current.tx + dx;
        tyRef.current = dragStartRef.current.ty + dy;
        canvas.style.cursor = "grabbing";
        renderRef.current?.();
        setTooltip(null);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const target = findTarget(e.clientX - rect.left, e.clientY - rect.top);
      canvas.style.cursor = target ? "pointer" : scaleRef.current > 1.05 ? "grab" : "default";
      setTooltip(target);

      if (target) {
        const cr = container.getBoundingClientRect();
        setTooltipPosition({
          left: Math.max(0, Math.min(e.clientX - cr.left + 12, cr.width - 300)),
          top: Math.max(0, Math.min(e.clientY - cr.top + 12, cr.height - 220)),
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      if (!hasDraggedRef.current) {
        const rect = canvas.getBoundingClientRect();
        const target = findTarget(e.clientX - rect.left, e.clientY - rect.top);

        if (target?.kind === "theme") {
          const alreadySelected =
            selectedClusterRef.current?.theme.id === target.cluster.theme.id;
          if (alreadySelected) {
            selectedClusterRef.current = null;
            resetZoom();
          } else {
            selectedClusterRef.current = target.cluster;
            zoomToCluster(target.cluster);
          }
          renderRef.current?.();
        } else if (target?.kind === "topic") {
          // Clicking a topic selects its parent theme
          const parentCluster = clustersRef.current.find(
            (c) => c.theme.theme_name === target.point.themeName
          ) ?? null;
          selectedClusterRef.current = parentCluster;
          renderRef.current?.();
        } else if (!target) {
          selectedClusterRef.current = null;
          if (scaleRef.current > 1.05) resetZoom();
          renderRef.current?.();
        }
      }

      canvas.style.cursor = "default";
    };

    const handleMouseLeave = () => {
      isDraggingRef.current = false;
      canvas.style.cursor = "default";
      setTooltip(null);
    };

    const handleDblClick = () => resetZoom();

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("dblclick", handleDblClick);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("dblclick", handleDblClick);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-xl bg-white select-none"
    >
      {points.length > 0 ? (
        <>
          <canvas ref={canvasRef} className="h-full w-full" />
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground bg-white/80 px-3 py-1 rounded-full border border-border/50 shadow-sm">
            Click theme to select · Click topic to select its theme · Click empty to deselect · Scroll to zoom · Drag to pan
          </div>
        </>
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
          {tooltip.kind === "topic" ? (
            <ChartHoverTooltip typeLabel="Topic" title={tooltip.point.topic_name}>
              {tooltip.point.themeName && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium">Theme:</span> {tooltip.point.themeName}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Relevance</span>
                <RelevancePill score={tooltip.point.business_relevance_score} />
              </div>
            </ChartHoverTooltip>
          ) : (
            <ChartHoverTooltip typeLabel="Theme" title={tooltip.cluster.theme.theme_name}>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Topics</span>
                <span className="text-xs font-medium">{tooltip.cluster.points.length}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Relevance</span>
                <RelevancePill score={tooltip.cluster.theme.business_relevance_score ?? 0} />
              </div>
              {tooltip.cluster.theme.topics && tooltip.cluster.theme.topics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tooltip.cluster.theme.topics.slice(0, 4).map((t, i) => (
                    <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                      {t.topic_name}
                    </span>
                  ))}
                  {tooltip.cluster.theme.topics.length > 4 && (
                    <span className="text-[10px] text-muted-foreground self-center">
                      +{tooltip.cluster.theme.topics.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </ChartHoverTooltip>
          )}
        </div>
      ) : null}
    </div>
  );
}
