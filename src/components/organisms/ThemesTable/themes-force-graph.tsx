"use client";

import * as React from "react";
import * as d3 from "d3";
import type { ThemeRow } from "@/types/themes-types";

interface ThemesForceGraphProps {
  data: ThemeRow[];
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: "offering" | "theme";
  radius: number;
  color: string;
  origin_offering?: string;
  offerings?: string[];
  connectedOfferingsCount?: number;
  connectedThemeCount?: number;
  topic_count?: number;
  topics?: { topic_name: string }[];
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  offering: string;
  color: string;
}

interface TooltipState {
  x: number;
  y: number;
  node: GraphNode;
}

const OFFERING_PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#0ea5e9", "#f43f5e", "#a855f7",
];

function hashIndex(str: string, len: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % len;
}

export function ThemesForceGraph({ data }: ThemesForceGraphProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const simulationRef = React.useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const resetZoomRef = React.useRef<(() => void) | null>(null);
  const [tooltip, setTooltip] = React.useState<TooltipState | null>(null);
  const [size, setSize] = React.useState({ width: 800, height: 600 });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { nodes, links, offeringColorMap } = React.useMemo(() => {
    const getOfferings = (d: ThemeRow) => {
      const names = [
        ...(Array.isArray(d.offerings) ? d.offerings : []),
        d.origin_offering,
      ]
        .map((name) => String(name ?? "").trim())
        .filter(Boolean);

      return [...new Set(names.length > 0 ? names : ["Other"])];
    };

    const offeringNames = [...new Set(data.flatMap(getOfferings))];

    const colorMap: Record<string, string> = {};
    offeringNames.forEach((name) => {
      colorMap[name] = OFFERING_PALETTE[hashIndex(name, OFFERING_PALETTE.length)];
    });

    const offeringThemeCounts = new Map<string, number>();
    data.forEach((row) => {
      getOfferings(row).forEach((offering) => {
        offeringThemeCounts.set(offering, (offeringThemeCounts.get(offering) ?? 0) + 1);
      });
    });

    const offeringNodes: GraphNode[] = offeringNames.map((name) => ({
      id: `offering::${name}`,
      label: name,
      type: "offering",
      radius: 36,
      color: colorMap[name],
      connectedThemeCount: offeringThemeCounts.get(name) ?? 0,
    }));

    const themeNodes: GraphNode[] = data.map((d) => {
      const offerings = getOfferings(d);
      const primaryOffering = d.origin_offering || offerings[0] || "Other";
      return {
        id: d.id,
        label: d.theme_name,
        type: "theme",
        radius: 8 + Math.sqrt(Math.max(d.topic_count ?? 1, 1)) * 2.8,
        color: colorMap[primaryOffering] ?? "#94a3b8",
        origin_offering: primaryOffering,
        offerings,
        connectedOfferingsCount: offerings.length,
        topic_count: d.topic_count,
        topics: d.topics,
      };
    });

    const links: GraphLink[] = data.flatMap((d) =>
      getOfferings(d).map((offering) => ({
        source: `offering::${offering}`,
        target: d.id,
        offering,
        color: colorMap[offering] ?? "#94a3b8",
      }))
    );

    return {
      nodes: [...offeringNodes, ...themeNodes],
      links,
      offeringColorMap: colorMap,
    };
  }, [data]);

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg || nodes.length === 0) return;

    const { width, height } = size;

    d3.select(svg).selectAll("*").remove();

    simulationRef.current?.stop();

    const nodesCopy: GraphNode[] = nodes.map((n) => ({ ...n }));
    const linksCopy: GraphLink[] = links.map((l) => ({ ...l }));
    const centerX = width / 2;
    const centerY = height / 2;
    const offeringNodes = nodesCopy.filter((node) => node.type === "offering");
    const graphRadius = Math.max(240, Math.min(width, height) * 0.42);
    const offeringAnchors = new Map<string, { x: number; y: number }>();

    offeringNodes.forEach((node, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(offeringNodes.length, 1)) * Math.PI * 2;
      offeringAnchors.set(node.id, {
        x: centerX + Math.cos(angle) * graphRadius,
        y: centerY + Math.sin(angle) * graphRadius,
      });
    });

    const getNodeAnchor = (node: GraphNode) => {
      if (node.type === "offering") {
        return offeringAnchors.get(node.id) ?? { x: centerX, y: centerY };
      }

      const anchors = (node.offerings ?? [])
        .map((offering) => offeringAnchors.get(`offering::${offering}`))
        .filter((anchor): anchor is { x: number; y: number } => Boolean(anchor));

      if (anchors.length === 0) return { x: centerX, y: centerY };

      return {
        x: anchors.reduce((sum, anchor) => sum + anchor.x, 0) / anchors.length,
        y: anchors.reduce((sum, anchor) => sum + anchor.y, 0) / anchors.length,
      };
    };

    nodesCopy.forEach((node) => {
      const anchor = getNodeAnchor(node);
      const jitter = (hashIndex(node.id, 100) - 50) / 50;
      node.x = anchor.x + jitter * 32;
      node.y = anchor.y - jitter * 32;
    });

    const simulation = d3
      .forceSimulation<GraphNode>(nodesCopy)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(linksCopy)
          .id((d) => d.id)
          .distance((l) => {
            const target = l.target as GraphNode;
            return (target.connectedOfferingsCount ?? 1) > 1 ? 220 : 165;
          })
          .strength((l) => ((l.target as GraphNode).connectedOfferingsCount ?? 1) > 1 ? 0.5 : 0.35)
      )
      .force("charge", d3.forceManyBody<GraphNode>().strength((d) => (d.type === "offering" ? -1200 : -220)))
      .force("center", d3.forceCenter(centerX, centerY).strength(0.04))
      .force("x", d3.forceX<GraphNode>((d) => getNodeAnchor(d).x).strength((d) => (d.type === "offering" ? 0.18 : 0.045)))
      .force("y", d3.forceY<GraphNode>((d) => getNodeAnchor(d).y).strength((d) => (d.type === "offering" ? 0.18 : 0.045)))
      .force("collide", d3.forceCollide<GraphNode>().radius((d) => d.radius + 18).strength(0.95));

    simulationRef.current = simulation;

    const root = d3.select(svg);

    const zoomG = root.append("g").attr("class", "zoom-layer");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        zoomG.attr("transform", event.transform);
      });

    root.call(zoom);
    resetZoomRef.current = () => {
      root
        .transition()
        .duration(350)
        .call(zoom.transform, d3.zoomIdentity);
    };

    const linkSel = zoomG
      .append("g")
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(linksCopy)
      .join("line")
      .attr("stroke", (d) => d.color)
      .attr("stroke-opacity", 0.34)
      .attr("stroke-width", (d) => ((d.target as GraphNode).connectedOfferingsCount ?? 1) > 1 ? 2 : 1.3);

    const nodeSel = zoomG
      .append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodesCopy)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    nodeSel
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("fill-opacity", (d) => (d.type === "offering" ? 0.12 : 0.85))
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", (d) => (d.type === "offering" ? 2.5 : 1.5));

    nodeSel
      .filter((d) => d.type === "theme" && (d.connectedOfferingsCount ?? 1) > 1)
      .append("circle")
      .attr("r", (d) => d.radius + 4)
      .attr("fill", "none")
      .attr("stroke", "#0f172a")
      .attr("stroke-opacity", 0.22)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3 3");

    nodeSel
      .filter((d) => d.type === "offering")
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 11)
      .attr("font-weight", "700")
      .attr("fill", (d) => d.color)
      .attr("pointer-events", "none")
      .each(function (d) {
        const maxW = d.radius * 1.8;
        const words = d.label.split(/\s+/);
        const el = d3.select(this);
        el.text("");
        let line = "";
        let lineCount = 0;
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (test.length * 6 > maxW && line) {
            el.append("tspan")
              .attr("x", 0)
              .attr("dy", lineCount === 0 ? `-${(words.length > 2 ? 1 : 0.5) * 10}px` : "12px")
              .text(line);
            line = word;
            lineCount++;
          } else {
            line = test;
          }
        }
        el.append("tspan")
          .attr("x", 0)
          .attr("dy", lineCount === 0 ? "0" : "12px")
          .text(line);
      });

    nodeSel
      .on("mouseenter", function (event, d) {
        const connectedIds = new Set<string>();
        connectedIds.add(d.id);
        linksCopy.forEach((link) => {
          const source = link.source as GraphNode;
          const target = link.target as GraphNode;
          if (source.id === d.id || target.id === d.id) {
            connectedIds.add(source.id);
            connectedIds.add(target.id);
          }
        });
        linkSel
          .attr("stroke-opacity", (link) => {
            const source = link.source as GraphNode;
            const target = link.target as GraphNode;
            return source.id === d.id || target.id === d.id ? 0.78 : 0.12;
          })
          .attr("stroke-width", (link) => {
            const source = link.source as GraphNode;
            const target = link.target as GraphNode;
            const baseWidth = (target.connectedOfferingsCount ?? 1) > 1 ? 2 : 1.3;
            return source.id === d.id || target.id === d.id ? baseWidth + 1 : baseWidth;
          });
        nodeSel.attr("opacity", (node) => (connectedIds.has(node.id) ? 1 : 0.28));
        d3.select(this)
          .select("circle")
          .attr("fill-opacity", d.type === "offering" ? 0.28 : 1)
          .attr("stroke-width", d.type === "offering" ? 3.5 : 2.5);
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, node: d });
      })
      .on("mousemove", function (event) {
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip((prev) => (prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : prev));
      })
      .on("mouseleave", function (_, d) {
        linkSel
          .attr("stroke-opacity", 0.34)
          .attr("stroke-width", (link) => ((link.target as GraphNode).connectedOfferingsCount ?? 1) > 1 ? 2 : 1.3);
        nodeSel.attr("opacity", 1);
        d3.select(this)
          .select("circle")
          .attr("fill-opacity", d.type === "offering" ? 0.12 : 0.85)
          .attr("stroke-width", d.type === "offering" ? 2.5 : 1.5);
        setTooltip(null);
      });

    simulation.on("tick", () => {
      linkSel
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);

      nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
      resetZoomRef.current = null;
    };
  }, [nodes, links, size]);

  const offeringNames = React.useMemo(
    () => [
      ...new Set(
        data.flatMap((d) => {
          const names = [
            ...(Array.isArray(d.offerings) ? d.offerings : []),
            d.origin_offering,
          ]
            .map((name) => String(name ?? "").trim())
            .filter(Boolean);

          return names.length > 0 ? names : ["Other"];
        })
      ),
    ],
    [data]
  );

  const graphStats = React.useMemo(() => {
    const sharedThemes = data.filter((row) => {
      const names = [
        ...(Array.isArray(row.offerings) ? row.offerings : []),
        row.origin_offering,
      ]
        .map((name) => String(name ?? "").trim())
        .filter(Boolean);

      return new Set(names).size > 1;
    }).length;

    return {
      offerings: offeringNames.length,
      themes: data.length,
      sharedThemes,
    };
  }, [data, offeringNames.length]);

  return (
    <div className="relative w-full h-full flex">
      <div ref={containerRef} className="relative flex-1 min-w-0 bg-white rounded-lg overflow-hidden border border-border">
        <svg
          ref={svgRef}
          width={size.width}
          height={size.height}
          className="w-full h-full"
          style={{ cursor: "grab" }}
        />

        {tooltip && (
          <div
            className="absolute z-10 pointer-events-none bg-white border border-border rounded-lg shadow-lg p-3 max-w-[260px]"
            style={{
              left: tooltip.x + 14,
              top: tooltip.y - 10,
              transform:
                tooltip.x > size.width * 0.65 ? "translateX(-110%)" : undefined,
            }}
          >
            <p className="font-semibold text-sm text-foreground leading-tight mb-1">
              {tooltip.node.label}
            </p>
            {tooltip.node.type === "theme" && (
              <>
                <p className="text-xs text-muted-foreground mb-1">
                  <span className="font-medium">Offerings:</span>{" "}
                  {(tooltip.node.offerings ?? [tooltip.node.origin_offering]).filter(Boolean).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  <span className="font-medium">Topics:</span>{" "}
                  {tooltip.node.topic_count}
                </p>
                {tooltip.node.topics && tooltip.node.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tooltip.node.topics.slice(0, 5).map((t, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground"
                      >
                        {t.topic_name}
                      </span>
                    ))}
                    {(tooltip.node.topics?.length ?? 0) > 5 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{(tooltip.node.topics?.length ?? 0) - 5} more
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
            {tooltip.node.type === "offering" && (
              <p className="text-xs text-muted-foreground">
                {tooltip.node.connectedThemeCount ?? 0} connected themes
              </p>
            )}
          </div>
        )}

        <div className="absolute top-3 left-3 rounded-lg border border-border bg-white/90 p-3 shadow-sm">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-base font-semibold text-foreground">{graphStats.offerings}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Offerings</div>
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">{graphStats.themes}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Themes</div>
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">{graphStats.sharedThemes}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Shared</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 max-w-[560px] rounded-lg border border-border bg-white/85 p-2 shadow-sm">
          {offeringNames.map((name) => (
            <span key={name} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: offeringColorMap[name] }}
              />
              {name}
            </span>
          ))}
        </div>

        <div className="absolute top-3 right-3 text-xs text-muted-foreground bg-white/85 rounded-lg px-3 py-2 border border-border shadow-sm max-w-[320px]">
          Offering hubs are spread around the canvas. Shared themes sit between hubs and use dashed rings.
          <div className="mt-1">Scroll to zoom · Drag to pan · Click node for details</div>
          <button
            type="button"
            onClick={() => resetZoomRef.current?.()}
            className="mt-2 rounded border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            Reset view
          </button>
        </div>
      </div>
    </div>
  );
}
