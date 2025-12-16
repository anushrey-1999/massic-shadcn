"use client";

import React, { useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationRow } from "@/store/business-store";
import { useAddRowTableState } from "@/hooks/use-add-row-table-state";

type BusinessInfoFormData = {
  locations?: Array<{ name: string; address: string; timezone: string }>;
};

interface LocationsFormProps {
  form: any; // TanStack Form instance
}

export const LocationsForm = ({
  form,
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

  // Memoized timezone select cell component
  const TimezoneSelectCell = useMemo(() => {
    return React.memo(({ 
      value, 
      index, 
      row,
      onValueChange,
      timezoneOptions: tzOptions
    }: { 
      value: string; 
      index: number; 
      row: LocationRow;
      onValueChange: (index: number, field: string, value: string, currentRow?: LocationRow) => void;
      timezoneOptions: Array<{ value: string; label: string }>;
    }) => {
      const handleChange = (newValue: string) => {
        // Pass the current row data to preserve name and address
        onValueChange(index, "timezone", newValue, row);
      };

      return (
        <Select
          value={value || ""}
          onValueChange={handleChange}
        >
          <SelectTrigger className="w-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-0 rounded-none h-auto">
            <SelectValue placeholder="Choose a timezone" />
          </SelectTrigger>
          <SelectContent>
            {tzOptions.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }, (prevProps, nextProps) => {
      return (
        prevProps.value === nextProps.value &&
        prevProps.index === nextProps.index &&
        prevProps.timezoneOptions === nextProps.timezoneOptions &&
        prevProps.row.name === nextProps.row.name &&
        prevProps.row.address === nextProps.row.address &&
        prevProps.row.timezone === nextProps.row.timezone
      );
    });
  }, []);

  // Own column definitions
  const locationsColumns: Column<LocationRow>[] = useMemo(() => [
    { key: "name", label: "Name", validation: { required: false } },
    { key: "address", label: "Address", validation: { required: false } },
    {
      key: "timezone",
      label: "Timezone",
      validation: { required: false },
      render: (value: any, row: LocationRow, index: number) => {
        return (
          <TimezoneSelectCell
            value={value || ""}
            index={index}
            row={row}
            onValueChange={handleRowChange}
            timezoneOptions={timezoneOptions}
          />
        );
      },
    },
  ], [TimezoneSelectCell, timezoneOptions, handleRowChange]);

  return (
    <Card
      id="locations-addresses"
      variant="profileCard"
      className="py-6 px-4 bg-white border-none mt-6"
    >
      <CardHeader className="pb-4">
        <CardTitle>
          <Typography variant="h4">Locations & Addresses</Typography>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card variant="profileCard">
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                Addresses from which your business operates
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomAddRowTable
              columns={locationsColumns}
              data={locationsData}
              onAddRow={handleAddRow}
              onRowChange={handleRowChange}
              onDeleteRow={handleDeleteRow}
              addButtonText="Add Location"
            />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

