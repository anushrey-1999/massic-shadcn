"use client";

import React from "react";
import { useStore } from "@tanstack/react-form";
import { Mail, MapPin, Phone, Plus } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  ProfileItemLink,
  ProfileListEditor,
  useProfileItemEditor,
  type ProfileListField,
} from "@/components/organisms/profile/ProfileListEditor";

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

const LOCATION_FIELDS: ProfileListField<StructuredLocationRow>[] = [
  {
    key: "name",
    label: "Location name",
    placeholder: "E.g. Downtown office",
  },
  {
    key: "streetAddress",
    label: "Street address",
    placeholder: "123 Main St, Suite 200",
    group: "Address",
  },
  { key: "city", label: "City", span: 2, group: "Address" },
  { key: "state", label: "State / region", span: 2, group: "Address" },
  { key: "zip", label: "Postal code", span: 2, group: "Address" },
  { key: "country", label: "Country", span: 3, group: "Address" },
  {
    key: "phone",
    label: "Phone",
    placeholder: "+1 555 123 4567",
    inputMode: "tel",
    span: 3,
    group: "Contact",
  },
  {
    key: "email",
    label: "Email",
    placeholder: "hello@example.com",
    inputMode: "email",
    span: 3,
    group: "Contact",
  },
  {
    key: "mapLink",
    label: "Map URL",
    placeholder: "https://maps.google.com/...",
    inputMode: "url",
    validation: { url: true },
    group: "Contact",
  },
];

const emptyLocation = (): StructuredLocationRow => ({
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  phone: "",
  email: "",
  mapLink: "",
});

const clean = (value?: string) => (value ?? "").trim();

function formatAddress(location: StructuredLocationRow): string {
  const stateZip = [clean(location.state), clean(location.zip)]
    .filter(Boolean)
    .join(" ");
  return [
    clean(location.streetAddress),
    clean(location.city),
    stateZip,
    clean(location.country),
  ]
    .filter(Boolean)
    .join(", ");
}

function locationTitle(location: StructuredLocationRow): string {
  return (
    clean(location.name) ||
    clean(location.city) ||
    clean(location.streetAddress) ||
    "Unnamed location"
  );
}

function LocationSummary({ location }: { location: StructuredLocationRow }) {
  const address = formatAddress(location);
  const title = locationTitle(location);
  const phone = clean(location.phone);
  const email = clean(location.email);
  const mapLink = clean(location.mapLink);
  const hasContact = Boolean(phone || email || mapLink);

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-general-foreground">{title}</p>
      {address && address !== title ? (
        <p className="text-sm leading-6 text-general-muted-foreground">
          {address}
        </p>
      ) : null}
      {hasContact ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {phone ? (
            <a
              href={`tel:${phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-1 text-sm text-general-muted-foreground hover:text-general-foreground hover:underline"
            >
              <Phone className="size-3.5 shrink-0" aria-hidden="true" />
              {phone}
            </a>
          ) : null}
          {email ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex min-w-0 items-center gap-1 text-sm text-general-muted-foreground hover:text-general-foreground hover:underline"
            >
              <Mail className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{email}</span>
            </a>
          ) : null}
          {mapLink ? (
            <ProfileItemLink href={mapLink} label="View on map" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const LocationsForm = ({
  form,
  embedded = false,
}: LocationsFormProps) => {
  const locations = useStore(
    form.store,
    (state: any) =>
      (state.values?.detailedLocations || []) as StructuredLocationRow[]
  );
  const editor = useProfileItemEditor();

  const cardVariant = embedded ? "noBorderShadowCard" : "profileCard";
  const content = (
    <Card variant={cardVariant}>
      <CardHeader className={embedded ? "px-0 pt-0 pb-2" : undefined}>
        <CardTitle className="text-sm font-medium leading-normal">
          <FieldLabel className="gap-0 text-sm font-medium leading-normal">
            Addresses from which your business operates
          </FieldLabel>
        </CardTitle>
      </CardHeader>
      <CardContent className={embedded ? "p-0" : undefined}>
        <ProfileListEditor
          editor={editor}
          items={locations}
          fields={LOCATION_FIELDS}
          itemLabel="location"
          emptyItem={emptyLocation}
          onChange={(next) => form.setFieldValue("detailedLocations", next)}
          renderItem={(location) => <LocationSummary location={location} />}
          getItemTitle={locationTitle}
          emptyMessage="No locations yet. Add the addresses your business operates from."
          showAddButton={!embedded}
        />
      </CardContent>
    </Card>
  );

  if (embedded) {
    return (
      <div id="locations-addresses" className="space-y-3">
        <div className="sticky -top-4 z-20 -mx-4 -mt-4 flex items-center justify-between gap-3 border-b border-general-border/30 bg-white px-4 py-3 sm:-mx-6 sm:px-6">
          <h2 className="text-base font-semibold text-general-foreground">
            Locations
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={editor.openAdd}
            className="h-8 shrink-0 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add location
          </Button>
        </div>
        {content}
      </div>
    );
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
