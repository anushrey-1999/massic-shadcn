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

const SHARED_THEME_PALETTE = [
  "#334155", "#475569", "#64748b", "#78716c", "#57534e",
  "#44403c", "#525252", "#3f3f46", "#404040", "#1f2937",
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
      const color = offerings.length > 1
        ? SHARED_THEME_PALETTE[hashIndex(d.id || d.theme_name, SHARED_THEME_PALETTE.length)]
        : colorMap[primaryOffering] ?? "#94a3b8";
      return {
        id: d.id,
        label: d.theme_name,
        type: "theme",
        radius: 8 + Math.sqrt(Math.max(d.topic_count ?? 1, 1)) * 2.8,
        color,
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
      const angle = (hashIndex(`${node.id}:angle`, 360) / 360) * Math.PI * 2;
      const distance = node.type === "offering"
        ? 28
        : 72 + hashIndex(`${node.id}:distance`, 68);
      node.x = anchor.x + Math.cos(angle) * distance;
      node.y = anchor.y + Math.sin(angle) * distance;
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
            return (target.connectedOfferingsCount ?? 1) > 1 ? 270 : 205;
          })
          .strength((l) => ((l.target as GraphNode).connectedOfferingsCount ?? 1) > 1 ? 0.42 : 0.28)
      )
      .force("charge", d3.forceManyBody<GraphNode>().strength((d) => (d.type === "offering" ? -1200 : -360)))
      .force("center", d3.forceCenter(centerX, centerY).strength(0.04))
      .force("x", d3.forceX<GraphNode>((d) => getNodeAnchor(d).x).strength((d) => (d.type === "offering" ? 0.18 : 0.025)))
      .force("y", d3.forceY<GraphNode>((d) => getNodeAnchor(d).y).strength((d) => (d.type === "offering" ? 0.18 : 0.025)))
      .force("collide", d3.forceCollide<GraphNode>().radius((d) => d.radius + 24).strength(0.98));

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

    let activeNodeId: string | null = null;

    const getConnectedIds = (node: GraphNode) => {
      const connectedIds = new Set<string>([node.id]);
      linksCopy.forEach((link) => {
        const source = link.source as GraphNode;
        const target = link.target as GraphNode;
        if (source.id === node.id || target.id === node.id) {
          connectedIds.add(source.id);
          connectedIds.add(target.id);
        }
      });
      return connectedIds;
    };

    const getBaseLinkWidth = (link: GraphLink) =>
      ((link.target as GraphNode).connectedOfferingsCount ?? 1) > 1 ? 2 : 1.3;

    const resetHighlight = () => {
      activeNodeId = null;
      linkSel
        .attr("stroke-opacity", 0.34)
        .attr("stroke-width", getBaseLinkWidth);
      nodeSel.attr("opacity", 1);
      nodeSel
        .select<SVGCircleElement>("circle")
        .attr("fill-opacity", (node) => (node.type === "offering" ? 0.12 : 0.85))
        .attr("stroke-width", (node) => (node.type === "offering" ? 2.5 : 1.5));
    };

    const applyHighlight = (node: GraphNode) => {
      const connectedIds = getConnectedIds(node);
      linkSel
        .attr("stroke-opacity", (link) => {
          const source = link.source as GraphNode;
          const target = link.target as GraphNode;
          return source.id === node.id || target.id === node.id ? 0.78 : 0.12;
        })
        .attr("stroke-width", (link) => {
          const source = link.source as GraphNode;
          const target = link.target as GraphNode;
          const baseWidth = getBaseLinkWidth(link);
          return source.id === node.id || target.id === node.id ? baseWidth + 1 : baseWidth;
        });
      nodeSel.attr("opacity", (connectedNode) => (connectedIds.has(connectedNode.id) ? 1 : 0.28));
      nodeSel
        .select<SVGCircleElement>("circle")
        .attr("fill-opacity", (connectedNode) => {
          if (connectedNode.id !== node.id) return connectedNode.type === "offering" ? 0.12 : 0.85;
          return connectedNode.type === "offering" ? 0.28 : 1;
        })
        .attr("stroke-width", (connectedNode) => {
          if (connectedNode.id !== node.id) return connectedNode.type === "offering" ? 2.5 : 1.5;
          return connectedNode.type === "offering" ? 3.5 : 2.5;
        });
    };

    root.on("click", () => {
      resetHighlight();
      setTooltip(null);
    });

    nodeSel
      .on("mouseenter", function (event, d) {
        if (!activeNodeId) applyHighlight(d);
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, node: d });
      })
      .on("mousemove", function (event) {
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip((prev) => (prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : prev));
      })
      .on("click", function (event, d) {
        event.stopPropagation();
        activeNodeId = d.id;
        applyHighlight(d);
      })
      .on("mouseleave", function (_, d) {
        if (!activeNodeId) resetHighlight();
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
      </div>
    </div>
  );
}
