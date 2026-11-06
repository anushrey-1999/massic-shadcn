"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Tag } from "lucide-react";
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";
import { ExpandablePills } from "@/components/ui/expandable-pills";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { Typography } from "@/components/ui/typography";
import { formatVolume } from "@/lib/format";
import type { WebsiteArchitecturePage } from "@/types/website-architecture-types";
import {
  parseWebPageType,
  WEB_PAGE_TYPE_LABELS,
  WEB_PAGE_TYPE_OPTIONS,
  WEB_PAGE_TYPES,
} from "@/lib/web-page-types";

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

function TextCell({ value }: { value: unknown }) {
  const text = value == null || value === "" ? "—" : String(value);
  return <Typography variant="p" className="break-words whitespace-normal" title={text}>{text}</Typography>;
}

function SectionsCell({ sections }: { sections: unknown[] | null }) {
  if (!sections?.length) return <TextCell value={null} />;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer rounded focus-visible:outline-ring">{sections.length} sections</summary>
      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">
        {JSON.stringify(sections, null, 2)}
      </pre>
    </details>
  );
}

export function getWebsiteArchitectureColumns(): ColumnDef<WebsiteArchitecturePage>[] {
  const text = (
    id: keyof WebsiteArchitecturePage,
    heading: string,
    size = 160,
  ): ColumnDef<WebsiteArchitecturePage> => ({
    id,
    accessorKey: id,
    header: ({ column }) => <DataTableColumnHeader column={column} label={heading} />,
    cell: ({ getValue }) => <TextCell value={getValue()} />,
    meta: { label: heading },
    enableSorting: false,
    enableColumnFilter: false,
    size,
    minSize: size,
  });

  const facet = (
    id: "page_type" | "disposition" | "sources",
    heading: string,
    values: readonly string[],
  ): ColumnDef<WebsiteArchitecturePage> => ({
    ...text(id, heading, id === "page_type" ? 140 : 110),
    meta: {
      label: heading,
      variant: "multiSelect",
      apiField: id === "sources" ? "source" : id,
      options: id === "page_type"
        ? [...WEB_PAGE_TYPE_OPTIONS]
        : values.map((value) => ({ label: label(value), value })),
      operators: [{ label: "Has any of", value: "inArray" }],
      icon: Tag,
    },
    enableColumnFilter: true,
  });

  const list = (id: "supporting_keywords" | "sources", heading: string): ColumnDef<WebsiteArchitecturePage> => ({
    ...text(id, heading, 120),
    cell: ({ row }) => <ExpandablePills items={row.original[id] ?? []} pillVariant="outline" />,
  });

  return [
    { ...text("title", "Page", 230), enableSorting: true, enableHiding: false },
    {
      ...facet("page_type", "Type", WEB_PAGE_TYPES),
      cell: ({ row }) => {
        const pageType = parseWebPageType(row.original.page_type);
        return (
          <TextCell
            value={pageType ? WEB_PAGE_TYPE_LABELS[pageType] : label(row.original.page_type)}
          />
        );
      },
    },
    text("category", "Category", 110),
    facet("disposition", "Disposition", ["page", "child_page", "editorial"]),
    text("final_url", "Path", 190),
    {
      ...text("business_relevance_score", "Relevance", 100),
      cell: ({ row }) => row.original.business_relevance_score == null
        ? <TextCell value={null} />
        : <RelevancePill score={row.original.business_relevance_score} />,
    },
    {
      ...text("search_volume", "Volume", 85),
      cell: ({ row }) => <TextCell value={row.original.search_volume == null ? null : formatVolume(row.original.search_volume)} />,
    },
    list("supporting_keywords", "Sub Topics"),
    text("name", "Name", 240),
    text("keyword", "Keyword", 240),
    text("page_subtype", "Subtype"),
    text("current_url", "Current URL", 280),
    text("parent_page_id", "Parent Page ID"),
    text("page_id", "Page ID"),
    text("business_applicability", "Applicability"),
    text("confidence", "Confidence"),
    {
      ...facet("sources", "Sources", ["business", "competitor", "current", "search"]),
      cell: ({ row }) => <ExpandablePills items={row.original.sources ?? []} pillVariant="outline" />,
    },
    text("alternate_framing", "Alternate Framing", 240),
    {
      ...text("sections", "Sections", 300),
      cell: ({ row }) => <SectionsCell sections={row.original.sections} />,
    },
    ...(["offerings", "customer_type", "location", "service_area"] as const).map((field): ColumnDef<WebsiteArchitecturePage> => ({
      id: `modifier_${field}`,
      accessorFn: (row) => row.modifiers?.[field],
      header: ({ column }) => <DataTableColumnHeader column={column} label={label(field)} />,
      cell: ({ row }) => field === "offerings"
        ? <ExpandablePills items={row.original.modifiers?.offerings ?? []} pillVariant="outline" />
        : <TextCell value={row.original.modifiers?.[field]} />,
      meta: { label: label(field) },
      enableSorting: false,
      enableColumnFilter: false,
      size: 200,
      minSize: 200,
    })),
  ];
}
