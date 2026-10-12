"use client";

import React, { useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { OfferingRow } from "@/store/business-store";
import {
  ProfileItemLink,
  ProfileListEditor,
  useProfileItemEditor,
  type ProfileListField,
} from "@/components/organisms/profile/ProfileListEditor";
import { PackageSearch, Plus } from "lucide-react";

interface OfferingsFormProps {
  form: any; // TanStack Form instance
  embedded?: boolean;
  disabled?: boolean;
  validationMessage?: string;
  required?: boolean;
}

const OFFERING_FIELDS: ProfileListField<OfferingRow>[] = [
  {
    key: "name",
    label: "Name",
    placeholder: "E.g. Emergency plumbing repair",
    validation: { required: true },
  },
  {
    key: "pricePositioning",
    label: "Price positioning",
    placeholder: "E.g. Premium, Mid-range, Budget",
  },
  {
    key: "description",
    label: "Description",
    placeholder: "What it is, who it's for, and what makes it worth buying",
    multiline: true,
    rows: 5,
  },
  {
    key: "link",
    label: "Link",
    placeholder: "https://example.com/services/repair",
    inputMode: "url",
    validation: { url: true },
  },
];

const emptyOffering = (): OfferingRow => ({
  name: "",
  description: "",
  link: "",
  pricePositioning: "",
});

function OfferingSummary({ offering }: { offering: OfferingRow }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-general-foreground">
          {offering.name}
        </p>
        {offering.pricePositioning?.trim() ? (
          <Badge variant="outline">{offering.pricePositioning}</Badge>
        ) : null}
      </div>
      {offering.description?.trim() ? (
        <p className="whitespace-pre-line text-sm leading-6 text-general-muted-foreground">
          {offering.description}
        </p>
      ) : null}
      {offering.link?.trim() ? <ProfileItemLink href={offering.link} /> : null}
    </div>
  );
}

export const OfferingsForm = ({
  form,
  embedded = false,
  disabled = false,
  validationMessage,
  required = true,
}: OfferingsFormProps) => {
  const offeringsData = useStore(
    form.store,
    (state: any) => (state.values?.offeringsList || []) as OfferingRow[]
  );
  const editor = useProfileItemEditor();

  const handleValidationChange = useCallback(
    (hasErrors: boolean) => {
      form.setFieldMeta("offeringsList", (prev: any) => ({
        ...prev,
        hasValidationErrors: hasErrors,
      }));
    },
    [form]
  );

  const innerContent = (
    <div id="offeringsList" tabIndex={-1} className="space-y-3 outline-none">
      <Card variant="noBorderShadowCard">
        <CardHeader className={embedded ? "px-0 pt-0 pb-2" : ""}>
          <div className="flex items-center">
            <CardTitle className="text-sm font-medium leading-normal">
              <FieldLabel className="gap-0 text-sm font-medium leading-normal">
                {required ? (
                  <span className="text-destructive mr-0.5">*</span>
                ) : null}
                What products and services does your business sell?
              </FieldLabel>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className={embedded ? "p-0" : "space-y-4"}>
          <ProfileListEditor
            editor={editor}
            items={offeringsData}
            fields={OFFERING_FIELDS}
            itemLabel="offering"
            emptyItem={emptyOffering}
            onChange={(next) => form.setFieldValue("offeringsList", next)}
            renderItem={(offering) => <OfferingSummary offering={offering} />}
            getItemTitle={(offering) => offering.name || "offering"}
            emptyMessage="No offerings yet. Add the products or services you sell."
            showAddButton={!embedded}
            showEmptyError={Boolean(validationMessage)}
            onValidationChange={handleValidationChange}
            disabled={disabled}
          />
        </CardContent>
      </Card>
    </div>
  );

  if (embedded) {
    return (
      <div id="offerings-section" className="space-y-3">
        <div className="sticky -top-4 z-20 -mx-4 -mt-4 flex items-center justify-between gap-3 border-b border-general-border/30 bg-white px-4 py-3 sm:-mx-6 sm:px-6">
          <h2 className="text-base font-semibold text-general-foreground">
            Offerings
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={editor.openAdd}
            disabled={disabled}
            className="h-8 shrink-0 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add offering
          </Button>
        </div>
        {innerContent}
      </div>
    );
  }

  return (
    <Card
      id="offerings-section"
      variant="profileCard"
      className="p-4 bg-transparent border-none shadow-none mt-6"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <PackageSearch className="h-[47px] w-[47px] shrink-0 text-[#D4D4D4]" strokeWidth={1} />
          <div className="space-y-0">
            <CardTitle>
              <Typography variant="h4" className="text-2xl!">Offerings</Typography>
            </CardTitle>
            <Typography variant="muted" className="text-xs text-general-muted-foreground">
              Defines what you actually sell so recommendations focus on revenue-driving products and services.
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
