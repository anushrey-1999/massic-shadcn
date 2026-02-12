"use client";

import * as React from "react";
import type { FieldApi, FormApi } from "@tanstack/react-form";
import { cn } from "@/lib/utils";

// Helper type to extract field names from form data
type FieldNames<T> = T extends Record<string, unknown> ? keyof T : never;
import { Input } from "./input";
import { Textarea } from "./textarea";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "./input-group";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "./field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { LocationSelect } from "./location-select";
import type { VariantProps } from "class-variance-authority";

type BaseInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "size" | "checked" | "value" | "form"
> &
  Omit<React.ComponentProps<"textarea">, "size" | "value" | "form"> &
  Omit<React.ComponentProps<"select">, "size" | "value" | "form"> & {
    value?: string | number | boolean | readonly string[];
    onChange?: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => void;
    onBlur?: (
      e: React.FocusEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => void;
  };

type SelectOption = {
  value: string | number;
  label: string;
  disabled?: boolean;
};

type InputConfig<TFormData extends Record<string, unknown> = Record<string, unknown>> = {
  type?:
  | "input"
  | "textarea"
  | "select"
  | "location-select"
  | "checkbox"
  | "checkbox-group"
  | "radio"
  | "radio-group"
  | "number"
  | "email"
  | "password"
  | "tel"
  | "url"
  | "date"
  | "time"
  | "datetime-local"
  | "month"
  | "week"
  | "file"
  | "range"
  | "color";
  showCharacterCount?: boolean;
  maxLength?: number;
  rows?: number;
  // Select/Radio/Checkbox group options
  options?: SelectOption[];
  // Radio/Checkbox specific
  checked?: boolean;
  // Radio group name
  name?: string;
  // Layout for radio/checkbox groups
  orientation?: "horizontal" | "vertical";
  // LocationSelect specific
  loading?: boolean;
  addon?: {
    position?: "inline-start" | "inline-end" | "block-start" | "block-end";
    content?: React.ReactNode;
  };
  // Field wrapper props
  label?: React.ReactNode;
  error?: Array<{ message?: string } | undefined> | React.ReactNode;
  description?: React.ReactNode;
  fieldOrientation?: VariantProps<typeof Field>["orientation"];
  isInvalid?: boolean;
  required?: boolean;
  // Input variant
  inputVariant?: "default" | "noBorder";
  // TanStack Form integration
  // Using Record<string, unknown> constraint ensures type safety without 'any'
  formField?: {
    name: string;
    state: {
      value: TFormData[keyof TFormData];
      meta: {
        isTouched: boolean;
        isValid: boolean;
        errors?: Array<{ message?: string } | undefined>;
      };
    };
    handleChange: (value: TFormData[keyof TFormData]) => void;
    handleBlur: () => void;
  };
  // Accept any form-like object that has a Field method
  // Using structural typing - we only care that it has a Field method we can call
  // This works with both FormApi and ReactFormExtendedApi from TanStack Form
  // The type is intentionally permissive to work with TanStack Form's complex generics
  form?: {
    Field: React.ComponentType<{
      name: string & keyof TFormData;
      children: (field: {
        name: string;
        state: {
          value: TFormData[keyof TFormData];
          meta: {
            isTouched: boolean;
            isValid: boolean;
            errors?: Array<{ message?: string } | undefined>;
          };
        };
        handleChange: (value: TFormData[keyof TFormData]) => void;
        handleBlur: () => void;
      }) => React.ReactNode;
    }>;
    // Form-level state for API integration
    // Only including properties we actually use
    state?: {
      isSubmitting?: boolean;
    };
  };
  fieldName?: TFormData extends Record<string, unknown>
  ? FieldNames<TFormData> extends string
  ? FieldNames<TFormData>
  : string
  : string;
};

export type GenericInputProps<
  TFormData extends Record<string, unknown> = Record<string, unknown>
> = BaseInputProps & InputConfig<TFormData>;

// Field configuration object type for FormFieldInput
export type FieldConfig = {
  name: string;
  label?: React.ReactNode;
  type?: GenericInputProps["type"];
  placeholder?: string;
  description?: React.ReactNode;
  options?: SelectOption[];
  showCharacterCount?: boolean;
  maxLength?: number;
  rows?: number;
  orientation?: "horizontal" | "vertical";
  fieldOrientation?: VariantProps<typeof Field>["orientation"];
  addon?: InputConfig<Record<string, unknown>>["addon"];
  // Additional props that can be passed through
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  loading?: boolean;
  inputVariant?: "default" | "noBorder";
};

function GenericInput<
  TFormData extends Record<string, unknown> = Record<string, unknown>
>({
  type = "input",
  showCharacterCount = false,
  maxLength,
  rows,
  addon,
  options,
  checked,
  className,
  value,
  onChange,
  label,
  error,
  description,
  fieldOrientation,
  isInvalid,
  id,
  formField,
  form,
  fieldName,
  loading,
  required = false,
  inputVariant,
  ...props
}: GenericInputProps<TFormData>) {
  // If formField is provided, extract field values and handlers
  // Then merge with existing props and continue to normal rendering
  if (formField) {
    const field = formField;
    // Show errors if field has been interacted with (touched or has value) AND is invalid
    // With onChange validation, errors clear immediately when value becomes valid
    // This prevents showing errors on untouched empty fields, but shows them once user interacts
    const hasValue = field.state.value !== "" && field.state.value !== undefined && field.state.value !== null;
    const fieldIsInvalid =
      (field.state.meta.isTouched || hasValue) &&
      !field.state.meta.isValid &&
      field.state.meta.errors &&
      field.state.meta.errors.length > 0;

    // Override with field values
    id = field.name;
    props.name = field.name;
    props.onBlur = field.handleBlur;
    label = label || fieldName;
    error = fieldIsInvalid ? field.state.meta.errors : undefined;
    isInvalid = fieldIsInvalid;

    // Handle value and onChange based on input type
    // Type assertions are safe here because we know the field value matches the expected type
    if (type === "checkbox") {
      checked = field.state.value as boolean;
      onChange = ((e: React.ChangeEvent<HTMLInputElement>) =>
        field.handleChange(e.target.checked as TFormData[keyof TFormData])) as typeof onChange;
    } else if (type === "checkbox-group") {
      value = (Array.isArray(field.state.value) ? field.state.value : []) as readonly string[];
      onChange = ((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = Array.isArray(e.target.value) ? e.target.value : [];
        field.handleChange(newValue as TFormData[keyof TFormData]);
      }) as typeof onChange;
    } else if (type === "number") {
      value = field.state.value as unknown as string | number;
      onChange = ((e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const nextValue = raw === "" ? "" : Number(raw);
        field.handleChange(nextValue as TFormData[keyof TFormData]);
      }) as typeof onChange;
    } else if (type === "location-select") {
      value = field.state.value as string;
      // LocationSelect uses direct value callback, but we need to maintain event signature
      // Store the direct callback separately and handle it in renderInput
      onChange = ((val: string | React.ChangeEvent<HTMLSelectElement>) => {
        const stringValue = typeof val === 'string' ? val : val.target.value;
        field.handleChange(stringValue as TFormData[keyof TFormData]);
      }) as typeof onChange;
    } else {
      value = field.state.value as string;
      onChange = ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        field.handleChange(e.target.value as TFormData[keyof TFormData])) as typeof onChange;
    }
  }

  // If form and fieldName are provided, wrap with form.Field
  if (form && fieldName) {
    // Only disable if explicitly set via props, not during form submission
    // This allows fields to remain editable after saving
    const shouldDisable = props.disabled ?? false;

    return (
      <form.Field
        name={fieldName as keyof TFormData & string}
        children={(field) => (
          <GenericInput
            {...props}
            formField={field}
            type={type}
            label={label}
            description={description}
            fieldOrientation={fieldOrientation}
            showCharacterCount={showCharacterCount}
            maxLength={maxLength}
            rows={rows}
            options={options}
            orientation={props.orientation}
            addon={addon}
            className={className}
            disabled={shouldDisable}
            loading={loading}
            required={required}
            inputVariant={inputVariant}
          />
        )}
      />
    );
  }

  // Main rendering logic (works for both formField and direct usage)
  const hasAddon = !!addon;
  const hasInputGroup = hasAddon || showCharacterCount;
  const inputId = id || props.name;
  const hasFieldWrapper = label !== undefined || error !== undefined || description !== undefined;

  // Render the input component
  const renderInput = () => {
    // Handle location-select using LocationSelect component
    if (type === "location-select") {
      const currentValue = value as string | undefined;
      const locationOptions = options?.map((opt) => ({
        value: String(opt.value),
        label: opt.label,
        disabled: opt.disabled,
      })) || [];

      const handleLocationChange = (newValue: string) => {
        if (onChange) {
          // LocationSelect passes value directly, but onChange can handle both
          // Pass the string directly - onChange wrapper will handle it
          (onChange as (val: string | React.ChangeEvent<HTMLSelectElement>) => void)(newValue);
        }
      };

      // Apply inputVariant styling to trigger button to match Select component styling
      // When noBorder, match the Select component's noBorder variant classes
      const triggerClassName = cn(
        inputVariant === "noBorder" && [
          // Override Button base classes to match Select
          "!h-10 !px-3 !py-1 !text-sm !rounded-md", // Match Select's h-10 (40px) height and text-sm font size
          "!min-w-0", // Match Input
          // Match Select noBorder variant exactly
          "!border-0 !bg-white !shadow-xs",
          // Override Button outline variant hover states
          "!hover:bg-white !hover:text-foreground",
          // Override dark mode styles
          "!dark:bg-white !dark:border-0 !dark:hover:bg-white",
          // Remove focus ring to match noBorder input
          "!focus-visible:ring-0 !focus-visible:ring-offset-0 !focus-visible:border-0",
          // Remove cursor pointer to match input styling
          "!cursor-default",
          // Match Select transition
          "transition-[color,box-shadow]",
        ],
        className
      );

      return (
        <LocationSelect
          value={currentValue}
          onChange={handleLocationChange}
          options={locationOptions}
          placeholder={props.placeholder}
          disabled={props.disabled}
          loading={loading}
          triggerClassName={triggerClassName}
        />
      );
    }

    // Handle select dropdown using shadcn Select component for full styling control
    if (type === "select") {
      const currentValue = value as string | number | undefined;
      const stringValue = currentValue !== undefined && currentValue !== "" ? String(currentValue) : undefined;

      // Find placeholder text from options (first disabled option with empty value) or use default
      const placeholderOption = options?.find((opt) => opt.value === "" || String(opt.value).trim() === "");
      const placeholderText = placeholderOption?.label || props.placeholder || "Select an option";

      const handleValueChange = (newValue: string) => {
        if (onChange) {
          // Create a synthetic event to match the expected onChange signature
          const syntheticEvent = {
            target: { value: newValue },
            currentTarget: { value: newValue },
          } as React.ChangeEvent<HTMLSelectElement>;
          onChange(syntheticEvent);
        }
      };

      const selectContent = (
        <SelectContent className="bg-background border-border">
          {options?.map((option) => {
            // Radix UI Select doesn't allow empty string values
            // Filter out placeholder options with empty values
            if (option.value === "" || String(option.value).trim() === "") {
              return null;
            }

            if (option.disabled) {
              return (
                <SelectItem
                  key={option.value}
                  value={String(option.value)}
                  disabled={true}
                  className="text-muted-foreground"
                >
                  {option.label}
                </SelectItem>
              );
            }
            return (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      );

      if (hasInputGroup) {
        return (
          <InputGroup className="h-10 rounded-lg">
            {addon && addon.position === "inline-start" && (
              <InputGroupAddon align={addon.position}>
                {typeof addon.content === "string" ? (
                  <InputGroupText>{addon.content}</InputGroupText>
                ) : (
                  addon.content
                )}
              </InputGroupAddon>
            )}
            <Select
              value={stringValue}
              onValueChange={handleValueChange}
              disabled={props.disabled}
            >
              <SelectTrigger
                id={inputId}
                variant={inputVariant}
                className={cn(
                  "flex-1 rounded-lg focus-visible:ring-0 w-full",
                  className
                )}
                aria-invalid={isInvalid}
              >
                <SelectValue placeholder={placeholderText} />
              </SelectTrigger>
              {selectContent}
            </Select>
            {addon && addon.position === "inline-end" && (
              <InputGroupAddon align={addon.position}>
                {typeof addon.content === "string" ? (
                  <InputGroupText>{addon.content}</InputGroupText>
                ) : (
                  addon.content
                )}
              </InputGroupAddon>
            )}
          </InputGroup>
        );
      }

      return (
        <Select
          value={stringValue}
          onValueChange={handleValueChange}
          disabled={props.disabled}
        >
          <SelectTrigger
            id={inputId}
            variant={inputVariant}
            className={cn("w-full", className)}
            aria-invalid={isInvalid}
          >
            <SelectValue placeholder={placeholderText} />
          </SelectTrigger>
          {selectContent}
        </Select>
      );
    }

    // Handle checkbox group (multi-select)
    if (type === "checkbox-group" && options) {
      const currentValues = Array.isArray(value) ? value : [];
      const groupOrientation = props.orientation || "vertical";

      return (
        <div
          id={inputId}
          data-slot="checkbox-group"
          aria-invalid={isInvalid}
          className={cn(
            "flex gap-4",
            groupOrientation === "horizontal"
              ? "flex-row flex-wrap"
              : "flex-col gap-3",
            className
          )}
        >
          {options.map((option) => {
            const isChecked = currentValues.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={option.value}
                  checked={isChecked}
                  disabled={option.disabled}
                  onChange={(e) => {
                    if (!onChange) return;
                    const newValues = isChecked
                      ? currentValues.filter((v) => v !== option.value)
                      : [...currentValues, option.value];
                    // Create a synthetic event-like object for array values
                    const syntheticEvent = {
                      ...e,
                      target: { ...e.target, value: newValues },
                    } as unknown as React.ChangeEvent<HTMLInputElement>;
                    onChange(syntheticEvent);
                  }}
                  onBlur={props.onBlur}
                  aria-invalid={isInvalid}
                  className={cn(
                    "h-4 w-4 rounded border border-input bg-background",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "appearance-none cursor-pointer transition-colors",
                    "aria-invalid:border-destructive",
                    isChecked && "bg-foreground border-foreground"
                  )}
                  style={{
                    backgroundImage: isChecked
                      ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E\")"
                      : "none",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    // Handle radio group
    if ((type === "radio-group" || (type === "radio" && options)) && options) {
      const currentValue = value;
      const groupOrientation = props.orientation || "vertical";

      return (
        <div
          id={inputId}
          data-slot="radio-group"
          aria-invalid={isInvalid}
          className={cn(
            "flex gap-4",
            groupOrientation === "horizontal"
              ? "flex-row flex-wrap"
              : "flex-col gap-2",
            className
          )}
        >
          {options.map((option) => {
            const isChecked = currentValue === option.value;
            return (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name={props.name}
                  value={option.value}
                  checked={isChecked}
                  disabled={option.disabled}
                  onChange={(e) => {
                    if (onChange) {
                      const syntheticEvent = {
                        target: { value: e.target.value },
                      } as React.ChangeEvent<HTMLInputElement>;
                      onChange(syntheticEvent);
                    }
                  }}
                  onBlur={props.onBlur}
                  className={cn(
                    "h-4 w-4 rounded-full border border-input bg-background shadow-xs",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "accent-foreground",
                    isChecked && "bg-foreground"
                  )}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    // Handle single checkbox
    if (type === "checkbox") {
      const isChecked = checked ?? (value === true || value === "true");
      const checkboxProps = {
        ...props,
        type: "checkbox",
        checked: isChecked,
        onChange,
        className: cn(
          "h-4 w-4 rounded border border-input bg-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "appearance-none cursor-pointer transition-colors",
          "aria-invalid:border-destructive",
          isChecked && "bg-foreground border-foreground",
          className
        ),
        style: {
          backgroundImage: isChecked
            ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E\")"
            : "none",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        },
      };

      return <input id={inputId} data-slot="checkbox" aria-invalid={isInvalid} {...checkboxProps} />;
    }

    // Handle single radio button
    if (type === "radio") {
      const { value: radioValue, ...radioRestProps } = props as {
        value?: string | number;
      } & typeof props;
      const isChecked = checked ?? (value === radioValue);
      const radioProps = {
        ...radioRestProps,
        type: "radio",
        checked: isChecked,
        value: radioValue as string | number | undefined,
        onChange,
        className: cn(
          "h-4 w-4 rounded-full border border-input bg-background shadow-xs",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "accent-foreground",
          isChecked && "bg-foreground",
          className
        ),
      };

      return <input id={inputId} data-slot="radio" aria-invalid={isInvalid} {...radioProps} />;
    }

    // Handle file input
    if (type === "file") {
      const fileProps = {
        ...props,
        type: "file",
        onChange,
        className: cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-lg border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        ),
      };

      return <input id={inputId} data-slot="file-input" aria-invalid={isInvalid} {...fileProps} />;
    }

    // Handle range input
    if (type === "range") {
      const rangeProps = {
        ...props,
        type: "range",
        value: value as number | undefined,
        onChange,
        className: cn(
          "h-2 w-full cursor-pointer rounded-lg appearance-none bg-input accent-primary disabled:cursor-not-allowed disabled:opacity-50",
          className
        ),
      };

      return <input id={inputId} data-slot="range-input" aria-invalid={isInvalid} {...rangeProps} />;
    }

    // Handle color input
    if (type === "color") {
      const colorProps = {
        ...props,
        type: "color",
        value: value as string | undefined,
        onChange,
        className: cn(
          "h-10 w-full cursor-pointer rounded-lg border border-input bg-transparent disabled:cursor-not-allowed disabled:opacity-50",
          className
        ),
      };

      return <input id={inputId} data-slot="color-input" aria-invalid={isInvalid} {...colorProps} />;
    }

    const inputProps = {
      ...props,
      id: inputId,
      className: cn(
        "h-10 rounded-lg", // Increased height and border radius
        className
      ),
      maxLength,
      value: value as string | number | readonly string[] | undefined,
      onChange,
      "aria-invalid": isInvalid,
    };

    // Render with InputGroup if addon or character count is needed
    if (hasInputGroup) {
      if (type === "textarea") {
        return (
          <InputGroup className="h-auto rounded-lg">
            <InputGroupTextarea
              {...(inputProps as React.ComponentProps<typeof InputGroupTextarea>)}
              rows={rows}
            />
            {addon && addon.position === "block-end" && (
              <InputGroupAddon align={addon.position}>
                {typeof addon.content === "string" ? (
                  <InputGroupText>{addon.content}</InputGroupText>
                ) : (
                  addon.content
                )}
              </InputGroupAddon>
            )}
            {showCharacterCount &&
              typeof value === "string" &&
              value !== undefined && (
                <InputGroupAddon align="block-end">
                  <InputGroupText className="tabular-nums">
                    {value.length}
                    {maxLength ? `/${maxLength} characters` : " characters"}
                  </InputGroupText>
                </InputGroupAddon>
              )}
          </InputGroup>
        );
      }

      // type === "input" or other input types
      return (
        <InputGroup className="h-10 rounded-lg">
          {addon && addon.position === "inline-start" && (
            <InputGroupAddon align={addon.position}>
              {typeof addon.content === "string" ? (
                <InputGroupText>{addon.content}</InputGroupText>
              ) : (
                addon.content
              )}
            </InputGroupAddon>
          )}
          <InputGroupInput
            type={type === "input" ? undefined : type}
            {...(inputProps as React.ComponentProps<typeof InputGroupInput>)}
          />
          {addon && addon.position === "inline-end" && (
            <InputGroupAddon align={addon.position}>
              {typeof addon.content === "string" ? (
                <InputGroupText>{addon.content}</InputGroupText>
              ) : (
                addon.content
              )}
            </InputGroupAddon>
          )}
        </InputGroup>
      );
    }

    // Render simple input/textarea without InputGroup
    if (type === "textarea") {
      return (
        <Textarea
          {...(inputProps as React.ComponentProps<typeof Textarea>)}
          rows={rows}
          variant={inputVariant}
          className={cn(
            "rounded-lg min-h-16", // Increased border radius for textarea
            inputProps.className
          )}
        />
      );
    }

    // For other input types (number, email, password, date, etc.), use Input with type prop
    return (
      <Input
        id={inputId}
        type={type === "input" ? undefined : type}
        aria-invalid={isInvalid}
        variant={inputVariant}
        {...(inputProps as React.ComponentProps<typeof Input>)}
        className={cn(
          "h-10 rounded-lg", // Increased height and border radius
          inputProps.className
        )}
      />
    );
  };

  const inputElement = renderInput();

  // Helper function to render label with required asterisk
  const renderLabel = () => {
    if (!label) return null;

    if (required) {
      // If label is a string, wrap it with asterisk
      if (typeof label === "string") {
        return (
          <FieldLabel htmlFor={inputId} className="gap-0">
            <span className="text-destructive mr-0.5">*</span>
            {label}
          </FieldLabel>
        );
      }
      // If label is a ReactNode, wrap it with asterisk
      return (
        <FieldLabel htmlFor={inputId} className="gap-0">
          <span className="text-destructive mr-0.5">*</span>
          {label}
        </FieldLabel>
      );
    }

    // No required asterisk needed
    return <FieldLabel htmlFor={inputId}>{label}</FieldLabel>;
  };

  // If label, error, or description is provided, wrap with Field components
  if (hasFieldWrapper) {
    // For checkbox/radio with horizontal orientation, use horizontal field layout
    const shouldUseHorizontalField =
      (type === "checkbox" || type === "radio") &&
      fieldOrientation === "horizontal";

    return (
      <Field
        data-invalid={isInvalid}
        orientation={shouldUseHorizontalField ? "horizontal" : fieldOrientation}
      >
        {renderLabel()}
        {inputElement}
        {description && <FieldDescription>{description}</FieldDescription>}
        {error && (
          <FieldError
            errors={Array.isArray(error) ? error : undefined}
          >
            {!Array.isArray(error) ? error : undefined}
          </FieldError>
        )}
      </Field>
    );
  }

  // Return input without wrapper if no label/error/description
  return inputElement;
}

export { GenericInput };

// Helper component that accepts field configuration object
export function FormFieldInput<
  TFormData extends Record<string, unknown> = Record<string, unknown>
>({
  config,
  form,
}: {
  config: FieldConfig;
  form: {
    Field: (props: {
      name: string;
      children: (field: {
        name: string;
        state: {
          value: TFormData[keyof TFormData];
          meta: {
            isTouched: boolean;
            isValid: boolean;
            errors?: Array<{ message?: string } | undefined>;
          };
        };
        handleChange: (value: TFormData[keyof TFormData]) => void;
        handleBlur: () => void;
      }) => React.ReactNode;
    }) => React.ReactNode;
  };
}) {
  return (
    <GenericInput<TFormData>
      form={form}
      fieldName={config.name as unknown as GenericInputProps<TFormData>["fieldName"]}
      type={config.type || "input"}
      label={config.label}
      description={config.description}
      placeholder={config.placeholder}
      options={config.options}
      showCharacterCount={config.showCharacterCount}
      maxLength={config.maxLength}
      rows={config.rows}
      orientation={config.orientation}
      fieldOrientation={config.fieldOrientation}
      addon={config.addon}
      required={config.required}
      inputVariant={config.inputVariant}
      {...config}
    />
  );
}

