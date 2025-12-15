"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CustomAddRowTable, Column } from "@/components/organisms/CustomAddRowTable";
import React from "react";
import { AlertCircle } from "lucide-react";

type CTARow = {
  buttonText: string;
  url: string;
};

type StakeholderRow = {
  name: string;
  title: string;
};

interface ContentCuesCardProps {
  form: any; // TanStack Form instance
  ctaColumns: Column<CTARow>[];
  ctasData: CTARow[];
  ctasSavedRowIndices: Set<number>;
  onAddCTARow: () => void;
  onCTARowChange: (rowIndex: number, field: string, value: string) => void;
  onCTADeleteRow: (rowIndex: number) => void;
  onCTASaveRow: (rowIndex: number, row: CTARow) => void;
  stakeholdersColumns: Column<StakeholderRow>[];
  stakeholdersData: StakeholderRow[];
  stakeholdersSavedRowIndices: Set<number>;
  onAddStakeholderRow: () => void;
  onStakeholderRowChange: (rowIndex: number, field: string, value: string) => void;
  onStakeholderDeleteRow: (rowIndex: number) => void;
  onStakeholderSaveRow: (rowIndex: number, row: StakeholderRow) => void;
}

const ContentCuesCard = ({
  form,
  ctaColumns,
  ctasData,
  ctasSavedRowIndices,
  onAddCTARow,
  onCTARowChange,
  onCTADeleteRow,
  onCTASaveRow,
  stakeholdersColumns,
  stakeholdersData,
  stakeholdersSavedRowIndices,
  onAddStakeholderRow,
  onStakeholderRowChange,
  onStakeholderDeleteRow,
  onStakeholderSaveRow,
}: ContentCuesCardProps) => {
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
                // Convert array to comma-separated string for display
                const displayValue = Array.isArray(field.state.value)
                  ? field.state.value.join(", ")
                  : "";

                const handleChange = (
                  e: React.ChangeEvent<HTMLInputElement>
                ) => {
                  const inputValue = e.target.value;
                  // Split by comma, trim each value, and filter out empty strings
                  const uspsArray = inputValue
                    .split(",")
                    .map((item) => item.trim())
                    .filter((item) => item.length > 0);
                  field.handleChange(uspsArray);
                };

                return (
                  <Input
                    variant="noBorder"
                    value={displayValue}
                    onChange={handleChange}
                    placeholder="Add the top benefits or features you want customers to notice"
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
                CTAs (Enter CTA copy along with its destination URL)
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomAddRowTable
              columns={ctaColumns}
              data={ctasData}
              onAddRow={onAddCTARow}
              onRowChange={onCTARowChange}
              onDeleteRow={onCTADeleteRow}
              onSaveRow={onCTASaveRow}
              savedRowIndices={ctasSavedRowIndices}
              addButtonText="Add Button"
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
                // Convert array to comma-separated string for display
                const displayValue = Array.isArray(field.state.value)
                  ? field.state.value.join(", ")
                  : "";

                const handleChange = (
                  e: React.ChangeEvent<HTMLInputElement>
                ) => {
                  const inputValue = e.target.value;
                  // Split by comma, trim each value, and filter out empty strings
                  const brandTermsArray = inputValue
                    .split(",")
                    .map((item) => item.trim())
                    .filter((item) => item.length > 0);
                  field.handleChange(brandTermsArray);
                };

                return (
                  <Input
                    variant="noBorder"
                    value={displayValue}
                    onChange={handleChange}
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
                What is the tone of your brand's content? Select upto 3 per channel.
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
             <div className="mt-4 flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span>You can only select upto 3 options each.</span>
                  </div>
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
              onAddRow={onAddStakeholderRow}
              onRowChange={onStakeholderRowChange}
              onDeleteRow={onStakeholderDeleteRow}
              onSaveRow={onStakeholderSaveRow}
              savedRowIndices={stakeholdersSavedRowIndices}
              addButtonText="Add Person"
            />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default ContentCuesCard;
