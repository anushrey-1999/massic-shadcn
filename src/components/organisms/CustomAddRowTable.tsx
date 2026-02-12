"use client";

import React, { useState } from "react";
import {
  Table,
  TableElement,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/ui/field";
import { isValidWebsiteUrl } from "@/utils/utils";

export interface ColumnValidation {
  required?: boolean;
  url?: boolean;
  customValidator?: (value: any) => string | undefined;
}

export interface Column<T = any> {
  key: string;
  label: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  validation?: ColumnValidation;
}

export interface CustomAddRowTableProps<T = Record<string, any>> {
  columns: Column<T>[];
  data: T[];
  onAddRow: () => void;
  onRowChange?: (rowIndex: number, field: string, value: any) => void;
  onDeleteRow?: (rowIndex: number) => void;
  addButtonText?: string;
  className?: string;
  emptyRowData?: T;
  onValidationChange?: (hasErrors: boolean) => void;
  showErrorsWithoutTouch?: boolean;
}

// Validation helper
const validateField = (
  value: any,
  validation?: ColumnValidation
): string | undefined => {
  if (!validation) return undefined;

  const stringValue = String(value || "").trim();

  // Required validation
  if (validation.required && !stringValue) {
    return "This field is required";
  }

  // URL validation
  if (validation.url && stringValue && !isValidWebsiteUrl(stringValue)) {
    return "Please enter a valid URL";
  }

  // Custom validator
  if (validation.customValidator) {
    return validation.customValidator(value);
  }

  return undefined;
};

export function CustomAddRowTable<T extends Record<string, any>>({
  columns,
  data,
  onAddRow,
  onRowChange,
  onDeleteRow,
  addButtonText = "Add Product/Service",
  className,
  emptyRowData,
  onValidationChange,
  showErrorsWithoutTouch = false,
}: CustomAddRowTableProps<T>) {
  // Error state: { rowIndex: { fieldKey: errorMessage } }
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  // Track which fields have been touched/interacted with
  const [touched, setTouched] = useState<Record<number, Record<string, boolean>>>({});
  const prevDataLengthRef = React.useRef(data.length);
  const tableId = React.useId();

  // Auto-focus the first field of the newly added row
  React.useEffect(() => {
    if (data.length > prevDataLengthRef.current) {
      const lastRowIndex = data.length - 1;
      const firstColumn = columns[0];
      if (firstColumn) {
        // Use a small timeout to ensure DOM is updated
        setTimeout(() => {
          const inputId = `table-input-${tableId}-${lastRowIndex}-${firstColumn.key}`;
          const element = document.getElementById(inputId);
          if (element) {
            element.focus();
          }
        }, 0);
      }
    }
    prevDataLengthRef.current = data.length;
  }, [data.length, columns, tableId]);

  // Clean up touched state when rows are deleted
  React.useEffect(() => {
    const maxRowIndex = data.length - 1;
    setTouched((prev) => {
      const cleaned: Record<number, Record<string, boolean>> = {};
      Object.keys(prev).forEach((key) => {
        const idx = parseInt(key);
        if (idx <= maxRowIndex) {
          cleaned[idx] = prev[idx];
        }
      });
      return cleaned;
    });
  }, [data.length]);

  // Validate all fields (including untouched) for parent callback
  // This ensures Save button is disabled even if errors aren't displayed
  React.useEffect(() => {
    const allErrors: Record<number, Record<string, string>> = {};
    data.forEach((row, rowIndex) => {
      const rowErrors: Record<string, string> = {};
      columns.forEach((column) => {
        const error = validateField(row[column.key], column.validation);
        if (error) {
          rowErrors[column.key] = error;
        }
      });
      if (Object.keys(rowErrors).length > 0) {
        allErrors[rowIndex] = rowErrors;
      }
    });

    const hasErrors = Object.keys(allErrors).length > 0;
    onValidationChange?.(hasErrors);

    if (showErrorsWithoutTouch) {
      setErrors(allErrors);
      setTouched((prev) => {
        const nextTouched: Record<number, Record<string, boolean>> = { ...prev };
        Object.keys(allErrors).forEach((rowKey) => {
          const rowIndex = Number(rowKey);
          const rowErrors = allErrors[rowIndex] || {};
          if (!nextTouched[rowIndex]) nextTouched[rowIndex] = {};
          Object.keys(rowErrors).forEach((fieldKey) => {
            nextTouched[rowIndex][fieldKey] = true;
          });
        });
        return nextTouched;
      });
    }
  }, [data, columns, onValidationChange, showErrorsWithoutTouch]);

  // Validate all fields in a row
  const validateRow = (rowIndex: number, row: T) => {
    const rowErrors: Record<string, string> = {};
    columns.forEach((column) => {
      const error = validateField(row[column.key], column.validation);
      if (error) {
        rowErrors[column.key] = error;
      }
    });

    setErrors((prev) => {
      const newErrors = { ...prev };
      if (Object.keys(rowErrors).length > 0) {
        newErrors[rowIndex] = rowErrors;
      } else {
        delete newErrors[rowIndex];
      }
      return newErrors;
    });

    return Object.keys(rowErrors).length === 0;
  };

  const handleRowChange = (
    rowIndex: number,
    field: string,
    value: any
  ) => {
    // Update the value
    if (onRowChange) {
      onRowChange(rowIndex, field, value);
    }

    // Mark field as touched when user starts typing and validate
    setTouched((prev) => {
      const newTouched = { ...prev };
      if (!newTouched[rowIndex]) {
        newTouched[rowIndex] = {};
      }
      newTouched[rowIndex][field] = true;
      
      const nextRow = {
        ...(data[rowIndex] || ({} as T)),
        [field]: value,
      } as T;

      // Validate immediately after marking as touched
      const column = columns.find((col) => col.key === field);
      const error = validateField(value, column?.validation);

      setErrors((prev) => {
        const newErrors = { ...prev };
        if (!newErrors[rowIndex]) {
          newErrors[rowIndex] = {};
        }
        if (error) {
          newErrors[rowIndex][field] = error;
        } else {
          delete newErrors[rowIndex][field];
          if (Object.keys(newErrors[rowIndex]).length === 0) {
            delete newErrors[rowIndex];
          }
        }
        return newErrors;
      });
      
      return newTouched;
    });
  };

  const handleBlur = (rowIndex: number, field: string, value: any) => {
    // Mark field as touched when user leaves the field
    setTouched((prev) => {
      const newTouched = { ...prev };
      if (!newTouched[rowIndex]) {
        newTouched[rowIndex] = {};
      }
      newTouched[rowIndex][field] = true;
      return newTouched;
    });

    // Validate on blur
    const column = columns.find((col) => col.key === field);
    const nextRow = {
      ...(data[rowIndex] || ({} as T)),
      [field]: value,
    } as T;
    const error = validateField(value, column?.validation);

    setErrors((prev) => {
      const newErrors = { ...prev };
      if (!newErrors[rowIndex]) {
        newErrors[rowIndex] = {};
      }
      if (error) {
        newErrors[rowIndex][field] = error;
      } else {
        delete newErrors[rowIndex][field];
        if (Object.keys(newErrors[rowIndex]).length === 0) {
          delete newErrors[rowIndex];
        }
      }
      return newErrors;
    });
  };

  return (
    <div className={cn("w-full", className)}>
      <Table>
        <TableElement>
          <TableHeader className="bg-general-primary-foreground">
            <TableRow className="border-b border-general-border">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className="text-general-muted-foreground font-medium text-sm h-12 px-2 bg-general-primary-foreground"
                >
                  {column.label}
                  {column.validation?.required && (
                    <span className="text-destructive ml-0.5">*</span>
                  )}
                </TableHead>
              ))}
              {onDeleteRow && (
                <TableHead className="text-general-muted-foreground font-medium text-sm w-[50px] h-12 px-2 bg-general-primary-foreground">
                  {/* Empty header for delete column */}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((row, rowIndex) => {
                const rowErrors = errors[rowIndex] || {};
                return (
                  <React.Fragment key={rowIndex}>
                    <TableRow className="group border-b border-general-border">
                      {columns.map((column) => {
                        const fieldError = rowErrors[column.key];
                        const isTouched = touched[rowIndex]?.[column.key] || false;
                        const isInvalid = isTouched && !!fieldError;
                        return (
                          <TableCell key={column.key} className="p-2">
                            <div className="flex flex-col gap-1">
                              {column.render ? (
                                column.render(row[column.key], row, rowIndex)
                              ) : onRowChange ? (
                                    <Input
                                      id={`table-input-${tableId}-${rowIndex}-${column.key}`}
                                      type={column.validation?.url ? "url" : "text"}
                                      variant="noBorder"
                                      value={row[column.key] || ""}
                                      onChange={(e) =>
                                        handleRowChange(
                                          rowIndex,
                                          column.key,
                                          e.target.value
                                        )
                                      }
                                      onBlur={(e) =>
                                        handleBlur(
                                          rowIndex,
                                          column.key,
                                          e.target.value
                                        )
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          onAddRow();
                                        }
                                      }}
                                      placeholder="Enter value"
                                      className={cn(
                                        "w-full border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-0 rounded-none",
                                        isInvalid && "aria-invalid"
                                      )}
                                      aria-invalid={isInvalid}
                                    />
                              ) : (
                                row[column.key] || "Enter value"
                              )}
                              {isInvalid && (
                                <FieldError className="text-xs mt-0">
                                  {fieldError}
                                </FieldError>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                      {onDeleteRow && (
                        <TableCell className="p-2 w-[50px]">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "opacity-0 group-hover:opacity-100 transition-opacity",
                              "h-8 w-8 text-[#dc2626] hover:text-[#dc2626] hover:bg-[#dc2626]/10 cursor-pointer border border-[#dc2626]/30 hover:border-[#dc2626]"
                            )}
                            onClick={() => {
                              onDeleteRow(rowIndex);
                              // Clean up errors for deleted row
                              setErrors((prev) => {
                                const newErrors = { ...prev };
                                delete newErrors[rowIndex];
                                // Reindex errors for rows after deleted one
                                const reindexed: Record<number, Record<string, string>> = {};
                                Object.keys(newErrors).forEach((key) => {
                                  const idx = parseInt(key);
                                  if (idx > rowIndex) {
                                    reindexed[idx - 1] = newErrors[idx];
                                  } else {
                                    reindexed[idx] = newErrors[idx];
                                  }
                                });
                                return reindexed;
                              });
                            }}
                            title="Delete row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (onDeleteRow ? 1 : 0)}
                  className="text-general-muted-foreground p-2"
                >
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </TableElement>
      </Table>
      <div className="mt-4 flex justify-start">
        <Button
          type="button"
          variant="outline"
          onClick={onAddRow}
          className="rounded-md border border-general-border bg-white hover:bg-secondary text-general-foreground"
        >
          <Plus className="h-4 w-4" />
          {addButtonText}
        </Button>
      </div>
    </div>
  );
}
