"use client";

import React, { useCallback } from "react";
import { useStore } from "@tanstack/react-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { FieldLabel } from "@/components/ui/field";
import {
  ProfileItemLink,
  ProfileListEditor,
  useProfileItemEditor,
  type ProfileListField,
} from "@/components/organisms/profile/ProfileListEditor";

import { CTARow, StakeholderRow } from "@/store/business-store";
import { MicVocal } from "lucide-react";
// import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TagsInput } from "@/components/ui/tags-input";

type BusinessInfoFormData = {
  usps?: string;
  differentiators?: DifferentiatorRow[];
  ctas?: Array<{ buttonText: string; url: string }>;
  ctasSavedIndices?: number[];
  stakeholders?: Array<{ name: string; title: string; role?: string }>;
  stakeholdersSavedIndices?: number[];
  brandToneSocial?: string[];
  brandToneWeb?: string[];
  brandTerms?: string[];
};

type DifferentiatorRow = {
  differentiator: string;
};

interface ContentCuesFormProps {
  form: any; // TanStack Form instance
  embedded?: boolean;
}

const CTA_FIELDS: ProfileListField<CTARow>[] = [
  {
    key: "buttonText",
    label: "Button text",
    placeholder: "E.g. Book a free consultation",
    validation: { required: true },
  },
  {
    key: "url",
    label: "Destination URL",
    placeholder: "https://example.com/contact",
    inputMode: "url",
    validation: { required: true, url: true },
  },
];

const STAKEHOLDER_FIELDS: ProfileListField<StakeholderRow>[] = [
  { key: "name", label: "Name", placeholder: "E.g. Jane Doe" },
  { key: "role", label: "Role", placeholder: "E.g. Owner" },
  { key: "title", label: "Title", placeholder: "E.g. Founder & Lead Designer" },
];

const DIFFERENTIATOR_FIELDS: ProfileListField<DifferentiatorRow>[] = [
  {
    key: "differentiator",
    label: "Differentiator",
    placeholder: "E.g. Same-day service across the metro area",
    validation: { required: true },
  },
];

const emptyCta = (): CTARow => ({ buttonText: "", url: "" });
const emptyStakeholder = (): StakeholderRow => ({ name: "", title: "" });
const emptyDifferentiator = (): DifferentiatorRow => ({
  differentiator: "",
});

function PrimaryWithDetail({
  primary,
  detail,
}: {
  primary: string;
  detail?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-general-foreground">{primary}</p>
      {detail}
    </div>
  );
}

const mutedDetail = (text?: string) =>
  text?.trim() ? (
    <p className="whitespace-pre-line text-sm leading-6 text-general-muted-foreground">
      {text}
    </p>
  ) : null;

export const ContentCuesForm = ({
  form,
  embedded = false,
}: ContentCuesFormProps) => {
  // Subscribe only to specific fields this component cares about
  // Component will only re-render when these fields change
  const differentiatorsData = useStore(
    form.store,
    (state: any) =>
      (state.values?.differentiators || []) as DifferentiatorRow[],
  );
  const ctasData = useStore(
    form.store,
    (state: any) => (state.values?.ctas || []) as CTARow[],
  );
  const stakeholdersData = useStore(
    form.store,
    (state: any) => (state.values?.stakeholders || []) as StakeholderRow[],
  );

  const ctaEditor = useProfileItemEditor();
  const stakeholderEditor = useProfileItemEditor();
  const differentiatorEditor = useProfileItemEditor();

  const handleCtaValidationChange = useCallback(
    (hasErrors: boolean) => {
      form.setFieldMeta("ctas", (prev: any) => ({
        ...prev,
        hasValidationErrors: hasErrors,
      }));
    },
    [form],
  );

  const setListValue =
    (name: keyof BusinessInfoFormData) => (next: unknown[]) =>
      form.setFieldValue(name, next);

  const cardVariant = embedded ? "noBorderShadowCard" : "profileCard";

  const innerContent = (
    <div className="space-y-7">
      <Card variant={cardVariant}>
        <CardHeader className="">
          <CardTitle className="text-sm font-medium leading-normal">
            <FieldLabel className="gap-0 text-sm font-medium leading-normal">
              Differentiators
            </FieldLabel>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full md:w-3/4">
            <ProfileListEditor
              editor={differentiatorEditor}
              items={differentiatorsData}
              fields={DIFFERENTIATOR_FIELDS}
              itemLabel="differentiator"
              emptyItem={emptyDifferentiator}
              onChange={setListValue("differentiators")}
              renderItem={(item) => (
                <PrimaryWithDetail primary={item.differentiator} />
              )}
              getItemTitle={(item) => item.differentiator || "differentiator"}
              emptyMessage="No differentiators yet. Add what sets the business apart."
              showAddButton
            />
          </div>
        </CardContent>
      </Card>

      <Card
        id="ctas"
        tabIndex={-1}
        variant={cardVariant}
        className="outline-none"
      >
        <CardHeader className="">
          <CardTitle className="text-sm font-medium leading-normal">
            <FieldLabel className="gap-0 text-sm font-medium leading-normal">
              CTAs (Enter CTA copy along with its destination URL)
            </FieldLabel>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full md:w-3/4">
            <ProfileListEditor
              editor={ctaEditor}
              items={ctasData}
              fields={CTA_FIELDS}
              itemLabel="CTA"
              emptyItem={emptyCta}
              onChange={setListValue("ctas")}
              renderItem={(cta) => (
                <PrimaryWithDetail
                  primary={cta.buttonText || "Untitled CTA"}
                  detail={
                    cta.url?.trim() ? <ProfileItemLink href={cta.url} /> : null
                  }
                />
              )}
              getItemTitle={(cta) => cta.buttonText || "CTA"}
              emptyMessage="No CTAs yet. Add the button copy and where it should link."
              showAddButton
              onValidationChange={handleCtaValidationChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card variant={cardVariant}>
        <CardHeader className="">
          <CardTitle className="text-sm font-medium leading-normal">
            <FieldLabel className="gap-0 text-sm font-medium leading-normal">
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
          <CardTitle className="text-sm font-medium leading-normal">
            <FieldLabel className="gap-0 text-sm font-medium leading-normal">
              What is the tone of your brand's content?
              <span className="text-general-muted-foreground pl-1">
                Add up to 3 per channel.
              </span>
            </FieldLabel>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full md:w-3/4">
            <div className="flex flex-col gap-3">
              <Card
                variant="profileCard"
                className="bg-white shadow-none p-0 overflow-hidden"
              >
                <CardHeader className="bg-foreground-light pt-2 px-2.5">
                  <CardTitle className="text-xs font-medium leading-normal">
                    <FieldLabel className="gap-0 font-mono text-xs text-muted-foreground">
                      Social
                    </FieldLabel>
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
                          onChange={(next) =>
                            field.handleChange(next.slice(0, 3))
                          }
                          placeholder="Type a social tone and press Enter"
                          maxItems={3}
                        />
                      );
                    }}
                  />
                </CardContent>
              </Card>

              <Card
                variant="profileCard"
                className="bg-white shadow-none p-0 overflow-hidden"
              >
                <CardHeader className="bg-foreground-light pt-2 px-2.5">
                  <CardTitle className="text-xs font-medium leading-normal">
                    <FieldLabel className="gap-0 font-mono text-xs text-muted-foreground">
                      Web
                    </FieldLabel>
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
                          onChange={(next) =>
                            field.handleChange(next.slice(0, 3))
                          }
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
          <CardTitle className="text-sm font-medium leading-normal">
            <FieldLabel className="gap-0 text-sm font-medium leading-normal">
              Primary stakeholders/key people involved in the business
            </FieldLabel>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full md:w-3/4">
            <ProfileListEditor
              editor={stakeholderEditor}
              items={stakeholdersData}
              fields={STAKEHOLDER_FIELDS}
              itemLabel="person"
              emptyItem={emptyStakeholder}
              onChange={setListValue("stakeholders")}
              renderItem={(person) => (
                <PrimaryWithDetail
                  primary={person.name || "Unnamed person"}
                  detail={mutedDetail(person.title)}
                />
              )}
              getItemTitle={(person) => person.name || "person"}
              emptyMessage="No key people yet. Add the founders, owners, or experts behind the business."
              showAddButton
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (embedded) {
    return <div id="content-cues">{innerContent}</div>;
  }

  return (
    <Card
      id="content-cues"
      variant="profileCard"
      className="p-4 bg-white border-none shadow-none mt-6"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <MicVocal
            className="h-[47px] w-[47px] shrink-0 text-[#D4D4D4]"
            strokeWidth={1}
          />
          <div className="space-y-0">
            <CardTitle>
              <Typography variant="h4" className="text-2xl!">
                Content Cues
              </Typography>
            </CardTitle>
            <Typography
              variant="muted"
              className="text-xs text-general-muted-foreground"
            >
              Guides tone, messaging, and calls-to-action so content sounds like
              you and converts better.
            </Typography>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-7">{innerContent}</CardContent>
    </Card>
  );
};
