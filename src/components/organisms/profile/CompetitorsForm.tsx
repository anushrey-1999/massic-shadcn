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
import { Button } from "@/components/ui/button";
import { CustomAddRowTable, Column } from "@/components/organisms/CustomAddRowTable";
import { CompetitorRow } from "@/store/business-store";
import { useAddRowTableState } from "@/hooks/use-add-row-table-state";
import { Plus, Users } from "lucide-react";

type BusinessInfoFormData = {
  competitors?: Array<{ url: string }>;
};

interface CompetitorsFormProps {
  form: any; // TanStack Form instance
  embedded?: boolean;
  required?: boolean;
}

export const CompetitorsForm = ({
  form,
  embedded = false,
  required = false,
}: CompetitorsFormProps) => {
  // Subscribe only to specific fields this component cares about
  // Component will only re-render when these fields change
  const competitorsData = useStore(form.store, (state: any) => (state.values?.competitors || []) as CompetitorRow[]);
  const emptyCompetitorRow = useMemo<CompetitorRow>(() => ({ url: "" }), []);

  const [hasCompetitorErrors, setHasCompetitorErrors] = React.useState(false);

  React.useEffect(() => {
    form.setFieldMeta('competitors', (prev: any) => ({
      ...prev,
      hasValidationErrors: hasCompetitorErrors,
    }));
  }, [hasCompetitorErrors, form]);

  // Own column definitions
  const competitorsColumns: Column<CompetitorRow>[] = useMemo(
    () => [
      {
        key: "url",
        label: "Competitor website",
        validation: { required, url: true },
        cardClassName: "sm:col-span-2",
      },
    ],
    [required]
  );

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

  const cardVariant = embedded ? "noBorderShadowCard" : "profileCard";
  const innerContent = (
    <Card variant={cardVariant}>
      <CardHeader className={embedded ? "px-0 pt-0 pb-2" : ""}>
        <CardTitle className="text-sm font-medium leading-normal">
          <FieldLabel className="gap-0 text-sm font-medium leading-normal">
            {required ? (
              <span className="mr-0.5 text-destructive">*</span>
            ) : null}
            Websites of businesses that have similar offerings
          </FieldLabel>
        </CardTitle>
      </CardHeader>
      <CardContent className={embedded ? "p-0" : undefined}>
        <div className="w-full">
<CustomAddRowTable
              columns={competitorsColumns}
              data={competitorsData}
              onAddRow={handleAddRow}
              onRowChange={handleRowChange}
              onDeleteRow={handleDeleteRow}
              addButtonText="Add URL"
              onValidationChange={setHasCompetitorErrors}
              showErrorsWithoutTouch={hasCompetitorErrors}
              emptyRowData={required ? emptyCompetitorRow : undefined}
              variant="card"
              cardLayout="inline"
              hideAddButton={embedded}
            />
        </div>
      </CardContent>
    </Card>
  );

  if (embedded) {
    return (
      <div id="competitors" tabIndex={-1} className="space-y-3 outline-none">
        <div className="sticky -top-4 z-20 -mx-4 -mt-4 flex items-center justify-between gap-3 border-b border-general-border/30 bg-white px-4 py-3 sm:-mx-6 sm:px-6">
          <h2 className="text-base font-semibold text-general-foreground">
            Competitors
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="h-8 shrink-0 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add competitor
          </Button>
        </div>
        {innerContent}
      </div>
    );
  }

  return (
    <Card
      id="competitors"
      variant="profileCard"
      className="p-4 bg-white border-none shadow-none mt-6"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-[47px] w-[47px] shrink-0 text-[#D4D4D4]" strokeWidth={1} />
          <div className="space-y-0">
            <CardTitle>
              <Typography variant="h4" className="text-2xl!">Competitors</Typography>
            </CardTitle>
            <Typography variant="muted" className="text-xs text-general-muted-foreground">
              Gives context on your landscape so we can spot gaps, differentiation, and growth opportunities.
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

