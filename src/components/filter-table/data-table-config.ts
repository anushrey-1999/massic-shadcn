export type DataTableConfig = typeof dataTableConfig;

export const dataTableConfig = {
  textOperators: [
    { label: "Is", value: "eq" as const },
  ],
  numericOperators: [
    { label: "Is", value: "eq" as const },
    { label: "Is less than or equal to", value: "lte" as const },
    { label: "Is greater than or equal to", value: "gte" as const },
  ],
  dateOperators: [
    { label: "Is", value: "eq" as const },
  ],
  selectOperators: [
    { label: "Is", value: "eq" as const },
  ],
  multiSelectOperators: [
    { label: "Is", value: "eq" as const },
    { label: "Has any of", value: "inArray" as const },
  ],
  booleanOperators: [
    { label: "Is", value: "eq" as const },
  ],
  sortOrders: [
    { label: "Asc", value: "asc" as const },
    { label: "Desc", value: "desc" as const },
  ],
  filterVariants: [
    "text",
    "number",
    "range",
    "date",
    "dateRange",
    "boolean",
    "select",
    "multiSelect",
  ] as const,
  operators: [
    "iLike",
    "notILike",
    "eq",
    "ne",
    "inArray",
    "notInArray",
    "isEmpty",
    "isNotEmpty",
    "lt",
    "lte",
    "gt",
    "gte",
    "isBetween",
    "isRelativeToToday",
  ] as const,
  joinOperators: ["and", "or"] as const,
};
