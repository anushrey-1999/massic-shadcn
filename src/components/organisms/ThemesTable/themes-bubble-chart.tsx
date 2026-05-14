"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import * as d3 from "d3";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import type { ThemeRow } from "@/types/themes-types";

const OFFERING_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#0ea5e9", "#f43f5e", "#a855f7",
  "#84cc16", "#06b6d4", "#d946ef", "#fb923c", "#facc15",
];

function hashIndex(str: string, len: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % len;
}

interface BubbleNode {
  name: string;
  type: "root" | "offering" | "theme" | "topic";
  value?: number;
  children?: BubbleNode[];
  themeData?: ThemeRow;
  offeringName?: string;
}

type PackedNode = d3.HierarchyCircularNode<BubbleNode>;

interface ThemesBubbleChartProps {
  data: ThemeRow[];
  selectedOffering?: string;
  width?: number;
  height?: number;
}

export function ThemesBubbleChart({
  data,
  selectedOffering,
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
    // Build a map of offering → all themes that include that offering.
    // Each theme can appear under multiple offerings (one node per offering).
    // When selectedOffering is set, only build that one offering's circle.
    const offeringMap = new Map<string, ThemeRow[]>();

    data.forEach((theme) => {
      const allOfferings =
        Array.isArray(theme.offerings) && theme.offerings.length > 0
          ? [...new Set(theme.offerings.map((o) => o.trim()).filter(Boolean))]
          : theme.origin_offering?.trim()
            ? [theme.origin_offering.trim()]
            : ["Other"];

      const offeringsToUse = selectedOffering
        ? allOfferings.includes(selectedOffering)
          ? [selectedOffering]
          : []
        : allOfferings;

      offeringsToUse.forEach((offeringName) => {
        if (!offeringMap.has(offeringName)) offeringMap.set(offeringName, []);
        offeringMap.get(offeringName)!.push(theme);
      });
    });

    return {
      name: "root",
      type: "root",
      children: Array.from(offeringMap.entries()).map(([offeringName, themes]) => ({
        name: offeringName,
        type: "offering",
        offeringName,
        children: themes.map((theme) => ({
          name: theme.theme_name,
          type: "theme",
          themeData: theme,
          offeringName,
          children:
            (theme.topics ?? []).length > 0
              ? theme.topics!.map((topic) => ({
                  name: topic.topic_name,
                  type: "topic" as const,
                  value: 1,
                  offeringName,
                }))
              : [
                  {
                    name: theme.theme_name,
                    type: "topic" as const,
                    value: Math.max(theme.topic_count ?? 1, 1),
                    offeringName,
                  },
                ],
        })),
      })),
    };
  }, [data]);

  const offeringColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    (hierarchyData.children ?? []).forEach((offering) => {
      map[offering.name] = OFFERING_COLORS[hashIndex(offering.name, OFFERING_COLORS.length)];
    });
    return map;
  }, [hierarchyData]);

  const getColor = useCallback(
    (node: PackedNode): string =>
      offeringColorMap[node.data.offeringName ?? ""] ?? "#94a3b8",
    [offeringColorMap]
  );

  const drawWrappedText = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      text: string,
      cx: number,
      cy: number,
      maxWidth: number,
      fontSize: number,
      color: string,
      fontWeight = "600"
    ) => {
      ctx.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const words = text.split(" ");
      const lines: string[] = [];
      let line = "";

      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = word;
          if (lines.length >= 2) break;
        } else {
          line = test;
        }
      }
      if (line) {
        if (lines.length >= 2) {
          while (ctx.measureText(line + "…").width > maxWidth && line.length > 1) {
            line = line.slice(0, -1);
          }
          lines.push(line.length < text.split(" ").join("").length ? line + "…" : line);
        } else {
          lines.push(line);
        }
      }

      const lineHeight = fontSize * 1.3;
      const startY = cy - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
    },
    []
  );

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
        if (node.depth === 0) return 16;
        if (node.depth === 1) return 6;
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

      // Draw filled circles (back-to-front: offering → theme → topic)
      allNodes.forEach((node) => {
        if (node.data.type === "root") return;

        const x = (node.x - view[0]) * k + centerX;
        const y = (node.y - view[1]) * k + centerY;
        const r = node.r * k;
        if (r < 0.5) return;

        const color = getColor(node);

        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);

        if (node.data.type === "offering") {
          ctx.fillStyle = color + "1e"; // ~12% opacity
          ctx.fill();
          ctx.strokeStyle = color + "cc";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (node.data.type === "theme") {
          ctx.fillStyle = color + "b8"; // ~72% opacity
          ctx.fill();
          ctx.strokeStyle = "#ffffff55";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (node.data.type === "topic") {
          ctx.fillStyle = color + "d4"; // ~83% opacity
          ctx.fill();
        }
      });

      // Hover ring
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

      // Draw text labels
      allNodes.forEach((node) => {
        if (node.data.type === "root") return;

        const x = (node.x - view[0]) * k + centerX;
        const y = (node.y - view[1]) * k + centerY;
        const r = node.r * k;
        if (r < 0.5) return;

        const color = getColor(node);

        if (node.data.type === "topic" && r > 9) {
          const fontSize = Math.min(9, Math.max(6, r / 3));
          drawWrappedText(ctx, node.data.name, x, y, r * 1.75, fontSize, "#ffffffdd", "400");
        }
      });
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
    drawWrappedText,
  ]);

  const tooltipType = tooltipNode?.data.type;
  const tooltipTypeLabel =
    tooltipType === "offering"
      ? "Offering"
      : tooltipType === "theme"
        ? "Theme"
        : tooltipType === "topic"
          ? "Topic"
          : null;
  const tooltipThemeData = tooltipNode?.data.themeData;
  const tooltipColor =
    offeringColorMap[tooltipNode?.data.offeringName ?? ""] ?? "#94a3b8";

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
          <Card
            variant="profileCard"
            className="w-[280px] p-3 bg-foreground-light border-none rounded-xl"
          >
            {tooltipTypeLabel ? (
              <div className="mb-1.5">
                <Badge
                  variant="outline"
                  className="border border-general-border"
                  style={{ borderLeftColor: tooltipColor, borderLeftWidth: 3 }}
                >
                  {tooltipTypeLabel}
                </Badge>
              </div>
            ) : null}
            <CardTitle className="text-sm font-medium text-general-primary leading-snug">
              {tooltipNode.data.name}
            </CardTitle>

            {tooltipType === "offering" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">
                  Themes&nbsp;
                  <span className="text-general-foreground">
                    {tooltipNode.children?.length ?? 0}
                  </span>
                </Badge>
                <Badge variant="outline">
                  Topics&nbsp;
                  <span className="text-general-foreground">{tooltipNode.value ?? 0}</span>
                </Badge>
              </div>
            )}

            {tooltipType === "theme" && tooltipThemeData && (
              <>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="outline">
                    Topics&nbsp;
                    <span className="text-general-foreground">
                      {tooltipThemeData.topic_count ?? 0}
                    </span>
                  </Badge>
                </div>
                {tooltipThemeData.topics && tooltipThemeData.topics.length > 0 && (
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
              </>
            )}

            {tooltipType === "topic" && (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium">Theme:</span> {tooltipNode.parent?.data.name}
              </p>
            )}
          </Card>
        ) : null}
      </div>

      {/* Legend */}
      {Object.keys(offeringColorMap).length > 0 && (
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1.5 max-w-[55%] rounded-lg border border-border bg-white/90 px-3 py-2 shadow-sm">
          {Object.entries(offeringColorMap).map(([name, color]) => (
            <span key={name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              {name}
            </span>
          ))}
        </div>
      )}

      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-white/80 px-2 py-1 rounded border border-border select-none">
        Click to zoom · Click outside to reset
      </div>
    </div>
  );
}
