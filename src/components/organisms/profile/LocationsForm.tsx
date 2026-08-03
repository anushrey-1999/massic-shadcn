"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@tanstack/react-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { FieldLabel } from "@/components/ui/field";
import { CustomAddRowTable, Column } from "@/components/organisms/CustomAddRowTable";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LocationRow } from "@/store/business-store";
import { useAddRowTableState } from "@/hooks/use-add-row-table-state";
import { MapPin, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type BusinessInfoFormData = {
  locations?: Array<{ name: string; address: string; timezone: string }>;
};

interface LocationsFormProps {
  form: any; // TanStack Form instance
  embedded?: boolean;
}

export const LocationsForm = ({
  form,
  embedded = false,
}: LocationsFormProps) => {
  // Subscribe only to specific fields this component cares about
  // Component will only re-render when these fields change
  const locationsData = useStore(form.store, (state: any) => (state.values?.locations || []) as LocationRow[]);

  // Get all IANA timezones using browser's native API
  const timezoneOptions = useMemo(() => {
    try {
      // Get all supported timezones
      const timeZones = Intl.supportedValuesOf("timeZone");
      
      // Format timezones with better labels (replace underscores with spaces, capitalize)
      return timeZones.map((tz) => ({
        value: tz,
        label: tz.replace(/_/g, " "), // Replace underscores with spaces for better readability
      })).sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically
    } catch (error) {
      // Fallback for older browsers that don't support Intl.supportedValuesOf
      console.warn("Intl.supportedValuesOf not supported, using fallback timezones");
      return [
        { value: "UTC", label: "UTC" },
        { value: "America/New_York", label: "America/New York" },
        { value: "America/Chicago", label: "America/Chicago" },
        { value: "America/Denver", label: "America/Denver" },
        { value: "America/Los_Angeles", label: "America/Los Angeles" },
        { value: "Europe/London", label: "Europe/London" },
        { value: "Asia/Tokyo", label: "Asia/Tokyo" },
      ];
    }
  }, []);

  // Own handlers - encapsulated logic
  const {
    handleAddRow,
    handleRowChange,
    handleDeleteRow,
  } = useAddRowTableState<LocationRow>({
    data: locationsData,
    formFieldName: "locations",
    setFormFieldValue: (name: string, value: any) => form.setFieldValue(name as keyof BusinessInfoFormData, value),
    getCurrentData: () => {
      // Get the latest data directly from form state to avoid stale data
      const currentState = form.state.values.locations || [];
      return currentState as LocationRow[];
    },
    emptyRowFactory: () => ({ name: "", address: "", timezone: "" }),
  });

  // Memoized timezone combobox cell component with search
  const TimezoneComboboxCell = React.memo(({ 
    value, 
    index, 
    row,
    onValueChange,
    timezoneOptions: tzOptions,
    disabled,
    isFocusedRow,
    blendRow,
    rowId,
    setFocusedRowIndex,
  }: { 
    value: string; 
    index: number; 
    row: LocationRow;
    onValueChange: (index: number, field: string, value: string, currentRow?: LocationRow) => void;
    timezoneOptions: Array<{ value: string; label: string }>;
    disabled: boolean;
    isFocusedRow: boolean;
    blendRow: boolean;
    rowId: string;
    setFocusedRowIndex: React.Dispatch<React.SetStateAction<number | null>>;
  }) => {
    const [open, setOpen] = useState(false);

    const handleSelect = (newValue: string) => {
      // Pass the current row data to preserve name and address
      onValueChange(index, "timezone", newValue, row);
      setOpen(false);
    };

    const handleOpenChange = (nextOpen: boolean) => {
      if (disabled) return;
      setOpen(nextOpen);

      if (nextOpen) {
        setFocusedRowIndex(index);
        return;
      }

      // Mirror the Input blur behavior: only clear focus if nothing inside row is focused.
      setTimeout(() => {
        const container = document.getElementById(rowId);
        const active = document.activeElement;
        if (!container || !active || !container.contains(active)) {
          setFocusedRowIndex((prev) => (prev === index ? null : prev));
        }
      }, 0);
    };

    const selectedLabel = tzOptions.find((tz) => tz.value === value)?.label || "";

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                // Match `CustomAddRowTable` card-input sizing exactly (see Input class in that file)
                "h-9 min-h-9 w-full min-w-0 rounded-lg px-3 py-2 text-general-foreground text-sm transition-colors border-0 shadow-none outline-none",
                "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0",
                "inline-flex items-center justify-between gap-2",
                "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                (blendRow && !open) ? "bg-transparent" : "bg-white"
              )}
            >
              <span className={cn("truncate text-left", !value && "text-general-border-four")}>
                {value ? selectedLabel : "Choose a timezone"}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search timezone..." />
            <CommandList>
              <CommandEmpty>No timezone found.</CommandEmpty>
              <CommandGroup>
                {tzOptions.map((tz) => (
                  <CommandItem
                    key={tz.value}
                    value={tz.label}
                    onSelect={() => handleSelect(tz.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === tz.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {tz.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }, (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.index === nextProps.index &&
      prevProps.timezoneOptions === nextProps.timezoneOptions &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.isFocusedRow === nextProps.isFocusedRow &&
      prevProps.blendRow === nextProps.blendRow &&
      prevProps.rowId === nextProps.rowId &&
      prevProps.row.name === nextProps.row.name &&
      prevProps.row.address === nextProps.row.address &&
      prevProps.row.timezone === nextProps.row.timezone
    );
  });

  // Own column definitions
  const locationsColumns: Column<LocationRow>[] = useMemo(() => [
    { key: "name", label: "Name", validation: { required: false } },
    { key: "address", label: "Address", validation: { required: false } },
    {
      key: "timezone",
      label: "Timezone",
      validation: { required: false },
      render: (
        value: any,
        row: LocationRow,
        index: number,
        helpers
      ) => {
        return (
          <TimezoneComboboxCell
            value={value || ""}
            index={index}
            row={row}
            onValueChange={handleRowChange}
            timezoneOptions={timezoneOptions}
            disabled={helpers?.disabled ?? false}
            isFocusedRow={helpers?.isFocusedRow ?? false}
            blendRow={helpers?.blendRow ?? false}
            rowId={helpers?.rowId ?? `timezone-row-${index}`}
            setFocusedRowIndex={helpers?.setFocusedRowIndex ?? (() => {})}
          />
        );
      },
    },
  ], [timezoneOptions, handleRowChange]);

  const cardVariant = embedded ? "noBorderShadowCard" : "profileCard";
  const innerContent = (
    <Card variant={cardVariant}>
<CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                Addresses from which your business operates
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full md:w-3/4">
<CustomAddRowTable
              columns={locationsColumns}
              data={locationsData}
              onAddRow={handleAddRow}
              onRowChange={handleRowChange}
              onDeleteRow={handleDeleteRow}
              addButtonText="Add Location"
              variant="card"
            />
            </div>
          </CardContent>
        </Card>
  );

  if (embedded) {
    return <div id="locations-addresses">{innerContent}</div>;
  }

  return (
    <Card
      id="locations-addresses"
      variant="profileCard"
      className="p-4 bg-white border-none shadow-none mt-6"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-[47px] w-[47px] shrink-0 text-[#D4D4D4]" strokeWidth={1} />
          <div className="space-y-0">
            <CardTitle>
              <Typography variant="h4" className="text-2xl!">Locations & Addresses</Typography>
            </CardTitle>
            <Typography variant="muted" className="text-xs text-general-muted-foreground">
              Ensures strategies are localized for the markets where your customers actually are.
            </Typography>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-7">
        {innerContent}
      </CardContent>
    </Card>
  );
};

