"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  TrendingUp,
  Users,
  Hash,
  FileText,
  Target,
} from "lucide-react";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { RelevancePill } from "@/components/ui/relevance-pill";
import type { AudienceRow } from "@/types/audience-types";
import { Typography } from "@/components/ui/typography";

interface GetAudienceTableColumnsProps {
  personaCounts?: Record<string, number>;
  arsRange?: { min: number; max: number };
  useCaseCounts?: Record<string, number>;
  offeringCounts?: Record<string, number>;
}

export function getAudienceTableColumns({
  personaCounts = {},
  arsRange = { min: 0, max: 1 },
  useCaseCounts = {},
  offeringCounts = {},
}: GetAudienceTableColumnsProps): ColumnDef<AudienceRow>[] {
  return [
    {
      id: "persona_name",
      accessorKey: "persona_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Personas" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("persona_name")}
        </Typography>
      ),
      meta: {
        label: "Personas",
        placeholder: "Search personas...",
        variant: "text",
        icon: Users,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 250,
      minSize: 180,
      maxSize: 350,
    },
    {
      id: "offerings",
      accessorKey: "offerings",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Offerings" />
      ),
      cell: ({ row }) => {
        const offerings = row.getValue("offerings") as string[] | undefined;
        return (
          <Typography variant="p">
            {offerings && offerings.length > 0 ? offerings.join(", ") : "-"}
          </Typography>
        );
      },
      meta: {
        label: "Offerings",
        variant: "multiSelect",
        options: Object.keys(offeringCounts).map((offering) => ({
          label: offering,
          value: offering,
        })),
        icon: Target,
        operators: [{ label: "Has any of", value: "inArray" }],
        closeOnSelect: true,
      },
      enableColumnFilter: true,
      enableSorting: false,
      size: 180,
      minSize: 150,
      maxSize: 250,
    },
    {
      id: "ars",
      accessorKey: "ars",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Relevance" />
      ),
      cell: ({ cell }) => {
        const score = cell.getValue<number>();
        return (
          <div className="flex items-center">
            <RelevancePill score={score || 0} />
          </div>
        );
      },
      meta: {
        label: "Relevance",
        variant: "range",
        range: [arsRange.min, arsRange.max],
        icon: TrendingUp,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 110,
      maxSize: 160,
    },
    {
      id: "use_cases",
      accessorFn: (row) => row.use_cases?.length || 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Use Case" />
      ),
      cell: ({ row }) => {
        const useCases = row.original.use_cases || [];
        const count = useCases.length;
        return (
          <Typography variant="p">{count}</Typography>
        );
      },
      meta: {
        label: "Use Case",
        variant: "number",
        icon: FileText,
      },
      enableColumnFilter: false,
      enableSorting: true,
      size: 100,
      minSize: 80,
      maxSize: 150,
    },
    {
      id: "keywords",
      accessorFn: (row) => {
        const useCases = row.use_cases || [];
        return useCases.reduce((total: number, uc: any) => {
          const keywords = Array.isArray(uc?.supporting_keywords)
            ? uc.supporting_keywords.filter((k: any) => k && typeof k === 'string')
            : [];
          return total + keywords.length;
        }, 0);
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Keywords" />
      ),
      cell: ({ row }) => {
        const useCases = row.original.use_cases || [];
        const totalKeywords = useCases.reduce((total: number, uc: any) => {
          const keywords = Array.isArray(uc?.supporting_keywords)
            ? uc.supporting_keywords.filter((k: any) => k && typeof k === 'string')
            : [];
          return total + keywords.length;
        }, 0);
        return (
          <Typography variant="p">{totalKeywords}</Typography>
        );
      },
      meta: {
        label: "Keywords",
        variant: "number",
        icon: Hash,
      },
      enableColumnFilter: false,
      enableSorting: true,
      size: 100,
      minSize: 80,
      maxSize: 150,
    },
  ];
}
