"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import type { LandscapeRow } from "@/types/landscape-types";
import { Typography } from "@/components/ui/typography";
import { normalizeDomainForFavicon } from "@/utils/utils";
import { Link } from "lucide-react";

const FAVICON_URL = "https://www.google.com/s2/favicons?domain=";

function WebsiteCell({ url }: { url?: string }) {
  const [isFaviconLoaded, setIsFaviconLoaded] = React.useState(false);
  const [isFaviconError, setIsFaviconError] = React.useState(false);
  const normalizedDomain = normalizeDomainForFavicon(url);
  const fallbackInitial =
    (normalizedDomain || url || "").trim().charAt(0).toUpperCase() || "W";

  return (
    <div className="flex items-center gap-2 min-w-0">
      {normalizedDomain ? (
        <div
          className={[
            "relative flex h-4 w-4 shrink-0 items-center justify-center rounded-xs overflow-hidden aspect-square",
            isFaviconLoaded && !isFaviconError
              ? "bg-transparent"
              : "bg-accent border border-dashed border-black dark:border-white",
          ].join(" ")}
        >
          {!isFaviconLoaded || isFaviconError ? (
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-foreground">
              {fallbackInitial}
            </div>
          ) : null}

          {!isFaviconError ? (
            <img
              src={`${FAVICON_URL}${normalizedDomain}`}
              alt=""
              width={16}
              height={16}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-contain"
              onLoad={() => setIsFaviconLoaded(true)}
              onError={() => setIsFaviconError(true)}
            />
          ) : null}
        </div>
      ) : null}

      <Typography variant="p" className="truncate" title={url}>
        {url || "-"}
      </Typography>
    </div>
  );
}

export function getLandscapeTableColumns(): ColumnDef<LandscapeRow>[] {
  return [
    {
      id: "url",
      accessorKey: "url",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Website" disableHide={true} />
      ),
      cell: ({ row }) => {
        const url = row.getValue("url") as string;
        return <WebsiteCell url={url} />;
      },
      meta: {
        label: "Website",
        placeholder: "Search websites...",
        variant: "text",
        icon: Link,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 400,
      minSize: 250,
      maxSize: 600,
      filterFn: (row, id, value) => {
        const url = row.getValue(id) as string;
        if (!value) return true;
        return url?.toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      id: "frequency",
      accessorKey: "frequency",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Frequency" disableHide={true} />
      ),
      cell: ({ cell }) => {
        const frequency = cell.getValue<number>();
        return (
          <Typography variant="p">{frequency.toLocaleString()}</Typography>
        );
      },
      enableSorting: true,
      size: 130,
      minSize: 100,
      maxSize: 200,
    },
  ];
}
