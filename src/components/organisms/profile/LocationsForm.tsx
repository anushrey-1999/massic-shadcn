"use client";

import React, { useMemo } from "react";
import { useStore } from "@tanstack/react-form";
import { MapPin } from "lucide-react";

import {
  CustomAddRowTable,
  type Column,
} from "@/components/organisms/CustomAddRowTable";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Typography } from "@/components/ui/typography";
import { useAddRowTableState } from "@/hooks/use-add-row-table-state";

type StructuredLocationRow = {
  name?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  mapLink?: string;
  hours?: string;
  primaryFlag?: string;
};

type LocationsFormProps = {
  form: any;
  embedded?: boolean;
};

export const LocationsForm = ({
  form,
  embedded = false,
}: LocationsFormProps) => {
  const locations = useStore(
    form.store,
    (state: any) =>
      (state.values?.detailedLocations || []) as StructuredLocationRow[]
  );

  const columns = useMemo<Column<StructuredLocationRow>[]>(
    () => [
      { key: "name", label: "Name", validation: { required: false } },
      {
        key: "streetAddress",
        label: "Street address",
        validation: { required: false },
      },
      { key: "city", label: "City", validation: { required: false } },
      { key: "state", label: "State", validation: { required: false } },
      { key: "zip", label: "Postal code", validation: { required: false } },
      { key: "country", label: "Country", validation: { required: false } },
      { key: "phone", label: "Phone", validation: { required: false } },
      { key: "email", label: "Email", validation: { required: false } },
      {
        key: "mapLink",
        label: "Map URL",
        validation: { required: false, url: true },
      },
    ],
    []
  );

  const { handleAddRow, handleRowChange, handleDeleteRow } =
    useAddRowTableState<StructuredLocationRow>({
      data: locations,
      formFieldName: "detailedLocations",
      setFormFieldValue: (name, value) => form.setFieldValue(name, value),
      getCurrentData: () =>
        (form.state.values.detailedLocations || []) as StructuredLocationRow[],
      emptyRowFactory: () => ({
        name: "",
        streetAddress: "",
        city: "",
        state: "",
        zip: "",
        country: "",
      }),
    });

  const cardVariant = embedded ? "noBorderShadowCard" : "profileCard";
  const content = (
    <Card variant={cardVariant}>
      <CardHeader>
        <CardTitle>
          <FieldLabel className="gap-0">
            Addresses from which your business operates
          </FieldLabel>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <CustomAddRowTable
            columns={columns}
            data={locations}
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
    return <div id="locations-addresses">{content}</div>;
  }

  return (
    <Card
      id="locations-addresses"
      variant="profileCard"
      className="mt-6 border-none bg-white p-4 shadow-none"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <MapPin
            className="h-[47px] w-[47px] shrink-0 text-general-border-three"
            strokeWidth={1}
          />
          <div>
            <CardTitle>
              <Typography variant="h4" className="text-2xl!">
                Locations &amp; Addresses
              </Typography>
            </CardTitle>
            <Typography
              variant="muted"
              className="text-xs text-general-muted-foreground"
            >
              Keeps recommendations aligned with where your business operates.
            </Typography>
          </div>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};
