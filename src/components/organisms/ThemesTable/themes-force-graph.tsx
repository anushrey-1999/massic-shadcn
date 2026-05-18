"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { ThemeRow } from "@/types/themes-types";

const OFFERING_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#0ea5e9", "#f43f5e", "#a855f7",
  "#84cc16", "#06b6d4", "#d946ef", "#fb923c", "#facc15",
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#64748b",
  "#0d9488", "#7c3aed", "#db2777", "#65a30d", "#0891b2",
];

type ThemeGraphNodeType = "offering" | "theme" | "topic";

interface ThemeGraphNode {
  id: string;
  name: string;
  type: ThemeGraphNodeType;
  group: string;
  offerings?: string[];
  offeringColors?: string[];
  color: string;
  val: number;
  themeData?: ThemeRow;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface ThemeGraphLink {
  source: string | ThemeGraphNode;
  target: string | ThemeGraphNode;
  color: string;
  type: "offering" | "shared-offering" | "topic";
  offeringName?: string;
}

interface ForceGraph2DProps {
  graphData: {
    nodes: ThemeGraphNode[];
    links: ThemeGraphLink[];
  };
  width: number;
  height: number;
  backgroundColor: string;
  nodeId: string;
  nodeVal: (node: ThemeGraphNode) => number;
  nodeColor: (node: ThemeGraphNode) => string;
  nodeLabel: (node: ThemeGraphNode) => string;
  linkColor: (link: ThemeGraphLink) => string;
  linkLabel: (link: ThemeGraphLink) => string;
  linkWidth: (link: ThemeGraphLink) => number;
  linkDirectionalParticles: (link: ThemeGraphLink) => number;
  linkDirectionalParticleWidth: number;
  cooldownTicks: number;
  d3AlphaDecay: number;
  d3VelocityDecay: number;
  enableNodeDrag: boolean;
  onNodeClick: (node: ThemeGraphNode) => void;
  onBackgroundClick: () => void;
  nodeCanvasObject: (
    node: ThemeGraphNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => void;
}

interface ThemesForceGraphProps {
  data: ThemeRow[];
  selectedOffering?: string;
  width?: number;
  height?: number;
}

const ForceGraph2D = dynamic(
  () =>
    import("react-force-graph-2d").then(
      (mod) => mod.default as React.ComponentType<ForceGraph2DProps>
    ),
  { ssr: false }
);

function hashIndex(str: string, len: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % len;
}

function hslToHex(h: number, s: number, l: number) {
  const a = (s * Math.min(l, 1 - l));
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

function getDistinctOfferingColor(index: number) {
  if (index < OFFERING_COLORS.length) return OFFERING_COLORS[index];
  return hslToHex((index * 137.508) % 360, 0.72, 0.52);
}

function getOfferings(theme: ThemeRow) {
  const offerings =
    Array.isArray(theme.offerings) && theme.offerings.length > 0
      ? theme.offerings
      : theme.origin_offering
        ? [theme.origin_offering]
        : ["Other"];

  return [...new Set(offerings.map((offering) => offering.trim()).filter(Boolean))];
}

function truncateLabel(label: string, maxLength: number) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

function getEndpointId(endpoint: string | ThemeGraphNode) {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

function getEndpointOfferings(endpoint: string | ThemeGraphNode) {
  return typeof endpoint === "string" ? [] : endpoint.offerings ?? [];
}

function getNodeOfferingColor(node: ThemeGraphNode, offeringName: string) {
  const index = node.offerings?.indexOf(offeringName) ?? -1;
  if (index < 0) return node.color;
  return node.offeringColors?.[index] ?? node.color;
}

export function ThemesForceGraph({
  data,
  selectedOffering,
  width = 1200,
  height = 800,
}: ThemesForceGraphProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
  const [selectedGraphOffering, setSelectedGraphOffering] = React.useState<string | null>(null);

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
    setSelectedGraphOffering(null);
  }, [selectedOffering]);

  const actualWidth = containerSize.width || width;
  const actualHeight = containerSize.height || height;

  const graphData = React.useMemo(() => {
    const nodes = new Map<string, ThemeGraphNode>();
    const links: ThemeGraphLink[] = [];
    const offeringThemeIds = new Map<string, Set<string>>();
    const offeringNames = new Set<string>();
    const centerX = actualWidth / 2;
    const centerY = actualHeight / 2;
    const layoutRadius = Math.max(Math.min(actualWidth, actualHeight) * 0.28, 180);

    data.forEach((theme) => {
      const allOfferings = getOfferings(theme);
      const offeringsToUse = selectedOffering
        ? allOfferings.includes(selectedOffering)
          ? [selectedOffering]
          : []
        : allOfferings;

      offeringsToUse.forEach((offeringName) => offeringNames.add(offeringName));
    });

    const offeringColorMap = new Map(
      Array.from(offeringNames)
        .sort()
        .map((offeringName, index) => [offeringName, getDistinctOfferingColor(index)])
    );

    data.forEach((theme, themeIndex) => {
      const allOfferings = getOfferings(theme);
      const offeringsToUse = selectedOffering
        ? allOfferings.includes(selectedOffering)
          ? [selectedOffering]
          : []
        : allOfferings;

      if (offeringsToUse.length === 0) return;

      const primaryOffering = offeringsToUse[0];
      const primaryColor = offeringColorMap.get(primaryOffering) ?? "#94a3b8";
      const offeringColors = offeringsToUse.map(
        (offeringName) => offeringColorMap.get(offeringName) ?? "#94a3b8"
      );
      const themeId = `theme:${theme.id}`;
      const themeAngle = ((themeIndex / Math.max(data.length, 1)) * Math.PI * 2) + hashIndex(theme.id, 45) * (Math.PI / 180);
      const themeRadius = layoutRadius * (0.72 + hashIndex(theme.theme_name, 35) / 100);
      const themeX = centerX + Math.cos(themeAngle) * themeRadius;
      const themeY = centerY + Math.sin(themeAngle) * themeRadius;

      nodes.set(themeId, {
        id: themeId,
        name: theme.theme_name,
        type: "theme",
        group: primaryOffering,
        offerings: offeringsToUse,
        offeringColors,
        color: primaryColor,
        val: Math.max(theme.topic_count ?? theme.topics?.length ?? 1, 3),
        themeData: theme,
        x: themeX,
        y: themeY,
      });

      offeringsToUse.forEach((offeringName) => {
        const color = offeringColorMap.get(offeringName) ?? "#94a3b8";
        const offeringId = `offering:${offeringName}`;

        if (!nodes.has(offeringId)) {
          nodes.set(offeringId, {
            id: offeringId,
            name: offeringName,
            type: "offering",
            group: offeringName,
            offerings: [offeringName],
            offeringColors: [color],
            color,
            val: 12,
            x: centerX,
            y: centerY,
          });
        }

        links.push({
          source: offeringId,
          target: themeId,
          color,
          type: "offering",
          offeringName,
        });

        if (!offeringThemeIds.has(offeringName)) {
          offeringThemeIds.set(offeringName, new Set());
        }
        offeringThemeIds.get(offeringName)!.add(themeId);
      });

      const topics = theme.topics?.length
        ? theme.topics
        : [{ topic_name: theme.theme_name }];

      topics.forEach((topic, index) => {
        const topicName = topic.topic_name.trim();
        if (!topicName) return;

        const topicId = `topic:${theme.id}:${index}:${topicName}`;
        nodes.set(topicId, {
          id: topicId,
          name: topicName,
          type: "topic",
          group: primaryOffering,
          offerings: offeringsToUse,
          offeringColors,
          color: primaryColor,
          val: 1.5,
          themeData: theme,
          x: themeX + Math.cos(themeAngle + index) * 45,
          y: themeY + Math.sin(themeAngle + index) * 45,
        });
        links.push({
          source: themeId,
          target: topicId,
          color: primaryColor,
          type: "topic",
        });
      });
    });

    offeringThemeIds.forEach((themeIdsSet, offeringName) => {
      const themeIds = Array.from(themeIdsSet).sort();
      const color = offeringColorMap.get(offeringName) ?? "#94a3b8";

      if (themeIds.length <= 35) {
        for (let i = 0; i < themeIds.length; i++) {
          for (let j = i + 1; j < themeIds.length; j++) {
            links.push({
              source: themeIds[i],
              target: themeIds[j],
              color,
              type: "shared-offering",
              offeringName,
            });
          }
        }
        return;
      }

      themeIds.forEach((themeId, index) => {
        themeIds.slice(index + 1, index + 5).forEach((targetThemeId) => {
          links.push({
            source: themeId,
            target: targetThemeId,
            color,
            type: "shared-offering",
            offeringName,
          });
        });
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      links,
    };
  }, [actualHeight, actualWidth, data, selectedOffering]);

  const isNodeHighlighted = React.useCallback(
    (node: ThemeGraphNode) => {
      if (!selectedGraphOffering) return true;
      if (node.type === "offering") return node.name === selectedGraphOffering;
      return node.offerings?.includes(selectedGraphOffering) ?? false;
    },
    [selectedGraphOffering]
  );

  const isLinkHighlighted = React.useCallback(
    (link: ThemeGraphLink) => {
      if (!selectedGraphOffering) return true;
      if (link.offeringName === selectedGraphOffering) return true;
      return (
        getEndpointOfferings(link.source).includes(selectedGraphOffering) &&
        getEndpointOfferings(link.target).includes(selectedGraphOffering)
      );
    },
    [selectedGraphOffering]
  );

  const isSelectedOfferingLink = React.useCallback(
    (link: ThemeGraphLink) => Boolean(selectedGraphOffering && isLinkHighlighted(link)),
    [isLinkHighlighted, selectedGraphOffering]
  );

  const handleNodeClick = React.useCallback((node: ThemeGraphNode) => {
    if (node.type !== "offering") return;
    setSelectedGraphOffering(node.name);
  }, []);

  const nodeCanvasObject = React.useCallback(
    (node: ThemeGraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (node.x === undefined || node.y === undefined) return;

      const highlighted = isNodeHighlighted(node);
      const selected =
        selectedGraphOffering !== null &&
        node.type === "offering" &&
        node.name === selectedGraphOffering;
      const radius =
        node.type === "offering" ? 13 : node.type === "theme" ? 8.5 : 4.5;
      const fontSize =
        node.type === "offering" ? 14 : node.type === "theme" ? 11 : 8;
      const showLabel = highlighted && (node.type !== "topic" || globalScale > 1.6);
      const selectedOfferingColor = selectedGraphOffering
        ? getNodeOfferingColor(node, selectedGraphOffering)
        : node.color;

      ctx.globalAlpha = highlighted ? 1 : 0.18;

      if (node.type !== "topic") {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI, false);
        ctx.fillStyle = `${node.color}${selected || highlighted ? "22" : "10"}`;
        ctx.fill();
      }

      if (selected || (selectedGraphOffering && highlighted && node.type === "theme")) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + (selected ? 6 : 4), 0, 2 * Math.PI, false);
        ctx.fillStyle = `${selectedOfferingColor}30`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.type === "topic" ? `${node.color}cc` : node.color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = selected ? 4 : node.type === "offering" ? 3 : 2;
      ctx.stroke();

      if (node.type === "theme" && node.offeringColors?.length) {
        node.offeringColors.slice(0, 5).forEach((color, index) => {
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, radius + 3 + index * 2, 0, 2 * Math.PI, false);
          ctx.strokeStyle = selectedGraphOffering && node.offerings?.[index] === selectedGraphOffering
            ? color
            : `${color}${highlighted ? "b3" : "66"}`;
          ctx.lineWidth = selectedGraphOffering && node.offerings?.[index] === selectedGraphOffering ? 2.2 : 1.2;
          ctx.stroke();
        });
      }

      if (!showLabel) {
        ctx.globalAlpha = 1;
        return;
      }

      const label = truncateLabel(node.name, node.type === "topic" ? 22 : 30);
      ctx.font = `${fontSize / globalScale}px -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = selected ? "#0f172a" : "#334155";
      ctx.fillText(label, node.x, node.y + radius + 2 / globalScale);
      ctx.globalAlpha = 1;
    },
    [isNodeHighlighted, selectedGraphOffering]
  );

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-xl border bg-white">
      {graphData.nodes.length > 0 ? (
        <ForceGraph2D
          graphData={graphData}
          width={actualWidth}
          height={actualHeight}
          backgroundColor="#ffffff"
          nodeId="id"
          nodeVal={(node) => node.val}
          nodeColor={(node) => node.color}
          nodeLabel={(node) => {
            if (node.type === "offering") return `Offering: ${node.name}`;
            if (node.type === "theme") {
              return `Theme: ${node.name}\nOfferings: ${node.offerings?.join(", ") ?? "-"}\nTopics: ${node.themeData?.topic_count ?? node.themeData?.topics.length ?? 0}`;
            }
            return `Topic: ${node.name}\nTheme: ${node.themeData?.theme_name ?? "-"}`;
          }}
          linkColor={(link) =>
            `${link.color}${isSelectedOfferingLink(link) ? "88" : isLinkHighlighted(link) ? (link.type === "shared-offering" ? "22" : "28") : "06"}`
          }
          linkLabel={(link) =>
            link.type === "shared-offering"
              ? `Shared offering: ${link.offeringName ?? "-"}`
              : link.type === "offering"
                ? `Offering: ${link.offeringName ?? "-"}`
                : "Topic"
          }
          linkWidth={(link) =>
            isSelectedOfferingLink(link)
              ? link.type === "shared-offering"
                ? 2
                : getEndpointId(link.target).startsWith("theme:")
                  ? 2.4
                  : 0.8
              : isLinkHighlighted(link)
              ? link.type === "shared-offering"
                ? 0.9
                : getEndpointId(link.target).startsWith("theme:")
                  ? 1
                  : 0.45
              : 0.15
          }
          linkDirectionalParticles={(link) => (link.type === "offering" && isSelectedOfferingLink(link) ? 2 : 0)}
          linkDirectionalParticleWidth={1.4}
          cooldownTicks={100}
          d3AlphaDecay={0.035}
          d3VelocityDecay={0.28}
          enableNodeDrag={true}
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => setSelectedGraphOffering(null)}
          nodeCanvasObject={nodeCanvasObject}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No force graph data available.
        </div>
      )}
    </div>
  );
}
