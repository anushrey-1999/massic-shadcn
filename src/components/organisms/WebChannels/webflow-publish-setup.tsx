"use client";

import * as React from "react";
import { ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
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
import { Typography } from "@/components/ui/typography";
import type { WebflowCollection, WebflowCollectionField } from "@/hooks/use-webflow-connector";

export interface WebflowMappingRow {
  id: string;
  massicField: string;
  webflowFieldKey: string;
  staticValue: string;
}

const MASSIC_WEBFLOW_FIELDS = [
  { value: "title", label: "Title" },
  { value: "slug", label: "Slug" },
  { value: "bodyHtml", label: "Body HTML" },
  { value: "excerpt", label: "Excerpt" },
  { value: "metaTitle", label: "Meta title" },
  { value: "metaDescription", label: "Meta description" },
  { value: "featuredImage", label: "Featured image" },
  { value: "featuredImageAlt", label: "Featured image alt" },
  { value: "__static", label: "Static value" },
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
  hasBodyMapping: boolean;
  missingStaticCount: number;
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
  hasBodyMapping,
  missingStaticCount,
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
        <div className="space-y-3">
          <div>
            <Typography variant="small" className="font-medium text-general-foreground">
              Field mapping
            </Typography>
            <p className="mt-0.5 text-sm text-general-muted-foreground">
              Match Massic content to your collection fields. Body HTML must map to a rich text field.
            </p>
          </div>

          <ul className="space-y-2">
            {mappings.map(row => (
              <li
                key={row.id}
                className="flex flex-col gap-2 rounded-lg border border-general-border bg-white p-3 sm:flex-row sm:items-center"
              >
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-3">
                  <Select
                    value={row.massicField || undefined}
                    onValueChange={value => {
                      onMappingsChange(prev =>
                        prev.map(item =>
                          item.id === row.id
                            ? { ...item, massicField: value, staticValue: value === "__static" ? item.staticValue : "" }
                            : item
                        )
                      );
                    }}
                  >
                    <SelectTrigger className="w-full cursor-pointer">
                      <SelectValue placeholder="Massic field" />
                    </SelectTrigger>
                    <SelectContent>
                      {MASSIC_WEBFLOW_FIELDS.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <ArrowRight className="hidden size-4 shrink-0 text-general-muted-foreground sm:block" aria-hidden />

                  <Select
                    value={row.webflowFieldKey || undefined}
                    onValueChange={value => {
                      onMappingsChange(prev =>
                        prev.map(item => (item.id === row.id ? { ...item, webflowFieldKey: value } : item))
                      );
                    }}
                  >
                    <SelectTrigger className="w-full cursor-pointer">
                      <SelectValue placeholder="Webflow field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="slug">Slug</SelectItem>
                      {collectionFields.map(field => {
                        const key = getWebflowFieldKey(field);
                        if (!key || key === "name" || key === "slug") return null;
                        const type = getWebflowFieldType(field);
                        return (
                          <SelectItem key={key} value={key}>
                            {getWebflowFieldLabel(field)}
                            {isWebflowRequiredField(field) ? " *" : ""}
                            {type ? ` · ${type}` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {row.massicField === "__static" && (
                  <Input
                    value={row.staticValue}
                    onChange={e => {
                      const value = e.target.value;
                      onMappingsChange(prev =>
                        prev.map(item => (item.id === row.id ? { ...item, staticValue: value } : item))
                      );
                    }}
                    placeholder="Static value"
                    className="sm:max-w-[200px]"
                  />
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 cursor-pointer text-general-muted-foreground hover:text-destructive disabled:cursor-not-allowed"
                  onClick={() => onMappingsChange(prev => prev.filter(item => item.id !== row.id))}
                  disabled={mappings.length <= 1}
                  aria-label="Remove mapping"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>

          {!hasBodyMapping && (
            <p className="text-sm text-destructive">Map Body HTML to your collection&apos;s rich text field.</p>
          )}
          {missingStaticCount > 0 && (
            <p className="text-sm text-destructive">Fill in values for static field rows before saving.</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onMappingsChange(prev => [
                  ...prev,
                  {
                    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    massicField: "__static",
                    webflowFieldKey: "",
                    staticValue: "",
                  },
                ])
              }
            >
              <Plus className="mr-1.5 size-4" />
              Add field
            </Button>
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
