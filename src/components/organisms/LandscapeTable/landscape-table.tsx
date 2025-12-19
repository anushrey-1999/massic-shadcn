"use client";

import * as React from "react";
import { DataTable } from "@/components/ui/table";
import type { LandscapeRow } from "@/types/landscape-types";
import { getLandscapeTableColumns } from "./landscape-table-columns";

interface LandscapeTableProps {
  data: LandscapeRow[];
  isLoading?: boolean;
}

export function LandscapeTable({
  data,
  isLoading = false,
}: LandscapeTableProps) {
  const columns = React.useMemo(
    () => getLandscapeTableColumns(),
    []
  );

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          isInitialLoading={isLoading && data.length === 0}
          className="h-full"
        />
      </div>
    </div>
  );
}
