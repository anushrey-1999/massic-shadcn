"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CUSTOM_CONTENT_GROUP_OPERATOR_OPTIONS,
  createEmptyCustomContentGroup,
  normalizeContentGroupChipValue,
  type CustomContentGroup,
  type CustomContentGroupCondition,
} from "@/utils/custom-content-groups";
import type { TimePeriodValue } from "@/utils/analytics-period";
import { useCustomContentGroupPreview, useCustomContentGroups } from "@/hooks/use-custom-content-groups";

type ModalView = "list" | "create" | "edit";

interface CustomContentGroupsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessUniqueId: string | null;
  siteUrl: string | null;
  period: TimePeriodValue;
  trafficScope?: "all" | "organic";
}

function cloneGroup(group: CustomContentGroup): CustomContentGroup {
  return {
    name: group.name,
    conditions: group.conditions.map((condition) => ({
      operator: condition.operator,
      values: [...condition.values],
    })),
  };
}

function sanitizeGroup(group: CustomContentGroup): CustomContentGroup {
  return {
    name: group.name.trim(),
    conditions: group.conditions
      .map((condition) => ({
        operator: condition.operator,
        values: condition.values
          .map((value) => normalizeContentGroupChipValue(value))
          .filter((value): value is string => Boolean(value)),
      }))
      .filter((condition) => condition.values.length > 0),
  };
}

function validateGroup(
  group: CustomContentGroup,
  groups: CustomContentGroup[],
  editingIndex: number | null
): string | null {
  const sanitized = sanitizeGroup(group);

  if (!sanitized.name) {
    return "Content group name is required";
  }

  if (sanitized.conditions.length === 0) {
    return "Add at least one condition with a value";
  }

  const duplicateIndex = groups.findIndex(
    (item, index) =>
      index !== editingIndex &&
      item.name.trim().toLowerCase() === sanitized.name.toLowerCase()
  );

  if (duplicateIndex >= 0) {
    return "Content group name must be unique";
  }

  return null;
}

function ConditionValueInput({
  values,
  inputValue,
  disabled,
  onInputChange,
  onCommitValue,
  onRemoveValue,
}: {
  values: string[];
  inputValue: string;
  disabled?: boolean;
  onInputChange: (value: string) => void;
  onCommitValue: (value: string) => void;
  onRemoveValue: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === " " || event.key === ",") {
      event.preventDefault();
      onCommitValue(inputValue);
      return;
    }

    if (event.key === "Backspace" && !inputValue && values.length > 0) {
      onRemoveValue(values[values.length - 1]);
    }
  };

  return (
    <div
      className="min-h-10 w-full cursor-text rounded-[8px] border border-[#E5E5E5] bg-white px-3 py-2 shadow-xs"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex flex-wrap items-center gap-2">
        {values.map((value) => (
          <div
            key={value}
            className="flex items-center gap-1 rounded-[8px] bg-[rgba(110,193,166,0.2)] px-2 py-[3px]"
          >
            <span className="text-[10px] font-medium leading-4 tracking-[0.15px] text-[#2E6A56]">
              {value}
            </span>
            <button
              type="button"
              className="flex h-3 w-3 items-center justify-center rounded-full text-[#7CA998] transition-colors hover:bg-[#dcefe8]"
              onClick={(event) => {
                event.stopPropagation();
                onRemoveValue(value);
              }}
              disabled={disabled}
            >
              <X className="h-2.5 w-2.5" />
              <span className="sr-only">Remove value</span>
            </button>
          </div>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onCommitValue(inputValue)}
          placeholder={values.length === 0 ? "Type a path or URL and press space" : ""}
          disabled={disabled}
          className="h-6 min-w-[160px] flex-1 bg-transparent text-[12px] leading-[18px] text-[#0A0A0A] outline-none placeholder:text-[#737373] disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

export function CustomContentGroupsModal({
  open,
  onOpenChange,
  businessUniqueId,
  siteUrl,
  period,
  trafficScope = "organic",
}: CustomContentGroupsModalProps) {
  const { groups, isLoading, saveGroups, isSaving } = useCustomContentGroups(businessUniqueId);
  const {
    mutate: runPreview,
    reset: resetPreview,
    data: previewData,
    isPending: isPreviewPending,
  } = useCustomContentGroupPreview({
    businessUniqueId,
    siteUrl,
    period,
    trafficScope,
  });

  const [view, setView] = useState<ModalView>("list");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<CustomContentGroup>(createEmptyCustomContentGroup());
  const [conditionInputs, setConditionInputs] = useState<string[]>([""]);

  const deferredDraft = useDeferredValue(draft);
  const sanitizedDraft = useMemo(() => sanitizeGroup(deferredDraft), [deferredDraft]);
  const previewSummary = previewData ?? { count: 0, pages: [], remainingCount: 0 };
  const isEditing = view === "edit";

  useEffect(() => {
    if (!open) {
      setView("list");
      setEditingIndex(null);
      setDraft(createEmptyCustomContentGroup());
      setConditionInputs([""]);
    }
  }, [open]);

  useEffect(() => {
    if (!open || view === "list") return;

    if (!siteUrl || !businessUniqueId || sanitizedDraft.conditions.length === 0) {
      resetPreview();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      runPreview(sanitizedDraft);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    businessUniqueId,
    open,
    resetPreview,
    runPreview,
    sanitizedDraft,
    siteUrl,
    view,
  ]);

  useEffect(() => {
    setConditionInputs((current) => {
      if (current.length === draft.conditions.length) return current;

      if (current.length < draft.conditions.length) {
        return [
          ...current,
          ...Array.from({ length: draft.conditions.length - current.length }, () => ""),
        ];
      }

      return current.slice(0, draft.conditions.length);
    });
  }, [draft.conditions.length]);

  const openCreateView = () => {
    setDraft(createEmptyCustomContentGroup());
    setConditionInputs([""]);
    setEditingIndex(null);
    setView("create");
  };

  const openEditView = (index: number) => {
    const group = groups[index];
    if (!group) return;

    setDraft(cloneGroup(group));
    setConditionInputs(group.conditions.map(() => ""));
    setEditingIndex(index);
    setView("edit");
  };

  const handleBack = () => {
    setView("list");
    setEditingIndex(null);
    setDraft(createEmptyCustomContentGroup());
    setConditionInputs([""]);
    resetPreview();
  };

  const updateDraft = (updater: (current: CustomContentGroup) => CustomContentGroup) => {
    setDraft((current) => updater(current));
  };

  const handleConditionOperatorChange = (index: number, operator: CustomContentGroupCondition["operator"]) => {
    updateDraft((current) => ({
      ...current,
      conditions: current.conditions.map((condition, conditionIndex) =>
        conditionIndex === index ? { ...condition, operator } : condition
      ),
    }));
  };

  const handleCommitConditionValue = (index: number, rawValue: string) => {
    const normalized = normalizeContentGroupChipValue(rawValue);
    setConditionInputs((current) => current.map((value, currentIndex) => (currentIndex === index ? "" : value)));

    if (!normalized) return;

    updateDraft((current) => ({
      ...current,
      conditions: current.conditions.map((condition, conditionIndex) => {
        if (conditionIndex !== index) return condition;
        if (condition.values.includes(normalized)) return condition;
        return {
          ...condition,
          values: [...condition.values, normalized],
        };
      }),
    }));
  };

  const handleRemoveConditionValue = (index: number, valueToRemove: string) => {
    updateDraft((current) => ({
      ...current,
      conditions: current.conditions.map((condition, conditionIndex) =>
        conditionIndex === index
          ? {
              ...condition,
              values: condition.values.filter((value) => value !== valueToRemove),
            }
          : condition
      ),
    }));
  };

  const handleAddCondition = () => {
    updateDraft((current) => ({
      ...current,
      conditions: [
        ...current.conditions,
        {
          operator: "contains",
          values: [],
        },
      ],
    }));
    setConditionInputs((current) => [...current, ""]);
  };

  const handleDeleteGroup = async () => {
    if (editingIndex === null) return;

    try {
      const nextGroups = groups.filter((_, index) => index !== editingIndex);
      await saveGroups(nextGroups);
      handleBack();
    } catch {
      // The mutation already surfaces a toast.
    }
  };

  const handleSave = async () => {
    const validationError = validateGroup(draft, groups, editingIndex);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const sanitized = sanitizeGroup(draft);
    const nextGroups = [...groups];

    if (editingIndex === null) {
      nextGroups.push(sanitized);
    } else {
      nextGroups[editingIndex] = sanitized;
    }

    try {
      await saveGroups(nextGroups);
      handleBack();
    } catch {
      // The mutation already surfaces a toast.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSaving) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100vh-24px)] w-[min(560px,calc(100vw-24px))] max-w-[560px] flex-col gap-0 overflow-hidden rounded-[10px] border border-[#E5E5E5] bg-white p-0 shadow-lg"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-4">
          <DialogTitle className="text-[20px] font-semibold leading-6 tracking-[-0.4px] text-[#0A0A0A]">
            Custom Content Groups
          </DialogTitle>
          <button
            type="button"
            className="text-[#737373] transition-colors hover:text-[#0A0A0A]"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {view === "list" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="px-4 py-4">
              <p className="text-[12px] leading-[18px] tracking-[0.18px] text-[#0A0A0A]">
                Grouping pages lets you analyze related content as a set, not one URL at a time. Use it for blog
                posts, topical clusters, landing page variants, or programmatic SEO pages.
              </p>
            </div>

            <div className="min-h-0 overflow-y-auto px-4 pb-4">
              <button
                type="button"
                className="flex min-h-9 w-full items-center gap-2 border-b border-[#E5E5E5] px-2 py-[6px] text-left text-[14px] font-medium tracking-[0.07px] text-[#404040]"
                onClick={openCreateView}
              >
                <Plus className="h-[13px] w-[13px]" />
                Add Content Group
              </button>

              {isLoading ? (
                <div className="flex items-center justify-center py-10 text-[#737373]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : groups.length === 0 ? (
                <div className="border-b border-[#E5E5E5] px-2 py-6 text-[14px] text-[#737373]">
                  No custom content groups yet.
                </div>
              ) : (
                groups.map((group, index) => (
                  <button
                    key={`${group.name}-${index}`}
                    type="button"
                    onClick={() => openEditView(index)}
                    className="flex min-h-8 w-full items-center justify-between border-b border-[#E5E5E5] px-2 py-2 text-left text-[14px] tracking-[0.07px] transition-colors hover:bg-[#FAFAFA]"
                  >
                    <span className="truncate text-[#404040]">{group.name}</span>
                    <ChevronRight className="h-4 w-4 text-[#737373]" />
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="px-4 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-0 text-[14px] font-medium tracking-[0.07px] text-[#404040] hover:bg-transparent hover:text-[#0A0A0A]"
                onClick={handleBack}
                disabled={isSaving}
              >
                <ArrowLeft className="h-[13px] w-[13px]" />
                Back
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex flex-col gap-3 px-4 py-4">
              <Input
                value={draft.name}
                onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Enter Group Name"
                disabled={isSaving}
                className="rounded-[8px] border-[#E5E5E5] text-[14px] text-[#0A0A0A] placeholder:text-[#737373]"
              />

              {draft.conditions.map((condition, index) => (
                <div key={`${index}-${condition.operator}`} className="flex gap-3">
                  <Select
                    value={condition.operator}
                    onValueChange={(value) =>
                      handleConditionOperatorChange(index, value as CustomContentGroupCondition["operator"])
                    }
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-10 w-[136px] rounded-[8px] border-[#E5E5E5] bg-white shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOM_CONTENT_GROUP_OPERATOR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <ConditionValueInput
                    values={condition.values}
                    inputValue={conditionInputs[index] || ""}
                    disabled={isSaving}
                    onInputChange={(value) =>
                      setConditionInputs((current) =>
                        current.map((input, inputIndex) => (inputIndex === index ? value : input))
                      )
                    }
                    onCommitValue={(value) => handleCommitConditionValue(index, value)}
                    onRemoveValue={(value) => handleRemoveConditionValue(index, value)}
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="ghost"
                className="h-8 w-fit px-0 text-[14px] font-medium tracking-[0.07px] text-[#2E6A56] hover:bg-transparent hover:text-[#255848]"
                onClick={handleAddCondition}
                disabled={isSaving}
              >
                <Plus className="h-[13px] w-[13px]" />
                And
              </Button>
              </div>

              <div className="flex min-h-[180px] max-h-[220px] w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA] px-4 py-2">
                <p className="font-mono text-[12px] leading-[18px] text-[#737373]">
                  {previewSummary.count} matching page{previewSummary.count === 1 ? "" : "s"}
                </p>
                {isPreviewPending ? (
                  <div className="flex items-center gap-2 py-4 text-[12px] text-[#737373]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating matching pages...
                  </div>
                ) : previewSummary.count === 0 ? (
                  <p className="pt-3 text-[10px] leading-[15px] tracking-[0.15px] text-[#0A0A0A]">
                    No matching pages yet.
                  </p>
                ) : (
                  <div className="min-h-0 flex-1 overflow-y-auto pt-2 pr-1">
                    <ul className="min-w-0 list-disc pl-4 text-[10px] leading-[15px] tracking-[0.15px] text-[#0A0A0A]">
                      {previewSummary.pages.map((page) => (
                        <li key={page} className="break-all">
                          {page}
                        </li>
                      ))}
                      {previewSummary.remainingCount > 0 ? (
                        <li className="break-words">{`+${previewSummary.remainingCount} other pages`}</li>
                      ) : null}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-4">
              <div>
                {isEditing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-0 text-[14px] font-medium tracking-[0.07px] text-[#DC2626] hover:bg-transparent hover:text-[#b91c1c]"
                    onClick={handleDeleteGroup}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-[13px] w-[13px]" />
                    Delete Group
                  </Button>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-[8px] border-[#D4D4D4] bg-white px-4 text-[14px] font-medium text-[#0A0A0A]"
                  onClick={handleBack}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-9 rounded-[8px] bg-[#2E6A56] px-4 text-[14px] font-medium text-[#FAFAFA] hover:bg-[#255848]"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Edits
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
