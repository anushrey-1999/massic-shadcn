import type { Row, RowData } from "@tanstack/react-table";
import type { DataTableConfig } from "../components/filter-table/data-table-config";
import type { FilterItemSchema } from "../components/filter-table/parsers";

declare module "@tanstack/react-table" {
  // biome-ignore lint/correctness/noUnusedVariables: TData is used in the TableMeta interface
  interface TableMeta<TData extends RowData> {
    queryKeys?: QueryKeys;
  }

  // biome-ignore lint/correctness/noUnusedVariables: TData and TValue are used in the ColumnMeta interface
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
    placeholder?: string;
    variant?: FilterVariant;
    options?: Option[];
    operators?: Array<{ label: string; value: FilterOperator }>;
    range?: [number, number];
    unit?: string;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    apiField?: string;
    align?: "left" | "center" | "right"; // Column alignment (default: "left")
    closeOnSelect?: boolean; // Close faceted dropdown on select (for multiSelect)
  }
}

export interface QueryKeys {
  page: string;
  perPage: string;
  sort: string;
  filters: string;
  joinOperator: string;
}

export interface Option {
  label: string;
  value: string;
  count?: number;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}

export type FilterOperator = DataTableConfig["operators"][number];
export type FilterVariant = DataTableConfig["filterVariants"][number];
export type JoinOperator = DataTableConfig["joinOperators"][number];

export interface ExtendedColumnSort<TData> {
  field: Extract<keyof TData, string>;
  desc: boolean;
}

export interface ExtendedColumnFilter<TData> extends FilterItemSchema {
  field: Extract<keyof TData, string>;
}

export interface DataTableRowAction<TData> {
  row: Row<TData>;
  variant: "update" | "delete";
}

// Task type definition
export interface Task {
  id: string;
  code: string;
  title: string;
  status: "todo" | "in-progress" | "done" | "canceled";
  label: "bug" | "feature" | "enhancement" | "documentation";
  priority: "low" | "medium" | "high";
  estimatedHours: number;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
