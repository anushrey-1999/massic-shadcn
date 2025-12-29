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
import { CompetitorRow } from "@/store/business-store";
import { useAddRowTableState } from "@/hooks/use-add-row-table-state";

type BusinessInfoFormData = {
  competitors?: Array<{ url: string }>;
};

interface CompetitorsFormProps {
  form: any; // TanStack Form instance
}

export const CompetitorsForm = ({
  form,
}: CompetitorsFormProps) => {
  // Subscribe only to specific fields this component cares about
  // Component will only re-render when these fields change
  const competitorsData = useStore(form.store, (state: any) => (state.values?.competitors || []) as CompetitorRow[]);

  const [hasCompetitorErrors, setHasCompetitorErrors] = React.useState(false);

  React.useEffect(() => {
    form.setFieldMeta('competitors', (prev: any) => ({
      ...prev,
      hasValidationErrors: hasCompetitorErrors,
    }));
  }, [hasCompetitorErrors, form]);

  // Own column definitions
  const competitorsColumns: Column<CompetitorRow>[] = useMemo(() => [
    { key: "url", label: "URL of competitor website", validation: { required: false, url: true } },
  ], []);

  // Own handlers - encapsulated logic
  const {
    handleAddRow,
    handleRowChange,
    handleDeleteRow,
  } = useAddRowTableState<CompetitorRow>({
    data: competitorsData,
    formFieldName: "competitors",
    setFormFieldValue: (name: string, value: any) => form.setFieldValue(name as keyof BusinessInfoFormData, value),
    emptyRowFactory: () => ({ url: "" }),
  });

  return (
    <Card
      id="competitors"
      variant="profileCard"
      className="py-6 px-4 bg-white border-none mt-6"
    >
      <CardHeader className="pb-4">
        <CardTitle>
          <Typography variant="h4">Competitors</Typography>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card variant="profileCard">
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                Websites of businesses that have similar offerings
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomAddRowTable
              columns={competitorsColumns}
              data={competitorsData}
              onAddRow={handleAddRow}
              onRowChange={handleRowChange}
              onDeleteRow={handleDeleteRow}
              addButtonText="Add URL"
              onValidationChange={setHasCompetitorErrors}
              showErrorsWithoutTouch={hasCompetitorErrors}
            />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

