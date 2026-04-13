"use client";

import * as React from "react";
import {
  Clapperboard,
  Scan,
  Search,
  Eye,
  Footprints,
  ListChecks,
  Crosshair,
  Star,
  Trophy,
  FileText,
  type LucideIcon,
} from "lucide-react";

import type {
  PerformanceReportMetric,
  PerformanceReportSection,
  PerformanceReportTable,
  PerformanceReportV2Block,
  PerformanceReportV2Document,
} from "@/utils/performance-report-v2";

function toHeadingLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferIcon(section: PerformanceReportSection | null, key?: string): LucideIcon {
  const value = `${section?.title || ""} ${section?.id || ""} ${key || ""}`.toLowerCase();

  if (value.includes("big picture")) return Clapperboard;
  if (value.includes("glance") || value.includes("headline")) return Scan;
  if (value.includes("find")) return Search;
  if (value.includes("seeing")) return Eye;
  if (value.includes("come from")) return Footprints;
  if (value.includes("do when") || value.includes("actions")) return ListChecks;
  if (value.includes("visibility") || value.includes("ranking")) return Crosshair;
  if (value.includes("opportunit") || value.includes("quick wins")) return Star;
  if (value.includes("biggest win") || value.includes("highlight")) return Trophy;

  return FileText;
}

function sectionNarrative(section: PerformanceReportSection): string | null {
  return section.narrative || section.summary || section.text || null;
}

function getMetricDirection(metric: PerformanceReportMetric): "up" | "down" | "flat" {
  if (metric.direction) return metric.direction;

  const change = (metric.change || "").trim();
  if (change.startsWith("+")) return "up";
  if (change.startsWith("-")) return "down";
  return "flat";
}

function heading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-6 w-6 text-[#0A0A0A]" />
      <h2
        className="text-[#0A0A0A] font-semibold text-[20px] leading-[1.2] tracking-[-0.4px]"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        {title}
      </h2>
    </div>
  );
}

function NarrativeCard({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!paragraphs.length) return null;

  return (
    <div className="rounded-[8px] border border-[#E5E5E5] bg-white p-3">
      <div className="space-y-3">
        {paragraphs.map((paragraph, index) => (
          <p
            key={`${paragraph.slice(0, 24)}-${index}`}
            className="text-[12px] leading-[1.5] tracking-[0.18px] text-[rgba(0,0,0,0.87)]"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

function MetricsTable({ metrics }: { metrics: PerformanceReportMetric[] }) {
  if (!metrics.length) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-[8px] border border-[#E5E5E5]">
      <table className="w-full table-fixed border-collapse">
        <tbody>
          {metrics.map((metric, index) => {
            const direction = getMetricDirection(metric);
            const directionClass =
              direction === "up"
                ? "text-[#16A34A]"
                : direction === "down"
                  ? "text-[#DC2626]"
                  : "text-[#737373]";

            return (
              <tr key={`${metric.label}-${index}`} className="border-b border-[#E5E5E5] last:border-b-0">
                <td className="w-[55%] px-2 py-2 text-[12px] leading-[1.5] tracking-[0.18px] text-[#0A0A0A]">
                  {metric.label}
                </td>
                <td className="w-[20%] px-2 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[16px] font-medium leading-[1.5] text-[#0A0A0A]">{metric.value}</span>
                    {metric.change ? (
                      <span className={`text-[10px] font-medium leading-[1.5] tracking-[0.15px] ${directionClass}`}>
                        {metric.change}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td
                  className="w-[25%] px-2 py-2 text-[12px] leading-[1.5] text-[#737373]"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  {metric.sublabel || "vs previous period"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GenericTable({ table }: { table: PerformanceReportTable }) {
  const hasHeaders = table.headers.length > 0;
  const hasRows = table.rows.length > 0;

  if (!hasHeaders && !hasRows) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-[8px] border border-[#E5E5E5]">
      <table className="w-full border-collapse table-auto">
        {hasHeaders ? (
          <thead>
            <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
              {table.headers.map((header, index) => (
                <th
                  key={`${header}-${index}`}
                  className="px-2 py-2 text-left text-[12px] leading-[1.5] font-medium text-[#0A0A0A]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="border-b border-[#E5E5E5] last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="px-2 py-2 text-[12px] leading-[1.5] tracking-[0.18px] text-[#0A0A0A] align-top"
                >
                  {cell || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnknownBlock({ keyName, value }: { keyName: string; value: unknown }) {
  return (
    <section className="space-y-2">
      {heading({ icon: FileText, title: toHeadingLabel(keyName) })}
      <div className="rounded-[8px] border border-[#E5E5E5] bg-white p-3">
        <pre
          className="whitespace-pre-wrap break-words text-[12px] leading-[1.5] text-[#0A0A0A]"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
        </pre>
      </div>
    </section>
  );
}

function SectionBlock({ section, keyName }: { section: PerformanceReportSection; keyName?: string }) {
  return (
    <section className="space-y-0">
      {heading({ icon: inferIcon(section, keyName), title: section.title })}

      {sectionNarrative(section) ? <NarrativeCard text={sectionNarrative(section) || ""} /> : null}

      {section.insight ? (
        <p className="mt-2 text-[12px] leading-[1.5] tracking-[0.18px] text-[#404040]">
          <span className="font-medium">Insight:</span> {section.insight}
        </p>
      ) : null}

      {section.metrics?.length ? <MetricsTable metrics={section.metrics} /> : null}

      {section.table ? <GenericTable table={section.table} /> : null}
    </section>
  );
}

function renderBlock(block: PerformanceReportV2Block): React.ReactNode {
  if (block.kind === "meta") return null;

  if (block.kind === "headline") {
    const title = block.section.title || "At a Glance";
    const withTitle = { ...block.section, title };
    return <SectionBlock key={`headline-${block.key}`} section={withTitle} keyName={block.key} />;
  }

  if (block.kind === "section") {
    return <SectionBlock key={`section-${block.key}`} section={block.section} keyName={block.key} />;
  }

  if (block.kind === "section_list") {
    return block.sections.map((section, index) => (
      <SectionBlock key={`section-list-${block.key}-${index}`} section={section} keyName={block.key} />
    ));
  }

  return <UnknownBlock key={`unknown-${block.key}`} keyName={block.key} value={block.value} />;
}

interface PerformanceReportV2ViewProps {
  document: PerformanceReportV2Document;
}

export function PerformanceReportV2View({ document }: PerformanceReportV2ViewProps) {
  return <div className="space-y-6">{document.blocks.map((block) => renderBlock(block))}</div>;
}
