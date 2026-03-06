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
  customValidator?: (value: any, row?: any) => string | undefined;
}

export interface Column<T = any> {
  key: string;
  label: string;
  render?: (
    value: any,
    row: T,
    index: number,
    helpers: {
      disabled: boolean;
      error?: string;
      touched?: boolean;
      setValue: (value: any) => void;
      setRowValue: (field: string, value: any, rowData?: T) => void;
      onBlur: (value: any, rowData?: T) => void;
    }
  ) => React.ReactNode;
  validation?: ColumnValidation;
  width?: string;
}

export interface CustomAddRowTableProps<T = Record<string, any>> {
  columns: Column<T>[];
  data: T[];
  onAddRow: () => void;
  onRowChange?: (rowIndex: number, field: string, value: any, currentRowData?: T) => void;
  onDeleteRow?: (rowIndex: number) => void;
  addButtonText?: string;
  className?: string;
  emptyRowData?: T;
  onValidationChange?: (hasErrors: boolean) => void;
  showErrorsWithoutTouch?: boolean;
  variant?: "table" | "card";
  disabled?: boolean;
}

// Validation helper
const validateField = (
  value: any,
  validation?: ColumnValidation,
  row?: any
): string | undefined => {
  if (!validation) return undefined;

  const stringValue = String(value || "").trim();

  // Required validation
  if (validation.required && !stringValue) {
    return "This field is required";
  }

  // URL validation
  if (validation.url && stringValue) {
    const isTel = /^tel:\s*\+?[0-9().\-\s]+$/i.test(stringValue);
    const isMailto = /^mailto:/i.test(stringValue);
    const isValid = isTel || isMailto || isValidWebsiteUrl(stringValue);
    if (!isValid) {
      return "Please enter a valid URL";
    }
  }

  // Custom validator
  if (validation.customValidator) {
    return validation.customValidator(value, row);
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
  variant = "table",
  disabled = false,
}: CustomAddRowTableProps<T>) {
  // Error state: { rowIndex: { fieldKey: errorMessage } }
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  // Track which fields have been touched/interacted with
  const [touched, setTouched] = useState<Record<number, Record<string, boolean>>>({});
  // Card variant: which row has focus (inputs in that row show as input boxes; others blend in)
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
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
            setFocusedRowIndex(lastRowIndex);
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
      const rowIsCompletelyEmpty = columns.every((column) => {
        const value = row[column.key];
        return !String(value ?? "").trim();
      });
      if (rowIsCompletelyEmpty) {
        return;
      }

      const rowErrors: Record<string, string> = {};
      columns.forEach((column) => {
        const error = validateField(row[column.key], column.validation, row);
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
      const error = validateField(row[column.key], column.validation, row);
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
    value: any,
    currentRowData?: T
  ) => {
    if (disabled) return;
    const baseRow = (currentRowData ?? data[rowIndex] ?? ({} as T)) as T;
    const nextRow = {
      ...baseRow,
      [field]: value,
    } as T;

    // Update the value
    if (onRowChange) {
      onRowChange(rowIndex, field, value, nextRow);
    }

    // Mark field as touched when user starts typing and validate
    setTouched((prev) => {
      const newTouched = { ...prev };
      if (!newTouched[rowIndex]) newTouched[rowIndex] = {};
      newTouched[rowIndex][field] = true;
      return newTouched;
    });

    validateRow(rowIndex, nextRow);
  };

  const handleBlur = (
    rowIndex: number,
    field: string,
    value: any,
    currentRowData?: T
  ) => {
    if (disabled) return;
    // Mark field as touched when user leaves the field
    setTouched((prev) => {
      const newTouched = { ...prev };
      if (!newTouched[rowIndex]) {
        newTouched[rowIndex] = {};
      }
      newTouched[rowIndex][field] = true;
      return newTouched;
    });

    const baseRow = (currentRowData ?? data[rowIndex] ?? ({} as T)) as T;
    const nextRow = {
      ...baseRow,
      [field]: value,
    } as T;

    validateRow(rowIndex, nextRow);
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (disabled) return;
    onDeleteRow?.(rowIndex);
    setFocusedRowIndex((prev) => {
      if (prev === null) return prev;
      if (prev === rowIndex) return null;
      if (prev > rowIndex) return prev - 1;
      return prev;
    });
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[rowIndex];
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
  };

  if (variant === "card") {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className="flex flex-col gap-2">
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              (() => {
                const rowHasAnyValue = columns.some((c) =>
                  Boolean(String(row[c.key] ?? "").trim())
                );
                const isFocusedRow = focusedRowIndex === rowIndex;
                const blendRow = !isFocusedRow && rowHasAnyValue;
                const rowId = `table-row-${tableId}-${rowIndex}`;

                return (
              <div
                key={rowIndex}
                id={rowId}
                className="group flex gap-2 items-start rounded-lg bg-[#f5f5f5] p-1 transition-colors"
              >
                {columns.map((column) => {
                  const fieldError = (errors[rowIndex] || {})[column.key];
                  const isTouched = touched[rowIndex]?.[column.key] || false;
                  return (
                  <div key={column.key} className="flex flex-1 min-w-0">
                    {column.render ? (
                      column.render(row[column.key], row, rowIndex, {
                        disabled,
                        error: fieldError,
                        touched: isTouched,
                        setValue: (value) =>
                          handleRowChange(rowIndex, column.key, value),
                        setRowValue: (field, value, rowData) =>
                          handleRowChange(rowIndex, field, value, rowData),
                        onBlur: (value, rowData) =>
                          handleBlur(rowIndex, column.key, value, rowData),
                      })
                    ) : onRowChange ? (
                      <div className="flex flex-1 min-w-0 flex-col gap-1">
                        <Input
                          id={`table-input-${tableId}-${rowIndex}-${column.key}`}
                          type={column.validation?.url ? "url" : "text"}
                          variant="default"
                          value={row[column.key] || ""}
                          disabled={disabled}
                          onChange={(e) =>
                            handleRowChange(rowIndex, column.key, e.target.value)
                          }
                          onFocus={() => setFocusedRowIndex(rowIndex)}
                          onBlur={(e) => {
                            handleBlur(rowIndex, column.key, e.target.value);
                            setTimeout(() => {
                              const container = document.getElementById(rowId);
                              const active = document.activeElement;
                              if (!container || !active || !container.contains(active)) {
                                setFocusedRowIndex((prev) =>
                                  prev === rowIndex ? null : prev
                                );
                              }
                            }, 0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (!disabled) onAddRow();
                            }
                          }}
                          placeholder={column.label || "Enter value"}
                          className={cn(
                            "h-10 min-h-[36px] flex-1 min-w-0 rounded-lg px-3 py-2 text-general-foreground text-sm transition-colors border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0",
                            blendRow
                              ? "bg-transparent placeholder:text-general-border-four"
                              : "bg-white placeholder:text-general-border-four",
                            (errors[rowIndex] || {})[column.key] && touched[rowIndex]?.[column.key] && "aria-invalid border border-destructive"
                          )}
                          aria-invalid={touched[rowIndex]?.[column.key] && !!(errors[rowIndex] || {})[column.key]}
                        />
                        {touched[rowIndex]?.[column.key] && (errors[rowIndex] || {})[column.key] ? (
                          <FieldError className="text-xs mt-0.5">
                            {(errors[rowIndex] || {})[column.key]}
                          </FieldError>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-sm text-general-foreground">{String(row[column.key] ?? "")}</span>
                    )}
                  </div>
                  );
                })}
                {onDeleteRow && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity min-h-9 min-w-9 h-9 w-9 shrink-0 rounded-lg p-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteRow(rowIndex)}
                    title="Delete row"
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
                );
              })()
            ))
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (!disabled) onAddRow();
          }}
          className="flex items-center justify-center gap-1.5 h-8 min-h-8 px-3 py-2 rounded-lg text-general-primary hover:text-general-primary hover:bg-general-primary/10 w-fit"
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          {addButtonText}
        </Button>
      </div>
    );
  }

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
                  style={column.width ? { width: column.width } : undefined}
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
                const hasRowErrors = Object.keys(rowErrors).length > 0;
                const rowTouched = touched[rowIndex] || {};
                const showErrorRow = hasRowErrors && Object.keys(rowErrors).some((k) => rowTouched[k]);
                return (
                  <React.Fragment key={rowIndex}>
                    <TableRow className="group border-b border-general-border">
                      {columns.map((column) => {
                        const fieldError = rowErrors[column.key];
                        const isTouched = rowTouched[column.key] || false;
                        const isInvalid = isTouched && !!fieldError;
                        return (
                          <TableCell key={column.key} className="p-2 align-top">
                            <div className="flex flex-col">
                              {column.render ? (
                                column.render(row[column.key], row, rowIndex, {
                                  disabled,
                                  error: fieldError,
                                  touched: isTouched,
                                  setValue: (value) =>
                                    handleRowChange(rowIndex, column.key, value),
                                  setRowValue: (field, value, rowData) =>
                                    handleRowChange(rowIndex, field, value, rowData),
                                  onBlur: (value, rowData) =>
                                    handleBlur(rowIndex, column.key, value, rowData),
                                })
                              ) : onRowChange ? (
                                    <Input
                                      id={`table-input-${tableId}-${rowIndex}-${column.key}`}
                                      type={column.validation?.url ? "url" : "text"}
                                      variant="noBorder"
                                      value={row[column.key] || ""}
                                      disabled={disabled}
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
                                          if (!disabled) onAddRow();
                                        }
                                      }}
                                      placeholder="Enter value"
                                      className={cn(
                                        "w-full border-0 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 px-0 py-0 rounded-none min-h-8",
                                        isInvalid && "aria-invalid"
                                      )}
                                      aria-invalid={isInvalid}
                                    />
                              ) : (
                                row[column.key] || "Enter value"
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                      {onDeleteRow && (
                        <TableCell className="p-2 w-[50px] align-top">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "opacity-0 group-hover:opacity-100 transition-opacity",
                              "h-8 w-8 text-[#dc2626] hover:text-[#dc2626] hover:bg-[#dc2626]/10 cursor-pointer border border-[#dc2626]/30 hover:border-[#dc2626]"
                            )}
                            onClick={() => handleDeleteRow(rowIndex)}
                            title="Delete row"
                            disabled={disabled}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                    {showErrorRow && (
                      <TableRow className="border-b border-general-border bg-destructive/5">
                        <TableCell
                          colSpan={columns.length + (onDeleteRow ? 1 : 0)}
                          className="p-2 pt-0"
                        >
                          <FieldError className="text-xs">
                            {columns
                              .filter((col) => rowTouched[col.key] && rowErrors[col.key])
                              .map((col) => rowErrors[col.key])
                              .join(" · ")}
                          </FieldError>
                        </TableCell>
                      </TableRow>
                    )}
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
          onClick={() => {
            if (!disabled) onAddRow();
          }}
          className="rounded-md border border-general-border bg-white hover:bg-secondary text-general-foreground"
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          {addButtonText}
        </Button>
      </div>
    </div>
  );
}
