"use client";

import * as React from "react";
import { ChevronDown, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { WebflowCollection, WebflowCollectionField } from "@/hooks/use-webflow-connector";

export interface WebflowMappingRow {
  id: string;
  massicField: string;
  webflowFieldKey: string;
  staticValue: string;
}

export interface WebflowImageDestinationRow {
  id: string;
  webflowFieldKey: string;
  enabled: boolean;
}

const CORE_CONTENT_FIELDS = [
  { value: "title", label: "Title", hint: "Usually Webflow Name" },
  { value: "bodyHtml", label: "Body", hint: "Rich text field" },
  { value: "metaTitle", label: "Meta title", hint: "Plain text field" },
  { value: "metaDescription", label: "Meta description", hint: "Plain text field" },
] as const;

interface WebflowPublishSetupProps {
  sites: Array<{ id?: string; _id?: string; displayName?: string; name?: string; shortName?: string }>;
  collections: WebflowCollection[];
  sitesLoading: boolean;
  collectionsLoading: boolean;
  selectedSiteId: string;
  selectedCollectionId: string;
  onSiteChange: (siteId: string) => void;
  onCollectionChange: (collectionId: string) => void;
  selectedCollection: WebflowCollection | null;
  mappings: WebflowMappingRow[];
  onMappingsChange: React.Dispatch<React.SetStateAction<WebflowMappingRow[]>>;
  imageDestinations: WebflowImageDestinationRow[];
  onImageDestinationsChange: React.Dispatch<React.SetStateAction<WebflowImageDestinationRow[]>>;
  hasBodyMapping: boolean;
  missingStaticCount: number;
  missingRequiredImageCount: number;
  canSave: boolean;
  isSaving: boolean;
  hasSavedTarget: boolean;
  onSave: () => void;
  getWebflowId: (value?: { id?: string; _id?: string } | null) => string;
  getWebflowFieldKey: (field?: WebflowCollectionField | null) => string;
  getWebflowFieldLabel: (field?: WebflowCollectionField | null) => string;
  getWebflowFieldType: (field?: WebflowCollectionField | null) => string;
  isWebflowRequiredField: (field?: WebflowCollectionField | null) => boolean;
}

export function WebflowPublishSetup({
  sites,
  collections,
  sitesLoading,
  collectionsLoading,
  selectedSiteId,
  selectedCollectionId,
  onSiteChange,
  onCollectionChange,
  selectedCollection,
  mappings,
  onMappingsChange,
  imageDestinations,
  onImageDestinationsChange,
  hasBodyMapping,
  missingStaticCount,
  missingRequiredImageCount,
  canSave,
  isSaving,
  hasSavedTarget,
  onSave,
  getWebflowId,
  getWebflowFieldKey,
  getWebflowFieldLabel,
  getWebflowFieldType,
  isWebflowRequiredField,
}: WebflowPublishSetupProps) {
  const collectionFields = selectedCollection?.fields || [];
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const imageFields = React.useMemo(
    () => collectionFields.filter(field => getWebflowFieldType(field).includes("image")),
    [collectionFields, getWebflowFieldType]
  );
  const fieldByKey = React.useMemo(() => {
    const map = new Map<string, WebflowCollectionField>();
    collectionFields.forEach(field => {
      const key = getWebflowFieldKey(field);
      if (key) map.set(key, field);
    });
    return map;
  }, [collectionFields, getWebflowFieldKey]);
  const coreRows = CORE_CONTENT_FIELDS.map(field => ({
    ...field,
    row: mappings.find(row => row.massicField === field.value),
  }));
  const staticRows = mappings.filter(row => row.massicField === "__static");
  const mappedContentCount = coreRows.filter(item => item.row?.webflowFieldKey).length;
  const enabledImageCount = imageDestinations.filter(row => row.enabled).length;
  const selectedContentFieldKeys = React.useMemo(
    () =>
      new Set(
        mappings
          .filter(row => row.massicField !== "__static" && row.webflowFieldKey)
          .map(row => row.webflowFieldKey)
      ),
    [mappings]
  );
  const getCoreFieldOptions = React.useCallback(
    (massicField: string, currentKey?: string) => {
      const isTitle = massicField === "title";
      const isBody = massicField === "bodyHtml";
      const isMeta = massicField === "metaTitle" || massicField === "metaDescription";

      const options: Array<{ key: string; label: string; type: string; required: boolean; disabled: boolean }> = [];
      if (isTitle) {
        options.push({
          key: "name",
          label: "Name",
          type: "plaintext",
          required: true,
          disabled: selectedContentFieldKeys.has("name") && currentKey !== "name",
        });
      }

      collectionFields.forEach(field => {
        const key = getWebflowFieldKey(field);
        if (!key || key === "slug") return;
        if (key === "name") return;

        const type = getWebflowFieldType(field);
        if (type.includes("image")) return;
        if (isBody && !type.includes("rich")) return;
        if (isMeta && type.includes("rich")) return;

        options.push({
          key,
          label: getWebflowFieldLabel(field),
          type,
          required: isWebflowRequiredField(field),
          disabled: selectedContentFieldKeys.has(key) && currentKey !== key,
        });
      });

      return options;
    },
    [
      collectionFields,
      getWebflowFieldKey,
      getWebflowFieldLabel,
      getWebflowFieldType,
      isWebflowRequiredField,
      selectedContentFieldKeys,
    ]
  );

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div>
          <Typography variant="small" className="font-medium text-general-foreground">
            Publishing destination
          </Typography>
          <p className="mt-0.5 text-sm text-general-muted-foreground">
            Choose the Webflow site and CMS collection for blog posts from Massic.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="webflow-site">Site</Label>
            <Select
              value={selectedSiteId || undefined}
              onValueChange={onSiteChange}
              disabled={sitesLoading}
            >
              <SelectTrigger id="webflow-site" className="w-full cursor-pointer">
                <SelectValue placeholder={sitesLoading ? "Loading sites…" : "Select site"} />
              </SelectTrigger>
              <SelectContent>
                {sites.map(site => {
                  const id = getWebflowId(site);
                  return (
                    <SelectItem key={id} value={id}>
                      {site.displayName || site.name || site.shortName || id}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webflow-collection">CMS collection</Label>
            <Select
              value={selectedCollectionId || undefined}
              onValueChange={onCollectionChange}
              disabled={!selectedSiteId || collectionsLoading}
            >
              <SelectTrigger id="webflow-collection" className="w-full cursor-pointer">
                <SelectValue
                  placeholder={
                    !selectedSiteId
                      ? "Select a site first"
                      : collectionsLoading
                        ? "Loading collections…"
                        : "Select collection"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {collections.map(collection => {
                  const id = getWebflowId(collection);
                  return (
                    <SelectItem key={id} value={id}>
                      {collection.displayName || collection.name || id}
                      {collection.massicEligible === false ? " (needs body field)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(sitesLoading || collectionsLoading) && (
          <div className="flex items-center gap-2 text-sm text-general-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading from Webflow…
          </div>
        )}
      </div>

      {selectedCollection ? (
        <div className="space-y-5">
          <div>
            <Typography variant="small" className="font-medium text-general-foreground">
              Publishing fields
            </Typography>
            <p className="mt-0.5 text-sm text-general-muted-foreground">
              Massic auto-maps the fields needed for Webflow publishing. Adjust anything that looks off.
            </p>
            <p className="mt-2 text-xs text-general-muted-foreground">
              {mappedContentCount} content fields mapped · {imageFields.length} image fields detected
            </p>
          </div>

          <ul className="space-y-2">
            {coreRows.map(({ value, label, hint, row }) => (
              <li
                key={value}
                className="grid gap-2 rounded-lg border border-general-border bg-white p-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-center"
              >
                <div className="min-w-0">
                  <Typography className="text-sm font-medium text-general-foreground">{label}</Typography>
                  <Typography className="text-xs text-general-muted-foreground">{hint}</Typography>
                </div>
                <Select
                  value={row?.webflowFieldKey || undefined}
                  onValueChange={nextValue => {
                    onMappingsChange(prev => {
                      const exists = prev.some(item => item.massicField === value);
                      if (exists) {
                        return prev.map(item =>
                          item.massicField === value ? { ...item, webflowFieldKey: nextValue } : item
                        );
                      }
                      return [
                        ...prev,
                        { id: value, massicField: value, webflowFieldKey: nextValue, staticValue: "" },
                      ];
                    });
                  }}
                >
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue placeholder="Choose Webflow field" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCoreFieldOptions(value, row?.webflowFieldKey).map(option => {
                      return (
                        <SelectItem key={option.key} value={option.key} disabled={option.disabled}>
                          {option.label}
                          {option.required ? " *" : ""}
                          {option.type ? ` · ${option.type}` : ""}
                          {option.disabled ? " · already mapped" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Typography variant="small" className="font-medium text-general-foreground">
                  Images
                </Typography>
                <p className="mt-0.5 text-sm text-general-muted-foreground">
                  Image fields are enabled by default. You can upload the Massic image in the publish window, then disable any fields you do not want to fill.
                </p>
              </div>
              {imageFields.length > 0 ? (
                <Typography className="shrink-0 text-xs text-general-muted-foreground">
                  {enabledImageCount} enabled
                </Typography>
              ) : null}
            </div>

            {imageFields.length > 0 ? (
              <ul className="space-y-2">
                {imageFields.map(field => {
                  const key = getWebflowFieldKey(field);
                  const destination = imageDestinations.find(row => row.webflowFieldKey === key);
                  const enabled = destination?.enabled ?? true;
                  return (
                    <li
                      key={key}
                      className="flex items-center gap-3 rounded-lg border border-general-border bg-white p-3"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-general-border bg-muted/40">
                        <ImageIcon className="size-4 text-general-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Typography className="truncate text-sm font-medium text-general-foreground">
                          {getWebflowFieldLabel(field)}
                          {isWebflowRequiredField(field) ? " *" : ""}
                        </Typography>
                        <Typography className="text-xs text-general-muted-foreground">
                          Massic CDN image · {getWebflowFieldType(field) || "image"}
                        </Typography>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={checked => {
                          onImageDestinationsChange(prev => {
                            const exists = prev.some(row => row.webflowFieldKey === key);
                            if (exists) {
                              return prev.map(row =>
                                row.webflowFieldKey === key ? { ...row, enabled: checked } : row
                              );
                            }
                            return [
                              ...prev,
                              { id: `image-${key}`, webflowFieldKey: key, enabled: checked },
                            ];
                          });
                        }}
                        aria-label={`Use Massic image for ${getWebflowFieldLabel(field)}`}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-general-border bg-muted/20 px-3 py-3 text-sm text-general-muted-foreground">
                This collection does not have image fields. Webflow publishing will stay text-only.
              </p>
            )}
          </div>

          {staticRows.length > 0 ? (
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="space-y-3">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-general-border bg-white px-3 py-2 text-left"
                >
                  <div>
                    <Typography className="text-sm font-medium text-general-foreground">Advanced required fields</Typography>
                    <Typography className="text-xs text-general-muted-foreground">
                      Static values Webflow requires before an item can be saved.
                    </Typography>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-general-muted-foreground transition-transform",
                      advancedOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="space-y-2">
                  {staticRows.map(row => {
                    const field = fieldByKey.get(row.webflowFieldKey);
                    return (
                      <li key={row.id} className="grid gap-2 rounded-lg border border-general-border bg-white p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)] sm:items-center">
                        <div className="min-w-0">
                          <Typography className="truncate text-sm font-medium text-general-foreground">
                            {getWebflowFieldLabel(field) || row.webflowFieldKey}
                          </Typography>
                          <Typography className="text-xs text-general-muted-foreground">
                            {getWebflowFieldType(field) || "required field"}
                          </Typography>
                        </div>
                        <Input
                          value={row.staticValue}
                          onChange={e => {
                            const nextValue = e.target.value;
                            onMappingsChange(prev =>
                              prev.map(item => (item.id === row.id ? { ...item, staticValue: nextValue } : item))
                            );
                          }}
                          placeholder="Static value"
                        />
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ) : null}

          {!hasBodyMapping && (
            <p className="text-sm text-destructive">Map Body to your collection&apos;s rich text field.</p>
          )}
          {missingStaticCount > 0 && (
            <p className="text-sm text-destructive">Fill in static values before saving.</p>
          )}
          {missingRequiredImageCount > 0 && (
            <p className="text-sm text-destructive">Enable required Webflow image fields before saving.</p>
          )}

          <div className="flex justify-end pt-1">
            <Button onClick={onSave} disabled={!canSave} size="sm">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : hasSavedTarget ? (
                "Save changes"
              ) : (
                "Save publishing setup"
              )}
            </Button>
          </div>
        </div>
      ) : selectedSiteId && !collectionsLoading ? (
        <p className="text-sm text-general-muted-foreground">Select a CMS collection to configure field mapping.</p>
      ) : null}
    </div>
  );
}
