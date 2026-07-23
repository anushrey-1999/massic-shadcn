"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GenericInput } from "@/components/ui/generic-input";
import { TagsInput } from "@/components/ui/tags-input";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { Boxes, Laptop, Store } from "lucide-react";
import { useBusinessStore } from "@/store/business-store";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@tanstack/react-form";
import {
  CustomAddRowTable,
  type Column,
} from "@/components/organisms/CustomAddRowTable";

type BusinessInfoFormData = {
  website: string;
  legalName?: string;
  businessName: string;
  foundingDate?: string;
  logoUrl?: string;
  businessDescription: string;
  primaryLocation: string;
  businessCategory?: string;
  serviceAreaType?: string;
  serviceAreas?: string[];
  serviceType: "physical" | "online" | "both";
  lifetimeValue: "" | "high" | "low";
  b2bB2c?: string;
  offerings: "products" | "services" | "both";
  offeringsList?: Array<{
    name: string;
    description: string;
    link: string;
    pricePositioning?: string;
  }>;
  detailedLocations?: Array<Record<string, string>>;
  licensesCompliance?: string[];
  awardsCertifications?: string[];
  reviewRating?: string;
  reviewCount?: string;
  testimonials?: string[];
  colorsFontsCss?: string;
  imagePhotoLibrary?: Array<string | { alt?: string; url: string }>;
  socialProfiles?: Array<Record<string, string>>;
  directoryProfiles?: Array<Record<string, string>>;
  supportEmail?: string;
  commsEmail?: string;
};

const SERVICE_AREA_TYPE_OPTIONS = [
  { value: "international", label: "International" },
  { value: "national", label: "National" },
  { value: "state_regional", label: "State-Regional" },
  { value: "city_local", label: "City/Local" },
] as const;

interface BusinessInfoFormProps {
  form: any; // TanStack Form instance
  disableWebsiteLock?: boolean;
  headerAction?: React.ReactNode;
  embedded?: boolean;
  primaryLocationAction?: React.ReactNode;
  embeddedVariant?: "full" | "autofillGate";
  disabledFields?: Partial<Record<keyof BusinessInfoFormData, boolean>>;
}

export const BusinessInfoForm = React.memo(({
  form,
  disableWebsiteLock = false,
  headerAction,
  embedded = false,
  primaryLocationAction,
  embeddedVariant = "full",
  disabledFields,
}: BusinessInfoFormProps) => {
  const websiteValue = useStore(form.store, (state: any) => state.values?.website || "");
  const serviceAreasValue = useStore(form.store, (state: any) => state.values?.serviceAreas || []);
  const detailedLocationsValue = useStore(form.store, (state: any) => state.values?.detailedLocations || []);
  const licensesComplianceValue = useStore(form.store, (state: any) => state.values?.licensesCompliance || []);
  const awardsCertificationsValue = useStore(form.store, (state: any) => state.values?.awardsCertifications || []);
  const testimonialsValue = useStore(form.store, (state: any) => state.values?.testimonials || []);
  const colorsFontsCssValue = useStore(form.store, (state: any) => state.values?.colorsFontsCss || "");
  const imagePhotoLibraryValue = useStore(form.store, (state: any) => state.values?.imagePhotoLibrary || []);
  const socialProfilesValue = useStore(form.store, (state: any) => state.values?.socialProfiles || []);
  const directoryProfilesValue = useStore(form.store, (state: any) => state.values?.directoryProfiles || []);
  const isWebsiteLocked =
    !disableWebsiteLock && String(websiteValue || "").trim().length > 0;

  const updateRowField = React.useCallback(
    (fieldName: keyof BusinessInfoFormData, rowIndex: number, field: string, value: string) => {
      const currentRows = Array.isArray(form.state.values?.[fieldName])
        ? [...form.state.values[fieldName]]
        : [];
      currentRows[rowIndex] = {
        ...(currentRows[rowIndex] || {}),
        [field]: value,
      };
      form.setFieldValue(fieldName as any, currentRows as any);
    },
    [form]
  );

  const addRow = React.useCallback(
    (fieldName: keyof BusinessInfoFormData, emptyRow: Record<string, string>) => {
      const currentRows = Array.isArray(form.state.values?.[fieldName])
        ? form.state.values[fieldName]
        : [];
      form.setFieldValue(fieldName as any, [...currentRows, emptyRow] as any);
    },
    [form]
  );

  const deleteRow = React.useCallback(
    (fieldName: keyof BusinessInfoFormData, rowIndex: number) => {
      const currentRows = Array.isArray(form.state.values?.[fieldName])
        ? form.state.values[fieldName]
        : [];
      form.setFieldValue(
        fieldName as any,
        currentRows.filter((_: unknown, index: number) => index !== rowIndex) as any
      );
    },
    [form]
  );

  const openExternalLink = React.useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const detailSection = React.useCallback(
    (title: string, children: React.ReactNode, action?: React.ReactNode) => (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Typography variant="h4" className="text-base font-semibold">
            {title}
          </Typography>
          {action}
        </div>
        {children}
      </div>
    ),
    []
  );

  const detailedLocationColumns = React.useMemo<Column<Record<string, string>>[]>(
    () => [
      { key: "streetAddress", label: "Street Address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zip", label: "ZIP" },
      { key: "country", label: "Country" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "mapLink", label: "Map Link", validation: { url: true } },
      { key: "hours", label: "Hours" },
      { key: "holidayHours", label: "Special Hours" },
      { key: "primaryFlag", label: "Primary" },
    ],
    []
  );

  const socialProfileColumns = React.useMemo<Column<Record<string, string>>[]>(
    () => [
      { key: "url", label: "URL", validation: { url: true } },
    ],
    []
  );

  const directoryProfileColumns = React.useMemo<Column<Record<string, string>>[]>(
    () => [
      { key: "url", label: "URL", validation: { url: true } },
    ],
    []
  );

  const imageLibraryItems = React.useMemo(() => {
    const unwrapValue = (value: unknown): unknown => {
      if (value && typeof value === "object" && "value" in (value as Record<string, unknown>)) {
        return (value as Record<string, unknown>).value;
      }
      return value;
    };

    return (Array.isArray(imagePhotoLibraryValue) ? imagePhotoLibraryValue : [])
      .map((item: unknown) => {
        const unwrappedItem = unwrapValue(item);
        if (typeof unwrappedItem === "string") {
          const url = unwrappedItem.trim();
          return url ? { label: url, url } : null;
        }
        if (unwrappedItem && typeof unwrappedItem === "object") {
          const image = unwrappedItem as Record<string, unknown>;
          const url = String(unwrapValue(image.url) ?? "").trim();
          const alt = String(unwrapValue(image.alt) ?? "").trim();
          return url ? { label: alt || url, url } : null;
        }
        return null;
      })
      .filter((item): item is { label: string; url: string } => Boolean(item));
  }, [imagePhotoLibraryValue]);

  const brandAssetItems = React.useMemo(() => {
    const rawValue = String(colorsFontsCssValue ?? "").trim();
    if (!rawValue) return [];

    const parsedItems = rawValue
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const isUrl = /^https?:\/\//i.test(line);
        // Only attempt prefix:value split when the line is NOT a URL
        const prefixed = !isUrl ? line.match(/^([^:]+):\s*(.+)$/) : null;
        const prefix = prefixed?.[1]?.trim().toLowerCase();
        const value = isUrl ? line : (prefixed?.[2] || line).trim();
        const lowerValue = value.toLowerCase();
        const kind =
          prefix?.includes("color")
            ? "Colors"
            : prefix?.includes("font") || lowerValue.includes("font")
              ? "Fonts"
              : prefix?.includes("css") || lowerValue.includes(".css") || isUrl
                ? "CSS"
                : "Brand Asset";

        return { kind, value, url: isUrl ? value : undefined };
      });

    const totals = parsedItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.kind] = (acc[item.kind] || 0) + 1;
      return acc;
    }, {});
    const seen: Record<string, number> = {};

    return parsedItems.map((item) => {
      seen[item.kind] = (seen[item.kind] || 0) + 1;
      return {
        ...item,
        label: totals[item.kind] > 1 ? `${item.kind} ${seen[item.kind]}` : item.kind,
      };
    });
  }, [colorsFontsCssValue]);

  // Own Zustand selectors - isolated selector for better performance
  const { locationOptions, locationsLoading } = useBusinessStore(
    useShallow((state) => ({
      locationOptions: state.profileForm.locationOptions,
      locationsLoading: state.profileForm.locationsLoading,
    }))
  );

  const gridContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          {/* Row 1 */}
          <Card variant="profileCard">
            <CardContent>
              <div className="w-1/2">
                <GenericInput<BusinessInfoFormData>
                  form={form as any}
                  fieldName="website"
                  type="url"
                  inputVariant="noBorder"
                  label="Website"
                  required={true}
                  placeholder="Provide the official url of your business website"
                  disabled={isWebsiteLocked}
                />
              </div>
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <div className="w-1/2">
                <GenericInput<BusinessInfoFormData>
                  form={form as any}
                  fieldName="businessName"
                  type="input"
                  label="Business Name"
                  inputVariant="noBorder"
                  required
                  placeholder="Provide the brand name of your business"
                />
              </div>
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <div className="w-1/2">
                <GenericInput<BusinessInfoFormData>
                  form={form as any}
                  fieldName="businessCategory"
                  type="input"
                  inputVariant="noBorder"
                  label="Business Category"
                  placeholder="E.g. Plumbing Services"
                />
              </div>
            </CardContent>
          </Card>

          {/* Row 2 */}
          <Card variant="profileCard">
            <CardContent>
              <div className="w-1/2">
                <GenericInput<BusinessInfoFormData>
                  form={form as any}
                  fieldName="businessDescription"
                  type="textarea"
                  inputVariant="noBorder"
                  label="Business Description"
                  placeholder="Add a short overview of your business, products, or services."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <div className="w-1/2">
                <GenericInput<BusinessInfoFormData>
                  form={form as any}
                  fieldName="primaryLocation"
                  type="location-select"
                  label="Primary Location"
                  required={true}
                  inputVariant="noBorder"
                  placeholder={
                    locationsLoading
                      ? "Loading locations..."
                      : "Where are your customers primarily located?"
                  }
                  options={locationOptions}
                  disabled={locationsLoading}
                  loading={locationsLoading}
                />
              </div>
            </CardContent>
          </Card>
          {/* Row 3 */}
          <Card variant="profileCard">
            <CardContent>
              <div className="w-1/2">
                <GenericInput<BusinessInfoFormData>
                  form={form as any}
                  fieldName="serviceType"
                  type="radio-cards"
                  label="Market"
                  required={true}
                  orientation="horizontal"
                  radioCardSize="sm"
                  radioCardIcons={{
                    physical: <Store className="size-7" strokeWidth={1.5} />,
                    online: <Laptop className="size-7" strokeWidth={1.5} />,
                    both: <Boxes className="size-7" strokeWidth={1.5} />,
                  }}
                  options={[
                    { value: "physical", label: "Local" },
                    { value: "online", label: "Online" },
                    { value: "both", label: "Hybrid" },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <div className="w-1/2">
                <GenericInput<BusinessInfoFormData>
                  form={form as any}
                  fieldName="lifetimeValue"
                  type="radio-cards"
                  label="Lifetime Value"
                  required={false}
                  orientation="horizontal"
                  radioCardSize="sm"
                  options={[
                    { value: "high", label: "High" },
                    { value: "low", label: "Low" },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <div className="w-3/4">
                <GenericInput<BusinessInfoFormData>
                  form={form as any}
                  fieldName="serviceAreaType"
                  type="select"
                  inputVariant="noBorder"
                  label="Service Area Type"
                  required
                  placeholder="Select service area type"
                  options={[...SERVICE_AREA_TYPE_OPTIONS]}
                />
              </div>
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <div className="w-3/4">
                <Typography variant="small" className="mb-2 block text-sm font-medium">
                  Service Areas
                </Typography>
                <TagsInput
                  value={Array.isArray(serviceAreasValue) ? serviceAreasValue : []}
                  onChange={(next) => form.setFieldValue("serviceAreas" as any, next as any)}
                  placeholder="Type a service area and press Enter"
                />
              </div>
            </CardContent>
          </Card>
        </div>
  );

  if (embedded && embeddedVariant === "autofillGate") {
    return (
      <div id="business-info" className="flex w-full flex-col gap-6">
        <GenericInput<BusinessInfoFormData>
          form={form as any}
          fieldName="website"
          type="url"
          label="Website"
          fieldClassName="gap-0"
          required={true}
          placeholder="Provide the official url of your business website"
          disabled={isWebsiteLocked || disabledFields?.website}
        />
        <GenericInput<BusinessInfoFormData>
          form={form as any}
          fieldName="primaryLocation"
          type="location-select"
          label="Primary Location"
          fieldClassName="gap-0"
          required={true}
          placeholder={
            locationsLoading
              ? "Loading locations..."
              : "Where are your customers primarily located?"
          }
          options={locationOptions}
          disabled={locationsLoading || disabledFields?.primaryLocation}
          loading={locationsLoading}
        />
        <GenericInput<BusinessInfoFormData>
          form={form as any}
          fieldName="serviceAreaType"
          type="select"
          label="Service-area type"
          fieldClassName="gap-0"
          required
          placeholder="Select service area type"
          options={[...SERVICE_AREA_TYPE_OPTIONS]}
          disabled={disabledFields?.serviceAreaType}
        />
        {primaryLocationAction && (
          <div className="flex flex-col gap-2 pt-1">
            {primaryLocationAction}
          </div>
        )}
      </div>
    );
  }

  const embeddedContent = (
    <div id="business-info" className="flex flex-col gap-7">
      {detailSection(
        "Identity",
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <GenericInput<BusinessInfoFormData>
            form={form as any}
            fieldName="legalName"
            type="input"
            label="Legal Business Name"
            placeholder="Registered legal business name"
            disabled={disabledFields?.legalName}
          />
          <GenericInput<BusinessInfoFormData>
            form={form as any}
            fieldName="foundingDate"
            type="input"
            label="Year Founded"
            placeholder="E.g. 2018"
            disabled={disabledFields?.foundingDate}
          />
          <GenericInput<BusinessInfoFormData>
            form={form as any}
            fieldName="logoUrl"
            type="url"
            label="Logo URL"
            placeholder="https://example.com/logo.png"
            disabled={disabledFields?.logoUrl}
          />
        </div>,
        primaryLocationAction
      )}
      <div className="w-1/2">
        <GenericInput<BusinessInfoFormData>
          form={form as any}
          fieldName="website"
          type="url"
          label="Website"
          required={true}
          placeholder="Provide the official url of your business website"
          disabled={isWebsiteLocked || disabledFields?.website}
        />
      </div>
      <div className="w-1/2">
        <GenericInput<BusinessInfoFormData>
          form={form as any}
          fieldName="primaryLocation"
          type="location-select"
          label="Primary Location"
          required={true}
          placeholder={
            locationsLoading
              ? "Loading locations..."
              : "Where are your customers primarily located?"
          }
          options={locationOptions}
          disabled={locationsLoading || disabledFields?.primaryLocation}
          loading={locationsLoading}
        />
      </div>
      <div className="w-1/2">
        <GenericInput<BusinessInfoFormData>
          form={form as any}
          fieldName="serviceAreaType"
          type="select"
          label="Service Area Type"
          required
          placeholder="Select service area type"
          options={[...SERVICE_AREA_TYPE_OPTIONS]}
          disabled={disabledFields?.serviceAreaType}
        />
      </div>
      <div className="w-1/2">
        <GenericInput<BusinessInfoFormData>
          form={form as any}
          fieldName="businessName"
          type="input"
          label="Business Name"
          required
          placeholder="Provide the brand name of your business"
          disabled={disabledFields?.businessName}
        />
      </div>
      <div className="w-1/2">
        <GenericInput<BusinessInfoFormData>
          form={form as any}
          fieldName="businessCategory"
          type="input"
          label="Business Category"
          placeholder="E.g. Plumbing Services"
          disabled={disabledFields?.businessCategory}
        />
      </div>
      <div className="w-1/2">
        <GenericInput<BusinessInfoFormData>
          form={form as any}
          fieldName="serviceType"
          type="radio-cards"
          label="Market"
          required={true}
          orientation="horizontal"
          disabled={disabledFields?.serviceType}
          radioCardSize="sm"
          radioCardIcons={{
            physical: <Store className="size-7" strokeWidth={1.5} />,
            online: <Laptop className="size-7" strokeWidth={1.5} />,
            both: <Boxes className="size-7" strokeWidth={1.5} />,
          }}
          options={[
            { value: "physical", label: "Local" },
            { value: "online", label: "Online" },
            { value: "both", label: "Hybrid" },
          ]}
        />
      </div>
      {detailSection(
        "Classification",
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <GenericInput<BusinessInfoFormData>
            form={form as any}
            fieldName="b2bB2c"
            type="select"
            label="B2B / B2C"
            placeholder="Select audience"
            options={[
              { value: "b2b", label: "B2B" },
              { value: "b2c", label: "B2C" },
              { value: "both", label: "Both" },
            ]}
            disabled={disabledFields?.b2bB2c}
          />
        </div>
      )}
      <div className="w-3/4">
        <Typography variant="small" className="mb-2 block text-sm font-medium">
          Service Areas
        </Typography>
        <TagsInput
          value={Array.isArray(serviceAreasValue) ? serviceAreasValue : []}
          onChange={(next) => form.setFieldValue("serviceAreas" as any, next as any)}
          placeholder="Type a service area and press Enter"
          disabled={disabledFields?.serviceAreas}
        />
      </div>
      <div className="w-1/2">
        <GenericInput<BusinessInfoFormData>
          form={form as any}
          fieldName="lifetimeValue"
          type="radio-cards"
          label="Lifetime Value"
          required={false}
          orientation="horizontal"
          disabled={disabledFields?.lifetimeValue}
          radioCardSize="sm"
          options={[
            { value: "high", label: "High" },
            { value: "low", label: "Low" },
          ]}
        />
      </div>
      {detailSection(
        "Locations",
        <CustomAddRowTable
          columns={detailedLocationColumns}
          data={Array.isArray(detailedLocationsValue) ? detailedLocationsValue : []}
          onAddRow={() =>
            addRow("detailedLocations", {
              streetAddress: "",
              city: "",
              state: "",
              zip: "",
              country: "",
              phone: "",
              email: "",
              mapLink: "",
              hours: "",
              holidayHours: "",
              primaryFlag: "",
            })
          }
          onRowChange={(rowIndex, field, value) =>
            updateRowField("detailedLocations", rowIndex, field, value)
          }
          onDeleteRow={(rowIndex) => deleteRow("detailedLocations", rowIndex)}
          addButtonText="Add Location"
          variant="card"
        />
      )}
      {detailSection(
        "Trust & People",
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            <div>
              <Typography variant="small" className="mb-2 block text-sm font-medium">
                Licenses / Compliance
              </Typography>
              <TagsInput
                value={Array.isArray(licensesComplianceValue) ? licensesComplianceValue : []}
                onChange={(next) => form.setFieldValue("licensesCompliance" as any, next as any)}
                placeholder="Type a license or compliance item and press Enter"
              />
            </div>
            <div>
              <Typography variant="small" className="mb-2 block text-sm font-medium">
                Awards / Certifications / Affiliations
              </Typography>
              <TagsInput
                value={Array.isArray(awardsCertificationsValue) ? awardsCertificationsValue : []}
                onChange={(next) => form.setFieldValue("awardsCertifications" as any, next as any)}
                placeholder="Type an award or certification and press Enter"
              />
            </div>
            <GenericInput<BusinessInfoFormData>
              form={form as any}
              fieldName="reviewRating"
              type="input"
              label="Reviews — Rating"
              placeholder="E.g. 4.8"
              disabled={disabledFields?.reviewRating}
            />
            <GenericInput<BusinessInfoFormData>
              form={form as any}
              fieldName="reviewCount"
              type="input"
              label="Reviews — Count"
              placeholder="E.g. 124"
              disabled={disabledFields?.reviewCount}
            />
            <div className="md:col-span-2">
              <Typography variant="small" className="mb-2 block text-sm font-medium">
                Testimonials
              </Typography>
              <TagsInput
                value={Array.isArray(testimonialsValue) ? testimonialsValue : []}
                onChange={(next) => form.setFieldValue("testimonials" as any, next as any)}
                placeholder="Type a testimonial and press Enter"
              />
            </div>
          </div>
        </div>
      )}
      {detailSection(
        "Brand Assets",
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <div>
            <Typography variant="small" className="mb-2 block text-sm font-medium">
              Colors / Fonts / CSS
            </Typography>
            {brandAssetItems.length > 0 ? (
              <div className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-white px-3 py-2 shadow-xs">
                {brandAssetItems.map((asset, index) => (
                  asset.url ? (
                    <button
                      key={`${asset.kind}-${asset.value}-${index}`}
                      type="button"
                      title={asset.value}
                      onClick={() => openExternalLink(asset.url!)}
                      className={cn(
                        badgeVariants({ variant: "outline" }),
                        "max-w-full rounded-full px-2 py-1 text-xs hover:text-general-primary cursor-pointer"
                      )}
                    >
                      <span className="truncate">{asset.label}</span>
                    </button>
                  ) : (
                    <Badge
                      key={`${asset.kind}-${asset.value}-${index}`}
                      variant="outline"
                      className="max-w-full rounded-full px-2 py-1 text-xs"
                      title={asset.value}
                    >
                      <span className="truncate">{asset.label}</span>
                    </Badge>
                  )
                ))}
              </div>
            ) : (
              <Typography variant="small" className="text-general-muted-foreground">
                No brand assets found.
              </Typography>
            )}
          </div>
          <div>
            <Typography variant="small" className="mb-2 block text-sm font-medium">
              Image / Photo Library
            </Typography>
            {imageLibraryItems.length > 0 ? (
              <div className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-white px-3 py-2 shadow-xs">
                {imageLibraryItems.map((image, index) => (
                  <button
                    key={`${image.url}-${index}`}
                    type="button"
                    title={image.url}
                    onClick={() => openExternalLink(image.url)}
                    className={cn(
                      badgeVariants({ variant: "outline" }),
                      "max-w-full rounded-full px-2 py-1 text-xs hover:text-general-primary cursor-pointer"
                    )}
                  >
                    <span className="truncate">{image.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <Typography variant="small" className="text-general-muted-foreground">
                No images found.
              </Typography>
            )}
          </div>
        </div>
      )}
      {detailSection(
        "Channels & Profiles",
        <div className="flex flex-col gap-5">
          <CustomAddRowTable
            columns={socialProfileColumns}
            data={Array.isArray(socialProfilesValue) ? socialProfilesValue : []}
            onAddRow={() => addRow("socialProfiles", { url: "" })}
            onRowChange={(rowIndex, field, value) =>
              updateRowField("socialProfiles", rowIndex, field, value)
            }
            onDeleteRow={(rowIndex) => deleteRow("socialProfiles", rowIndex)}
            addButtonText="Add Social Profile"
            variant="card"
          />
          <CustomAddRowTable
            columns={directoryProfileColumns}
            data={Array.isArray(directoryProfilesValue) ? directoryProfilesValue : []}
            onAddRow={() => addRow("directoryProfiles", { url: "" })}
            onRowChange={(rowIndex, field, value) =>
              updateRowField("directoryProfiles", rowIndex, field, value)
            }
            onDeleteRow={(rowIndex) => deleteRow("directoryProfiles", rowIndex)}
            addButtonText="Add Directory Profile"
            variant="card"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            <GenericInput<BusinessInfoFormData>
              form={form as any}
              fieldName="supportEmail"
              type="email"
              label="Support Email"
              placeholder="support@example.com"
              disabled={disabledFields?.supportEmail}
            />
            <GenericInput<BusinessInfoFormData>
              form={form as any}
              fieldName="commsEmail"
              type="email"
              label="Comms Email"
              placeholder="reports@example.com"
              disabled={disabledFields?.commsEmail}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return embeddedContent;
  }

  return (
    <Card
      id="business-info"
      variant="profileCard"
      className="p-4 bg-white border-none shadow-none"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Store className="h-[47px] w-[47px] shrink-0 text-[#D4D4D4]" strokeWidth={1} />
            <div className="space-y-0">
              <CardTitle>
                <Typography variant="h4" className="text-2xl!">Business Info</Typography>
              </CardTitle>
              <Typography variant="muted" className="text-xs text-general-muted-foreground">
                Helps us understand who you are and how to tailor insights, benchmarks, and strategy to your business.
              </Typography>
            </div>
          </div>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent>
        {gridContent}
      </CardContent>
    </Card>
  );
});

BusinessInfoForm.displayName = "BusinessInfoForm";
