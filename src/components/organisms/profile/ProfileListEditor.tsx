"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CircleAlert, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

import { useProfileEditingDisabled } from "./profile-editing-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field";
import {
  validateField,
  type ColumnValidation,
} from "@/components/organisms/CustomAddRowTable";
import { cn } from "@/lib/utils";

export type ProfileListField<T> = {
  key: Extract<keyof T, string>;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  inputMode?: "url" | "email" | "tel";
  validation?: ColumnValidation;
  /** Column span inside the modal's 6-column grid. Defaults to the full row. */
  span?: 2 | 3 | 6;
  /** Consecutive fields sharing a group render under one heading in the modal. */
  group?: string;
};

export type ProfileItemEditorState =
  | { mode: "add" }
  | { mode: "edit"; index: number }
  | null;

export function useProfileItemEditor() {
  const [state, setState] = useState<ProfileItemEditorState>(null);
  const openAdd = useCallback(() => setState({ mode: "add" }), []);
  const openEdit = useCallback(
    (index: number) => setState({ mode: "edit", index }),
    [],
  );
  const close = useCallback(() => setState(null), []);
  return { state, openAdd, openEdit, close };
}

export type ProfileItemEditor = ReturnType<typeof useProfileItemEditor>;

const FIELD_SPAN_CLASS: Record<
  NonNullable<ProfileListField<unknown>["span"]>,
  string
> = {
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  6: "sm:col-span-6",
};

function fieldText(item: Record<string, any>, key: string): string {
  const value = item[key];
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function isBlankItem<T extends Record<string, any>>(
  item: T,
  fields: ProfileListField<T>[],
): boolean {
  return fields.every((field) => !fieldText(item, field.key).trim());
}

function validateItem<T extends Record<string, any>>(
  item: T,
  fields: ProfileListField<T>[],
): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  for (const field of fields) {
    const error = validateField(fieldText(item, field.key), field.validation);
    if (error) errors[field.key] = error;
  }
  return errors;
}

/** Renders a stored URL as a short, clickable link that opens in a new tab. */
export function ProfileItemLink({
  href,
  label,
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const trimmed = href.trim();
  if (!trimmed) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const target = hasScheme ? trimmed : `https://${trimmed}`;
  const display =
    label ?? trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  return (
    <a
      href={target}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1 text-sm text-general-muted-foreground hover:text-general-foreground hover:underline",
        className,
      )}
    >
      <span className="truncate">{display}</span>
      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}

type ProfileItemDialogProps<T extends Record<string, any>> = {
  editor: ProfileItemEditor;
  items: T[];
  fields: ProfileListField<T>[];
  itemLabel: string;
  emptyItem: () => T;
  disabled?: boolean;
  onCommit: (item: T, index: number | null, initial: T | null) => void;
};

function ProfileItemDialog<T extends Record<string, any>>({
  editor,
  items,
  fields,
  itemLabel,
  emptyItem,
  disabled = false,
  onCommit,
}: ProfileItemDialogProps<T>) {
  const { state, close } = editor;
  const editIndex = state?.mode === "edit" ? state.index : null;
  const [draft, setDraft] = useState<T>(emptyItem);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const initialItem = useRef<T | null>(null);

  useEffect(() => {
    if (!state) return;
    initialItem.current =
      editIndex !== null && items[editIndex] ? { ...items[editIndex] } : null;
    setDraft(
      editIndex !== null && items[editIndex]
        ? { ...items[editIndex] }
        : emptyItem(),
    );
    setTouched({});
    setSubmitted(false);
    // Reset the draft only when the dialog opens or switches item, not on every list change.
  }, [state]);

  const errors = useMemo(() => validateItem(draft, fields), [draft, fields]);

  const groups = useMemo(() => {
    const result: Array<{ title?: string; fields: ProfileListField<T>[] }> = [];
    for (const field of fields) {
      const last = result[result.length - 1];
      if (last && last.title === field.group) last.fields.push(field);
      else result.push({ title: field.group, fields: [field] });
    }
    return result;
  }, [fields]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // The dialog is portalled out of the profile form in the DOM, but React still
    // bubbles submit through the component tree into the page-level save handler.
    event.stopPropagation();
    if (disabled) return;
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    onCommit(draft, editIndex, initialItem.current);
    close();
  };

  const isEditing = editIndex !== null;
  const titleLabel = `${isEditing ? "Edit" : "Add"} ${itemLabel}`;

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="gap-0 p-0 sm:max-w-xl">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col">
          <DialogHeader className="border-b border-general-border px-6 py-4">
            <DialogTitle className="text-base font-medium text-general-foreground">
              {titleLabel}
            </DialogTitle>
            <DialogDescription className="text-xs text-general-muted-foreground">
              Changes are applied to the profile when you select Save Changes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-6 py-5">
            {groups.map((group, groupIndex) => (
              <fieldset
                key={group.title ?? `group-${groupIndex}`}
                className="flex flex-col gap-3"
              >
                {group.title ? (
                  <legend className="mb-3 text-xs font-medium uppercase tracking-[1.5px] text-general-muted-foreground">
                    {group.title}
                  </legend>
                ) : null}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                  {group.fields.map((field) => {
                    const inputId = `profile-item-${field.key}`;
                    const error = errors[field.key];
                    const showError = Boolean(
                      error && (submitted || touched[field.key]),
                    );
                    const sharedProps = {
                      id: inputId,
                      value: fieldText(draft, field.key),
                      placeholder: field.placeholder,
                      disabled,
                      "aria-invalid": showError,
                      onChange: (
                        event: React.ChangeEvent<
                          HTMLInputElement | HTMLTextAreaElement
                        >,
                      ) =>
                        setDraft((prev) => ({
                          ...prev,
                          [field.key]: event.target.value,
                        })),
                      onBlur: () =>
                        setTouched((prev) => ({ ...prev, [field.key]: true })),
                    };
                    const isUrlLike =
                      field.inputMode === "url" || field.inputMode === "email";

                    return (
                      <div
                        key={field.key}
                        className={cn(
                          "flex min-w-0 flex-col gap-1.5",
                          FIELD_SPAN_CLASS[field.span ?? 6],
                        )}
                      >
                        <label
                          htmlFor={inputId}
                          className="text-sm font-medium text-general-foreground"
                        >
                          {field.label}
                          {field.validation?.required ? (
                            <span className="ml-0.5 text-destructive">*</span>
                          ) : null}
                        </label>
                        {field.multiline ? (
                          <Textarea
                            {...sharedProps}
                            rows={field.rows ?? 4}
                            className="min-h-24 resize-y text-sm leading-6"
                          />
                        ) : (
                          <Input
                            {...sharedProps}
                            type="text"
                            inputMode={field.inputMode}
                            autoCapitalize={isUrlLike ? "none" : undefined}
                            autoCorrect={isUrlLike ? "off" : undefined}
                            spellCheck={isUrlLike ? false : undefined}
                            className="h-9 text-sm"
                          />
                        )}
                        {showError ? (
                          <FieldError className="text-xs">{error}</FieldError>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <DialogFooter className="border-t border-general-border px-6 py-4">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={disabled}>
              {isEditing ? `Update ${itemLabel}` : `Add ${itemLabel}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ProfileListEditorProps<T extends Record<string, any>> = {
  editor: ProfileItemEditor;
  items: T[];
  fields: ProfileListField<T>[];
  /** Lowercase noun used in buttons and dialog titles, e.g. "offering". */
  itemLabel: string;
  emptyItem: () => T;
  onChange: (next: T[]) => void;
  renderItem: (item: T) => React.ReactNode;
  getItemTitle: (item: T) => string;
  emptyMessage: string;
  /** Renders an add button below the list for sections without a header action. */
  showAddButton?: boolean;
  /** Highlights the empty state when the section has an outstanding required issue. */
  showEmptyError?: boolean;
  onValidationChange?: (hasErrors: boolean) => void;
  disabled?: boolean;
  className?: string;
  getItemKey?: (item: T, index: number) => string | number;
  commitDraft?: (items: T[], draft: T, initial: T | null) => T[];
};

/**
 * Read-first list for repeatable profile records. Items render as readable rows;
 * inputs only appear in the add/edit dialog. Blank rows are hidden and dropped on
 * the next change so legacy placeholder rows never block saving.
 */
export function ProfileListEditor<T extends Record<string, any>>({
  editor,
  items,
  fields,
  itemLabel,
  emptyItem,
  onChange,
  renderItem,
  getItemTitle,
  emptyMessage,
  showAddButton = false,
  showEmptyError = false,
  onValidationChange,
  disabled = false,
  className,
  getItemKey,
  commitDraft,
}: ProfileListEditorProps<T>) {
  const profileDisabled = useProfileEditingDisabled();
  disabled = disabled || profileDisabled;
  const visible = useMemo(
    () =>
      items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !isBlankItem(item, fields)),
    [items, fields],
  );

  const errorsByIndex = useMemo(() => {
    const result = new Map<number, string>();
    for (const { item, index } of visible) {
      const errors = validateItem(item, fields);
      const firstField = fields.find((field) => errors[field.key]);
      if (firstField) {
        result.set(index, `${firstField.label}: ${errors[firstField.key]}`);
      }
    }
    return result;
  }, [visible, fields]);

  const hasErrors = errorsByIndex.size > 0;
  useEffect(() => {
    onValidationChange?.(hasErrors);
  }, [hasErrors, onValidationChange]);

  const withoutBlanks = useCallback(
    (list: T[]) => list.filter((item) => !isBlankItem(item, fields)),
    [fields],
  );

  const handleCommit = (item: T, index: number | null, initial: T | null) => {
    if (disabled) return;
    const next = commitDraft
      ? commitDraft(items, item, initial)
      : index === null
        ? [...items, item]
        : items.map((existing, i) => (i === index ? item : existing));
    onChange(withoutBlanks(next));
  };

  const handleDelete = (index: number) => {
    if (disabled) return;
    onChange(withoutBlanks(items.filter((_, i) => i !== index)));
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {visible.length > 0 ? (
        <ul className="divide-y divide-general-border overflow-hidden rounded-lg border border-general-border bg-white">
          {visible.map(({ item, index }) => {
            const title = getItemTitle(item);
            const error = errorsByIndex.get(index);
            return (
              <li
                key={getItemKey?.(item, index) ?? index}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-general-primary-foreground",
                  error && "bg-destructive/5 hover:bg-destructive/5",
                )}
              >
                <div className="min-w-0 flex-1 break-words">
                  {renderItem(item)}
                  {error ? (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                      <CircleAlert
                        className="size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      {error}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => editor.openEdit(index)}
                    disabled={disabled}
                    aria-label={`Edit ${title}`}
                    title="Edit"
                    className="text-general-muted-foreground hover:text-general-foreground"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(index)}
                    disabled={disabled}
                    aria-label={`Delete ${title}`}
                    title="Delete"
                    className="text-general-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div
          className={cn(
            "rounded-lg border border-dashed border-general-border px-4 py-6 text-center text-sm text-general-muted-foreground",
            showEmptyError &&
              "border-destructive/40 bg-destructive/5 text-destructive",
          )}
        >
          {emptyMessage}
        </div>
      )}

      {showAddButton ? (
        <Button
          type="button"
          variant="ghost"
          onClick={editor.openAdd}
          disabled={disabled}
          className="h-8 w-fit gap-1.5 px-3 text-general-primary hover:bg-general-primary/10 hover:text-general-primary"
        >
          <Plus className="size-4" />
          Add {itemLabel}
        </Button>
      ) : null}

      <ProfileItemDialog
        editor={editor}
        items={items}
        fields={fields}
        itemLabel={itemLabel}
        emptyItem={emptyItem}
        disabled={disabled}
        onCommit={handleCommit}
      />
    </div>
  );
}
