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
import { FieldLabel, FieldError } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { CustomAddRowTable, Column } from "@/components/organisms/CustomAddRowTable";
import { MicVocal } from "lucide-react";
import { CTARow, StakeholderRow, CalendarEventRow } from "@/store/business-store";
import { useAddRowTableState } from "@/hooks/use-add-row-table-state";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TagsInput } from "@/components/ui/tags-input";

type BusinessInfoFormData = {
  usps?: string;
  ctas?: Array<{ buttonText: string; url: string }>;
  ctasSavedIndices?: number[];
  stakeholders?: Array<{ name: string; title: string; bio?: string }>;
  stakeholdersSavedIndices?: number[];
  calendarEvents?: Array<{ eventName: string; startDate: string | null; endDate: string | null }>;
  calendarEventsSavedIndices?: number[];
  brandToneSocial?: string[];
  brandToneWeb?: string[];
  brandTerms?: string[];
};

interface ContentCuesFormProps {
  form: any; // TanStack Form instance
  embedded?: boolean;
}

export const ContentCuesForm = ({
  form,
  embedded = false,
}: ContentCuesFormProps) => {
  // Subscribe only to specific fields this component cares about
  // Component will only re-render when these fields change
  const uspsValue = useStore(form.store, (state: any) => (state.values?.usps || "") as string);
  const ctasData = useStore(form.store, (state: any) => (state.values?.ctas || []) as CTARow[]);
  const stakeholdersData = useStore(form.store, (state: any) => (state.values?.stakeholders || []) as StakeholderRow[]);
  const calendarEventsData = useStore(form.store, (state: any) => (state.values?.calendarEvents || []) as CalendarEventRow[]);

  const uspChips = useMemo(() => {
    return String(uspsValue ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [uspsValue]);

  // Track CTA validation errors
  const [hasCtaErrors, setHasCtaErrors] = React.useState(false);

  // Update form field when CTA validation errors change
  React.useEffect(() => {
    form.setFieldMeta('ctas', (prev: any) => ({
      ...prev,
      hasValidationErrors: hasCtaErrors,
    }));
  }, [hasCtaErrors, form]);

  // Own column definitions
  const ctaColumns: Column<CTARow>[] = useMemo(() => [
    { key: "buttonText", label: "Button Text", validation: { required: true } },
    { key: "url", label: "URL", validation: { required: true, url: true } },
  ], []);

  const stakeholdersColumns: Column<StakeholderRow>[] = useMemo(() => [
    { key: "name", label: "Name", validation: { required: false } },
    { key: "title", label: "Role", validation: { required: false } },
    { key: "bio", label: "Bio", validation: { required: false } },
  ], []);

  // Own handlers - encapsulated logic
  const {
    handleAddRow: handleAddCTARow,
    handleRowChange: handleCTARowChange,
    handleDeleteRow: handleCTADeleteRow,
  } = useAddRowTableState<CTARow>({
    data: ctasData,
    formFieldName: "ctas",
    setFormFieldValue: (name: string, value: any) => form.setFieldValue(name as keyof BusinessInfoFormData, value),
    emptyRowFactory: () => ({ buttonText: "", url: "" }),
  });

  const {
    handleAddRow: handleAddStakeholderRow,
    handleRowChange: handleStakeholderRowChange,
    handleDeleteRow: handleStakeholderDeleteRow,
  } = useAddRowTableState<StakeholderRow>({
    data: stakeholdersData,
    formFieldName: "stakeholders",
    setFormFieldValue: (name: string, value: any) => form.setFieldValue(name as keyof BusinessInfoFormData, value),
    emptyRowFactory: () => ({ name: "", title: "", bio: "" }),
  });

  const {
    handleAddRow: handleAddCalendarEventRow,
    handleRowChange: handleCalendarEventRowChange,
    handleDeleteRow: handleCalendarEventDeleteRow,
  } = useAddRowTableState<CalendarEventRow>({
    data: calendarEventsData,
    formFieldName: "calendarEvents",
    setFormFieldValue: (name: string, value: any) => form.setFieldValue(name as keyof BusinessInfoFormData, value),
    getCurrentData: () => {
      const currentState = form.state.values.calendarEvents || [];
      return currentState as CalendarEventRow[];
    },
    emptyRowFactory: () => ({ eventName: "", startDate: null, endDate: null }),
  });

  const cardVariant = embedded ? "noBorderShadowCard" : "profileCard";

  const calendarEventsColumnsWithHandlers: Column<CalendarEventRow>[] = useMemo(() => [
    { key: "eventName", label: "Upcoming Events", validation: { required: true }, width: "50%" },
    {
      key: "startDate",
      label: "Date",
      validation: {
        required: true,
      },
      width: "50%",
      render: (_value: any, row: CalendarEventRow, _index: number, helpers) => {
        return (
          <div className="flex flex-col gap-1">
            <DateRangePicker
              startDate={row.startDate}
              endDate={row.endDate}
              onChange={(startDate, endDate) => {
                helpers.setRowValue("startDate", startDate, {
                  ...row,
                  startDate,
                  endDate,
                });
              }}
              placeholder="Select date"
              className="w-full"
            />
            {helpers.touched && helpers.error ? (
              <FieldError className="text-xs mt-0.5">{helpers.error}</FieldError>
            ) : null}
          </div>
        );
      }
    },
  ], []);

  const innerContent = (
    <div className="space-y-7">
        <Card variant={cardVariant}>
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">USPs</FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uspChips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {uspChips.map((usp, index) => (
                  <Badge
                    key={`${usp}-${index}`}
                    variant="outline"
                    className="rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {usp}
                  </Badge>
                ))}
              </div>
            ) : (
              <Typography variant="small" className="text-general-muted-foreground">
                No USPs found.
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card variant={cardVariant}>
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                CTAs (Enter CTA copy along with its destination URL)
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full md:w-3/4">
            <CustomAddRowTable
              columns={ctaColumns}
              data={ctasData}
              onAddRow={handleAddCTARow}
              onRowChange={handleCTARowChange}
              onDeleteRow={handleCTADeleteRow}
              addButtonText="Add Button"
              onValidationChange={setHasCtaErrors}
              showErrorsWithoutTouch={hasCtaErrors}
              variant="card"
            />
            </div>
          </CardContent>
        </Card>

        <Card variant={cardVariant}>
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                Brand terms that best describe your business
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full md:w-3/4">
              <form.Field
                name="brandTerms"
                children={(field: any) => {
                  const currentValue = Array.isArray(field.state.value)
                    ? field.state.value
                    : [];
                  return (
                    <TagsInput
                      value={currentValue}
                      onChange={(next) => field.handleChange(next)}
                      placeholder="Type a term and press Enter"
                    />
                  );
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant={cardVariant}>
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                What is the tone of your brand's content?<span className="text-general-muted-foreground pl-1">Add up to 3 per channel.</span>
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full md:w-3/4">
              <div className="flex flex-col gap-3">
                <Card variant="profileCard" className="bg-white shadow-none p-0 overflow-hidden">
                  <CardHeader className="bg-foreground-light pt-2 px-2.5">
                    <CardTitle>
                      <FieldLabel className="gap-0 font-mono text-xs text-muted-foreground">Social</FieldLabel>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form.Field
                      name="brandToneSocial"
                      children={(field: any) => {
                        const currentValue = Array.isArray(field.state.value)
                          ? field.state.value.slice(0, 3)
                          : [];
                        return (
                          <TagsInput
                            value={currentValue}
                            onChange={(next) => field.handleChange(next.slice(0, 3))}
                            placeholder="Type a social tone and press Enter"
                            maxItems={3}
                          />
                        );
                      }}
                    />
                  </CardContent>
                </Card>

                <Card variant="profileCard" className="bg-white shadow-none p-0 overflow-hidden">
                  <CardHeader className="bg-foreground-light pt-2 px-2.5">
                    <CardTitle>
                      <FieldLabel className="gap-0 font-mono text-xs text-muted-foreground">Web</FieldLabel>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form.Field
                      name="brandToneWeb"
                      children={(field: any) => {
                        const currentValue = Array.isArray(field.state.value)
                          ? field.state.value.slice(0, 3)
                          : [];
                        return (
                          <TagsInput
                            value={currentValue}
                            onChange={(next) => field.handleChange(next.slice(0, 3))}
                            placeholder="Type a web tone and press Enter"
                            maxItems={3}
                          />
                        );
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant={cardVariant}>
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                Primary stakeholders/key people involved in the business
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full md:w-3/4">
            <CustomAddRowTable
              columns={stakeholdersColumns}
              data={stakeholdersData}
              onAddRow={handleAddStakeholderRow}
              onRowChange={handleStakeholderRowChange}
              onDeleteRow={handleStakeholderDeleteRow}
              addButtonText="Add Person"
              variant="card"
            />
            </div>
          </CardContent>
        </Card>

      
      <Card variant={cardVariant}>
        <CardHeader className="">
          <CardTitle>
            <FieldLabel className="gap-0">
              Calendar Events
            </FieldLabel>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full md:w-3/4">
          <CustomAddRowTable
            columns={calendarEventsColumnsWithHandlers}
            data={calendarEventsData}
            onAddRow={handleAddCalendarEventRow}
            onRowChange={handleCalendarEventRowChange}
            onDeleteRow={handleCalendarEventDeleteRow}
            addButtonText="Add Custom Event"
            variant="card"
          />
          </div>
        </CardContent>
      </Card>
     
    </div>
  );

  if (embedded) {
    return (
      <div id="content-cues" className="space-y-7">
        {innerContent}
      </div>
    );
  }

  return (
    <Card
      id="content-cues"
      variant="profileCard"
      className="p-4 bg-white border-none shadow-none mt-6"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <MicVocal className="h-[47px] w-[47px] shrink-0 text-[#D4D4D4]" strokeWidth={1} />
          <div className="space-y-0">
            <CardTitle>
              <Typography variant="h4" className="text-2xl!">Content Cues</Typography>
            </CardTitle>
            <Typography variant="muted" className="text-xs text-general-muted-foreground">
              Guides tone, messaging, and calls-to-action so content sounds like you and converts better.
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
    

