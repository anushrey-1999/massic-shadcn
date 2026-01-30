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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomAddRowTable, Column } from "@/components/organisms/CustomAddRowTable";
import { CTARow, StakeholderRow, CalendarEventRow } from "@/store/business-store";
import { useAddRowTableState } from "@/hooks/use-add-row-table-state";
import { DateRangePicker } from "@/components/ui/date-range-picker";

type BusinessInfoFormData = {
  usps?: string;
  ctas?: Array<{ buttonText: string; url: string }>;
  ctasSavedIndices?: number[];
  stakeholders?: Array<{ name: string; title: string }>;
  stakeholdersSavedIndices?: number[];
  calendarEvents?: Array<{ eventName: string; startDate: string | null; endDate: string | null }>;
  calendarEventsSavedIndices?: number[];
  brandToneSocial?: string[];
  brandToneWeb?: string[];
  brandTerms?: string;
};

interface ContentCuesFormProps {
  form: any; // TanStack Form instance
}

export const ContentCuesForm = ({
  form,
}: ContentCuesFormProps) => {
  // Subscribe only to specific fields this component cares about
  // Component will only re-render when these fields change
  const ctasData = useStore(form.store, (state: any) => (state.values?.ctas || []) as CTARow[]);
  const stakeholdersData = useStore(form.store, (state: any) => (state.values?.stakeholders || []) as StakeholderRow[]);
  const calendarEventsData = useStore(form.store, (state: any) => (state.values?.calendarEvents || []) as CalendarEventRow[]);

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
    { key: "title", label: "Title", validation: { required: false } },
  ], []);

  const calendarEventsColumns: Column<CalendarEventRow>[] = useMemo(() => [
    { key: "eventName", label: "Upcoming Events", validation: { required: false } },
    {
      key: "startDate",
      label: "Date",
      validation: { required: false }
    },
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
    emptyRowFactory: () => ({ name: "", title: "" }),
  });

  const {
    handleAddRow: handleAddCalendarEventRow,
    handleRowChange: handleCalendarEventRowChange,
    handleDeleteRow: handleCalendarEventDeleteRow,
  } = useAddRowTableState<CalendarEventRow>({
    data: calendarEventsData,
    formFieldName: "calendarEvents",
    setFormFieldValue: (name: string, value: any) => form.setFieldValue(name as keyof BusinessInfoFormData, value),
    emptyRowFactory: () => ({ eventName: "", startDate: null, endDate: null }),
  });

  // Define calendar events columns with dependency on handler
  const calendarEventsColumnsWithHandlers: Column<CalendarEventRow>[] = useMemo(() => [
    { key: "eventName", label: "Upcoming Events", validation: { required: false }, width: "50%" },
    {
      key: "startDate",
      label: "Date",
      validation: { required: false },
      width: "50%",
      render: (value: any, row: CalendarEventRow, index: number) => {
        return (
          <DateRangePicker
            startDate={row.startDate}
            endDate={row.endDate}
            onChange={(startDate, endDate) => {
              const updatedData = [...calendarEventsData];
              updatedData[index] = { ...row, startDate, endDate };
              form.setFieldValue("calendarEvents" as keyof BusinessInfoFormData, updatedData);
            }}
            placeholder="Select date"
            className="w-full"
          />
        );
      }
    },
  ], [calendarEventsData, form]);

  return (
    <Card
      id="content-cues"
      variant="profileCard"
      className="py-6 px-4 bg-white border-none mt-6"
    >
      <CardHeader className="pb-4">
        <CardTitle>
          <Typography variant="h4">Content Cues</Typography>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card variant="profileCard">
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">USPs</FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form.Field
              name="usps"
              children={(field: any) => {
                return (
                  <Textarea
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Add the top benefits or features you want customers to notice"
                    className="w-full min-h-[100px] resize-none"
                    disabled
                  />
                );
              }}
            />
          </CardContent>
        </Card>

        <Card variant="profileCard">
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                CTAs (Enter CTA copy along with its destination URL)
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomAddRowTable
              columns={ctaColumns}
              data={ctasData}
              onAddRow={handleAddCTARow}
              onRowChange={handleCTARowChange}
              onDeleteRow={handleCTADeleteRow}
              addButtonText="Add Button"
              onValidationChange={setHasCtaErrors}
              showErrorsWithoutTouch={hasCtaErrors}
            />
          </CardContent>
        </Card>

        <Card variant="profileCard">
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                Brand terms that best describe your business
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form.Field
              name="brandTerms"
              children={(field: any) => {
                return (
                  <Input
                    variant="noBorder"
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="List the words, separating each one with a comma"
                    className="w-full"
                  />
                );
              }}
            />
          </CardContent>
        </Card>

        <Card variant="profileCard">
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                What is the tone of your brand's content?<span className="text-general-muted-foreground pl-1">Select upto 3 per channel.</span>
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form.Field
              name="brandToneSocial"
              children={(socialField: any) => (
                <form.Field
                  name="brandToneWeb"
                  children={(webField: any) => {
                    const toneOptions = [
                      { value: "professional", label: "Professional" },
                      { value: "bold", label: "Bold" },
                      { value: "friendly", label: "Friendly" },
                      { value: "innovative", label: "Innovative" },
                      { value: "playful", label: "Playful" },
                      { value: "trustworthy", label: "Trustworthy" },
                    ];

                    const socialValues = Array.isArray(socialField.state.value)
                      ? socialField.state.value
                      : [];
                    const webValues = Array.isArray(webField.state.value)
                      ? webField.state.value
                      : [];

                    const socialHasError = socialValues.length > 3;
                    const webHasError = webValues.length > 3;
                    const hasError = socialHasError || webHasError;

                    const handleSocialChange = (value: string, checked: boolean) => {
                      let newValues: string[];
                      if (checked) {
                        if (socialValues.length >= 3) {
                          return;
                        }
                        newValues = [...socialValues, value];
                      } else {
                        newValues = socialValues.filter((v: string) => v !== value);
                      }
                      socialField.handleChange(newValues);
                    };

                    const handleWebChange = (value: string, checked: boolean) => {
                      let newValues: string[];
                      if (checked) {
                        if (webValues.length >= 3) {
                          return;
                        }
                        newValues = [...webValues, value];
                      } else {
                        newValues = webValues.filter((v: string) => v !== value);
                      }
                      webField.handleChange(newValues);
                    };

                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card variant="profileCard" className="bg-white border-none ">
                            <CardHeader className="">
                              <CardTitle>
                                <FieldLabel className="gap-0">Social</FieldLabel>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-3 gap-3">
                                {toneOptions.map((option) => {
                                  const isChecked = socialValues.includes(option.value);
                                  return (
                                    <label
                                      key={option.value}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) =>
                                          handleSocialChange(option.value, e.target.checked)
                                        }
                                        disabled={
                                          !isChecked && socialValues.length >= 3
                                        }
                                        className="h-4 w-4 rounded border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer transition-colors aria-invalid:border-destructive"
                                        style={{
                                          backgroundImage: isChecked
                                            ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'20 6 9 17 4 12\'%3E%3C/polyline%3E%3C/svg%3E")'
                                            : "none",
                                          backgroundPosition: "center",
                                          backgroundRepeat: "no-repeat",
                                          backgroundColor: isChecked
                                            ? "var(--foreground)"
                                            : "transparent",
                                        }}
                                      />
                                      <span className="text-sm">{option.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>

                          <Card variant="profileCard" className="bg-white border-none">
                            <CardHeader className="">
                              <CardTitle>
                                <FieldLabel className="gap-0">Web</FieldLabel>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-3 gap-3">
                                {toneOptions.map((option) => {
                                  const isChecked = webValues.includes(option.value);
                                  return (
                                    <label
                                      key={option.value}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) =>
                                          handleWebChange(option.value, e.target.checked)
                                        }
                                        disabled={
                                          !isChecked && webValues.length >= 3
                                        }
                                        className="h-4 w-4 rounded border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer transition-colors aria-invalid:border-destructive"
                                        style={{
                                          backgroundImage: isChecked
                                            ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'20 6 9 17 4 12\'%3E%3C/polyline%3E%3C/svg%3E")'
                                            : "none",
                                          backgroundPosition: "center",
                                          backgroundRepeat: "no-repeat",
                                          backgroundColor: isChecked
                                            ? "var(--foreground)"
                                            : "transparent",
                                        }}
                                      />
                                      <span className="text-sm">{option.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        {hasError && (
                          <div className="mt-4">
                            <FieldError className="text-xs">
                              You can only select upto 3 options.
                            </FieldError>
                          </div>
                        )}
                      </>
                    );
                  }}
                />
              )}
            />

          </CardContent>
        </Card>

        <Card variant="profileCard">
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                Primary stakeholders/key people involved in the business
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomAddRowTable
              columns={stakeholdersColumns}
              data={stakeholdersData}
              onAddRow={handleAddStakeholderRow}
              onRowChange={handleStakeholderRowChange}
              onDeleteRow={handleStakeholderDeleteRow}
              addButtonText="Add Person"
            />
          </CardContent>
        </Card>

        <Card variant="profileCard">
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                Calendar Events
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomAddRowTable
              columns={calendarEventsColumnsWithHandlers}
              data={calendarEventsData}
              onAddRow={handleAddCalendarEventRow}
              onRowChange={handleCalendarEventRowChange}
              onDeleteRow={handleCalendarEventDeleteRow}
              addButtonText="Add Custom Event"
            />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

