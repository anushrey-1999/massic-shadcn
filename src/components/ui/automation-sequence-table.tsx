"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Eye, EyeClosed, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SequenceItem {
  id: string
  type: "email" | "sms"
  name: string
  sequenceDay: number
  dayUnit?: string
  subject?: string
  content?: string
  buttonText?: string
  isSkipped?: boolean
}

export interface ColumnConfig {
  key: string
  label: string
  width?: string
  render?: (seq: SequenceItem, isExpanded: boolean, handleFieldChange: (id: string, field: keyof SequenceItem, value: any) => void) => React.ReactNode
}

export interface ExpandedFieldConfig {
  key: keyof SequenceItem
  label: string
  type: "input" | "textarea"
  placeholder?: string
  required?: boolean
  width?: string
  showForTypes?: ("email" | "sms")[]
  minHeight?: string
}

export interface AutomationSequenceTableProps {
  sequences: SequenceItem[]
  onUpdateSequence?: (id: string, data: Partial<SequenceItem>) => void
  onDeleteSequence?: (id: string) => void
  onAddSequence?: () => void
  className?: string
  columns?: ColumnConfig[]
  expandedFields?: ExpandedFieldConfig[]
}

const defaultColumns: ColumnConfig[] = [
  {
    key: "name",
    label: "Activity",
    width: "w-[200px]",
    render: (seq, _, __) => (
      <p
        className={cn(
          "text-sm text-general-foreground",
          seq.isSkipped && "text-general-foreground/60"
        )}
      >
        {seq.name}
      </p>
    ),
  },
  {
    key: "sequence",
    label: "Sequence (days)",
    width: "flex-1",
  },
]

const defaultExpandedFields: ExpandedFieldConfig[] = [
  {
    key: "subject",
    label: "Subject",
    type: "input",
    placeholder: "Enter subject",
    required: true,
    showForTypes: ["email"],
  },
  {
    key: "content",
    label: "Content",
    type: "textarea",
    placeholder: "Enter content",
    required: true,
    minHeight: "min-h-[120px]",
  },
  {
    key: "buttonText",
    label: "Button Text for Review Link URL",
    type: "input",
    placeholder: "Enter button text",
    required: true,
    width: "w-[280px]",
    showForTypes: ["email"],
  },
]

export const AutomationSequenceTable = React.forwardRef<
  HTMLDivElement,
  AutomationSequenceTableProps
>(
  (
    {
      sequences,
      onUpdateSequence,
      onDeleteSequence,
      onAddSequence,
      className,
      columns = defaultColumns,
      expandedFields = defaultExpandedFields,
    },
    ref
  ) => {
    const [expandedId, setExpandedId] = React.useState<string | null>(
      sequences.length > 0 ? sequences[0].id : null
    )

    const toggleExpand = (id: string) => {
      setExpandedId(expandedId === id ? null : id)
    }

    const handleFieldChange = (id: string, field: keyof SequenceItem, value: any) => {
      onUpdateSequence?.(id, { [field]: value })
    }

    const toggleSkip = (id: string) => {
      const sequence = sequences.find(seq => seq.id === id)
      if (sequence) {
        onUpdateSequence?.(id, { isSkipped: !sequence.isSkipped })
      }
    }

    const renderSequenceColumn = (seq: SequenceItem, isExpanded: boolean) => {
      if (isExpanded) {
        return (
          <>
            <Input
              type="number"
              value={seq.sequenceDay}
              onChange={(e) =>
                handleFieldChange(seq.id, "sequenceDay", parseInt(e.target.value) || 0)
              }
              onClick={(e) => e.stopPropagation()}
              className="w-20 h-8 text-sm"
              disabled={seq.isSkipped}
            />
            <span className="text-sm text-general-foreground">
              {seq.dayUnit || "day later"}
            </span>
          </>
        )
      }
      return (
        <p className={cn(
          "text-sm text-general-foreground",
          seq.isSkipped && "text-general-foreground/60"
        )}>
          {seq.sequenceDay} {seq.dayUnit || "day later"}
        </p>
      )
    }

    const renderField = (field: ExpandedFieldConfig, seq: SequenceItem) => {
      const commonProps = {
        disabled: seq.isSkipped,
        placeholder: field.placeholder,
      }

      if (field.type === "textarea") {
        return (
          <Textarea
            value={(seq[field.key] as string) || ""}
            onChange={(e) => handleFieldChange(seq.id, field.key, e.target.value)}
            className={cn("text-sm resize-none", field.minHeight)}
            {...commonProps}
          />
        )
      }

      return (
        <Input
          value={(seq[field.key] as string) || ""}
          onChange={(e) => handleFieldChange(seq.id, field.key, e.target.value)}
          className="h-9 text-sm"
          {...commonProps}
        />
      )
    }

    return (
      <div ref={ref} className={cn("w-full", className)}>
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border border-general-border rounded-t-lg overflow-hidden">
            <div className="flex items-center ">
              {columns.map((col, index) => (
                <div
                  key={col.key}
                  className={cn(
                    "px-2 py-2 ",
                    col.width,
                    index < columns.length - 1 && ""
                  )}
                >
                  <p className="text-sm font-medium text-general-foreground">{col.label}</p>
                </div>
              ))}
              <div className="w-20 px-2 py-2 text-center">
                <p className="text-sm font-medium text-general-foreground">Actions</p>
              </div>
            </div>
          </div>

          {/* Rows */}
          {sequences.map((seq, index) => {
            const isExpanded = expandedId === seq.id

            return (
              <div
                key={seq.id}
                className={cn(
                  "bg-white border-l border-r border-b border-general-border",
                  isExpanded && "",
                  seq.isSkipped && "opacity-50"
                )}
              >
                {/* Row header */}
                <div
                  data-row-header="true"
                  className={cn(
                    "flex items-center cursor-pointer hover:bg-general-background/50",
                    isExpanded ? "min-h-14" : "min-h-10",
                    seq.isSkipped && "bg-general-secondary/30"
                  )}
                  onClick={() => toggleExpand(seq.id)}
                >
                  {columns.map((col) => (
                    <div key={col.key} className={cn("px-2 py-2 shrink-0", col.width)}>
                      {col.key === "sequence" ? (
                        <div className="flex items-center gap-2">
                          {renderSequenceColumn(seq, isExpanded)}
                        </div>
                      ) : col.render ? (
                        col.render(seq, isExpanded, handleFieldChange)
                      ) : null}
                    </div>
                  ))}
                  <div className="w-20 px-2 py-0.5 flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 w-8 p-0",
                        seq.isSkipped && "text-general-foreground/40"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSkip(seq.id)
                      }}
                    >
                      {seq.isSkipped ? (
                        <EyeClosed className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteSequence?.(seq.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="p-3">
                    <div className="bg-foreground-light rounded-lg p-2 space-y-4">
                      <div className="space-y-4">
                        {expandedFields.map((field, fieldIndex) => {
                          if (
                            field.showForTypes &&
                            !field.showForTypes.includes(seq.type)
                          ) {
                            return null
                          }

                          const isButtonTextField = field.key === "buttonText"

                          return (
                            <div key={field.key}>
                              {isButtonTextField ? (
                                <div className="flex items-end gap-4 justify-between">
                                  <div className={cn("space-y-1", field.width)}>
                                    <Label className="text-sm  text-general-foreground">
                                      {field.required && (
                                        <span className="text-red-500">*</span>
                                      )}
                                      {field.label}
                                    </Label>
                                    {renderField(field, seq)}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    className="text-sm text-general-primary"
                                    disabled={seq.isSkipped}
                                  >
                                    Save Changes
                                  </Button>
                                </div>
                              ) : (
                                <div className={cn("space-y-1", field.width)}>
                                  <Label className="text-sm  text-general-foreground">
                                    {field.required && (
                                      <span className="text-red-500">*</span>
                                    )}
                                    {field.label}
                                  </Label>
                                  {renderField(field, seq)}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add button */}
          <div className="bg-white border-l border-r border-b border-general-border rounded-b-lg p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddSequence}
              className="text-sm font-medium"
            >
              + Add
            </Button>
          </div>
        </div>
      </div>
    )
  }
)

AutomationSequenceTable.displayName = "AutomationSequenceTable"
