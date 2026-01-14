import { createParser } from "nuqs/server";
import { z } from "zod";

import { dataTableConfig } from "./data-table-config";

import type {
  ExtendedColumnFilter,
  ExtendedColumnSort,
} from "../../types/data-table-types";

const sortingItemSchema = z.object({
  field: z.string(),
  desc: z.boolean(),
});

export const getSortingStateParser = <TData>(
  columnIds?: string[] | Set<string>,
  fieldMapper?: {
    toQueryField?: (field: string) => string;
    fromQueryField?: (field: string) => string;
  },
) => {
  const validKeys = columnIds
    ? columnIds instanceof Set
      ? columnIds
      : new Set(columnIds)
    : null;

  const toQueryField = fieldMapper?.toQueryField ?? ((field: string) => field);
  const fromQueryField = fieldMapper?.fromQueryField ?? ((field: string) => field);

  return createParser({
    parse: (value: string) => {
      try {
        const parsed = JSON.parse(value);
        const result = z.array(sortingItemSchema).safeParse(parsed);

        if (!result.success) return null;

        if (
          validKeys &&
          result.data.some((item) => !validKeys.has(item.field))
        ) {
          return null;
        }

        return result.data.map((item) => ({
          ...item,
          field: fromQueryField(item.field),
        })) as ExtendedColumnSort<TData>[];
      } catch {
        return null;
      }
    },
    serialize: (value: ExtendedColumnSort<TData>[]) =>
      JSON.stringify(
        value.map((item) => ({
          ...item,
          field: toQueryField(item.field),
        })),
      ),
    eq: (a: ExtendedColumnSort<TData>[], b: ExtendedColumnSort<TData>[]) =>
      a.length === b.length &&
      a.every(
        (item, index) =>
          item.field === b[index]?.field && item.desc === b[index]?.desc,
      ),
  });
};

const filterItemSchema = z.object({
  field: z.string(),
  value: z.union([z.string(), z.array(z.string())]),
  operator: z.enum(dataTableConfig.operators),
});

export type FilterItemSchema = z.infer<typeof filterItemSchema>;

export const getFiltersStateParser = <TData>(
  columnIds?: string[] | Set<string>,
  fieldMapper?: {
    toQueryField?: (field: string) => string;
    fromQueryField?: (field: string) => string;
  },
) => {
  const validKeys = columnIds
    ? columnIds instanceof Set
      ? columnIds
      : new Set(columnIds)
    : null;

  const toQueryField = fieldMapper?.toQueryField ?? ((field: string) => field);
  const fromQueryField = fieldMapper?.fromQueryField ?? ((field: string) => field);

  return createParser({
    parse: (value: string) => {
      try {
        const parsed = JSON.parse(value);
        const result = z.array(filterItemSchema).safeParse(parsed);

        if (!result.success) return null;

        if (validKeys && result.data.some((item) => !validKeys.has(item.field))) {
          return null;
        }

        return result.data.map((item) => ({
          ...item,
          field: fromQueryField(item.field),
        })) as ExtendedColumnFilter<TData>[];
      } catch {
        return null;
      }
    },
    serialize: (value: ExtendedColumnFilter<TData>[]) =>
      JSON.stringify(
        value.map((item) => ({
          ...item,
          field: toQueryField(item.field),
        })),
      ),
    eq: (a: ExtendedColumnFilter<TData>[], b: ExtendedColumnFilter<TData>[]) =>
      a.length === b.length &&
      a.every(
        (filter, index) =>
          filter.field === b[index]?.field &&
          filter.value === b[index]?.value &&
          filter.operator === b[index]?.operator,
      ),
  });
};
