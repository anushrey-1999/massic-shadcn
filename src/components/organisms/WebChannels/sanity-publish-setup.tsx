"use client";

import * as React from "react";
import { ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";
import type { SanityDocumentType, SanityField } from "@/hooks/use-sanity-connector";

export interface SanityMappingRow {
  id: string;
  massicField: string;
  sanityFieldPath: string;
  staticValue: string;
  sourcePath: string;
  type: string;
}

export interface SanityImageDestinationRow {
  id: string;
  sanityFieldPath: string;
  enabled: boolean;
}

const CORE_CONTENT_FIELDS = [
  { value: "title", label: "Title", hint: "Text field" },
  { value: "slug", label: "Slug", hint: "Slug field" },
  { value: "bodyHtml", label: "Body", hint: "Portable Text field" },
  { value: "metaTitle", label: "Meta title", hint: "SEO/title text field" },
  {
    value: "metaDescription",
    label: "Meta description",
    hint: "SEO description field"
  }
] as const;

interface SanityPublishSetupProps {
  documentTypes: SanityDocumentType[];
  fields: SanityField[];
  documentTypesLoading: boolean;
  fieldsLoading: boolean;
  selectedDocumentType: string;
  onDocumentTypeChange: (documentType: string) => void;
  previewBaseUrl: string;
  onPreviewBaseUrlChange: (value: string) => void;
  urlPattern: string;
  onUrlPatternChange: (value: string) => void;
  mappings: SanityMappingRow[];
  onMappingsChange: React.Dispatch<React.SetStateAction<SanityMappingRow[]>>;
  imageDestinations: SanityImageDestinationRow[];
  onImageDestinationsChange: React.Dispatch<React.SetStateAction<SanityImageDestinationRow[]>>;
  canSave: boolean;
  isSaving: boolean;
  hasSavedTarget: boolean;
  onSave: () => void;
}

function getFieldLabel(field?: SanityField | null) {
  return field?.label || field?.fieldPath || "Field";
}

function getFieldType(field?: SanityField | null) {
  return field?.type || "";
}

function makeCustomRow(): SanityMappingRow {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    massicField: "__static",
    sanityFieldPath: "",
    staticValue: "",
    sourcePath: "",
    type: "string"
  };
}

export function SanityPublishSetup({
  documentTypes,
  fields,
  documentTypesLoading,
  fieldsLoading,
  selectedDocumentType,
  onDocumentTypeChange,
  previewBaseUrl,
  onPreviewBaseUrlChange,
  urlPattern,
  onUrlPatternChange,
  mappings,
  onMappingsChange,
  imageDestinations,
  onImageDestinationsChange,
  canSave,
  isSaving,
  hasSavedTarget,
  onSave
}: SanityPublishSetupProps) {
  const [enterDocumentTypeManually, setEnterDocumentTypeManually] = React.useState(false);
  const fieldByPath = React.useMemo(() => {
    const map = new Map<string, SanityField>();
    fields.forEach(field => {
      if (field.fieldPath) map.set(field.fieldPath, field);
    });
    return map;
  }, [fields]);
  const imageFields = React.useMemo(() => fields.filter(field => field.possibleImage || field.type === "image"), [fields]);
  const coreRows = CORE_CONTENT_FIELDS.map(field => ({
    ...field,
    row: mappings.find(row => row.massicField === field.value)
  }));
  const customRows = mappings.filter(row => row.massicField === "__static" || row.massicField === "__custom");
  const mappedCount = mappings.filter(row => row.sanityFieldPath).length;
  const enabledImageCount = imageDestinations.filter(row => row.enabled).length;

  const fieldOptionsFor = React.useCallback(
    (massicField: string) => {
      return fields.filter(field => {
        if (field.possibleImage || field.type === "image") return false;
        if (massicField === "slug") {
          return field.possibleSlug || field.type === "slug" || field.fieldPath === "slug" || field.fieldPath.endsWith(".slug");
        }
        if (massicField === "bodyHtml") return field.possibleBody || field.type === "portableText" || field.type === "array";
        return !field.possibleBody;
      });
    },
    [fields]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-1.5">
          <div className="flex min-h-5 items-center justify-between gap-2">
            <Label htmlFor="sanity-document-type">Document type</Label>
            {documentTypes.length > 0 ? (
              <button
                type="button"
                className="cursor-pointer text-xs text-general-muted-foreground underline-offset-4 hover:text-general-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => setEnterDocumentTypeManually(value => !value)}
              >
                {enterDocumentTypeManually ? "Choose detected type" : "Enter manually"}
              </button>
            ) : null}
          </div>
          {documentTypes.length > 0 && !enterDocumentTypeManually ? (
            <Select value={selectedDocumentType || undefined} onValueChange={onDocumentTypeChange} disabled={documentTypesLoading}>
              <SelectTrigger id="sanity-document-type" className="w-full cursor-pointer">
                <SelectValue placeholder={documentTypesLoading ? "Loading types..." : "Select document type"} />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name || type.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="sanity-document-type"
              value={selectedDocumentType}
              onChange={event => onDocumentTypeChange(event.target.value)}
              placeholder="blogPost"
              disabled={documentTypesLoading}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sanity-preview-base-url">Preview base URL</Label>
          <Input
            id="sanity-preview-base-url"
            value={previewBaseUrl}
            onChange={event => onPreviewBaseUrlChange(event.target.value)}
            placeholder="https://example.com"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2 xl:col-span-1">
          <Label htmlFor="sanity-url-pattern">Blog URL pattern</Label>
          <Input
            id="sanity-url-pattern"
            value={urlPattern}
            onChange={event => onUrlPatternChange(event.target.value)}
            placeholder="/blog/{slug}"
          />
        </div>
      </div>

      {(documentTypesLoading || fieldsLoading) && (
        <div className="flex items-center gap-2 text-sm text-general-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading from Sanity...
        </div>
      )}

      {selectedDocumentType ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <Typography variant="small" className="font-medium text-general-foreground">
                Publishing fields
              </Typography>
              <p className="mt-0.5 text-xs text-general-muted-foreground">Choose a detected field or enter its Sanity path manually.</p>
            </div>
            <p className="shrink-0 text-xs text-general-muted-foreground">
              {mappedCount} mapped · {imageFields.length} image fields
            </p>
          </div>

          <ul className="space-y-2">
            {coreRows.map(({ value, label, hint, row }) => {
              const fieldOptions = fieldOptionsFor(value);
              const detectedValue = fieldOptions.some(field => field.fieldPath === row?.sanityFieldPath) ? row?.sanityFieldPath : undefined;
              return (
                <li
                  key={value}
                  className="grid gap-2 rounded-lg border border-general-border bg-white p-2.5 sm:grid-cols-[minmax(0,150px)_minmax(0,1fr)] sm:items-center"
                >
                  <div className="min-w-0">
                    <Typography className="text-sm font-medium text-general-foreground">{label}</Typography>
                    <Typography className="text-xs text-general-muted-foreground">{hint}</Typography>
                  </div>
                  <div className="grid gap-2 lg:grid-cols-[minmax(180px,0.8fr)_minmax(220px,1.2fr)]">
                    {fieldOptions.length > 0 ? (
                      <Select
                        value={detectedValue}
                        onValueChange={nextValue => {
                          const field = fieldByPath.get(nextValue);
                          onMappingsChange(prev => {
                            const exists = prev.some(item => item.massicField === value);
                            const nextRow = {
                              id: value,
                              massicField: value,
                              sanityFieldPath: nextValue,
                              staticValue: "",
                              sourcePath: "",
                              type: value === "slug" ? "slug" : field?.type || (value === "bodyHtml" ? "portableText" : "string")
                            };
                            return exists
                              ? prev.map(item => (item.massicField === value ? { ...item, ...nextRow } : item))
                              : [...prev, nextRow];
                          });
                        }}
                      >
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder="Choose detected field" />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldOptions.map(field => (
                            <SelectItem key={field.fieldPath} value={field.fieldPath}>
                              {getFieldLabel(field)}
                              {field.type ? ` · ${field.type}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    <Input
                      value={row?.sanityFieldPath || ""}
                      onChange={event => {
                        const nextValue = event.target.value;
                        onMappingsChange(prev => {
                          const exists = prev.some(item => item.massicField === value);
                          const nextRow = {
                            id: value,
                            massicField: value,
                            sanityFieldPath: nextValue,
                            staticValue: "",
                            sourcePath: "",
                            type: value === "bodyHtml" ? "portableText" : value === "slug" ? "slug" : "string"
                          };
                          return exists
                            ? prev.map(item => (item.massicField === value ? { ...item, ...nextRow } : item))
                            : [...prev, nextRow];
                        });
                      }}
                      placeholder="Sanity field path"
                      aria-label={`${label} Sanity field path`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Typography variant="small" className="font-medium text-general-foreground">
                  Images
                </Typography>
                <p className="mt-0.5 text-sm text-general-muted-foreground">
                  Enabled image fields appear in the publish window and upload to Sanity Assets during publish.
                </p>
              </div>
              {imageFields.length > 0 ? (
                <Typography className="shrink-0 text-xs text-general-muted-foreground">{enabledImageCount} enabled</Typography>
              ) : null}
            </div>

            {imageFields.length > 0 ? (
              <ul className="space-y-2">
                {imageFields.map(field => {
                  const key = field.fieldPath;
                  const destination = imageDestinations.find(row => row.sanityFieldPath === key);
                  const enabled = destination?.enabled ?? true;
                  return (
                    <li key={key} className="flex items-center gap-3 rounded-lg border border-general-border bg-white p-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-general-border bg-muted/40">
                        <ImageIcon className="size-4 text-general-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Typography className="truncate text-sm font-medium text-general-foreground">{getFieldLabel(field)}</Typography>
                        <Typography className="text-xs text-general-muted-foreground">
                          Sanity asset image · {getFieldType(field) || "image"}
                        </Typography>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={checked => {
                          onImageDestinationsChange(prev => {
                            const exists = prev.some(row => row.sanityFieldPath === key);
                            return exists
                              ? prev.map(row => (row.sanityFieldPath === key ? { ...row, enabled: checked } : row))
                              : [
                                  ...prev,
                                  {
                                    id: `image-${key}`,
                                    sanityFieldPath: key,
                                    enabled: checked
                                  }
                                ];
                          });
                        }}
                        aria-label={`Use Massic image for ${getFieldLabel(field)}`}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-general-border bg-muted/20 px-3 py-3 text-sm text-general-muted-foreground">
                No image fields were detected from sample documents. Add a custom image field mapping if needed.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Typography variant="small" className="font-medium text-general-foreground">
                Custom fields
              </Typography>
              <Button type="button" size="sm" variant="outline" onClick={() => onMappingsChange(prev => [...prev, makeCustomRow()])}>
                <Plus className="mr-1.5 size-4" />
                Add field
              </Button>
            </div>
            {customRows.length > 0 ? (
              <ul className="space-y-2">
                {customRows.map(row => (
                  <li
                    key={row.id}
                    className="grid gap-2 rounded-lg border border-general-border bg-white p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <Input
                      value={row.sanityFieldPath}
                      onChange={event =>
                        onMappingsChange(prev =>
                          prev.map(item => (item.id === row.id ? { ...item, sanityFieldPath: event.target.value } : item))
                        )
                      }
                      placeholder="Sanity field path"
                    />
                    <Input
                      value={row.staticValue}
                      onChange={event =>
                        onMappingsChange(prev =>
                          prev.map(item => (item.id === row.id ? { ...item, staticValue: event.target.value } : item))
                        )
                      }
                      placeholder="Static value"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-9"
                      onClick={() => onMappingsChange(prev => prev.filter(item => item.id !== row.id))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={onSave} disabled={!canSave} size="sm">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : hasSavedTarget ? (
                "Save changes"
              ) : (
                "Save publishing setup"
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
