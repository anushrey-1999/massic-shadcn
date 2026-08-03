"use client";

import * as React from "react";
import { AlertTriangle, ExternalLink, ImageIcon, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { WixConversionResult } from "@/hooks/use-cms-publishing";
import type { CmsFeaturedImageAsset } from "@/hooks/use-cms-featured-image";
import type { WixPublishingSetup } from "@/hooks/use-wix-connector";
import { cn } from "@/lib/utils";

interface WixBlogPublishPanelProps {
  ready: boolean;
  siteName: string;
  publishState: "not_published" | "draft" | "live";
  setup?: WixPublishingSetup;
  setupLoading: boolean;
  slug: string;
  onSlugChange: (value: string) => void;
  slugBusy: boolean;
  slugChecking: boolean;
  slugError: string | null;
  hasSlugConflict: boolean;
  authorMemberId: string;
  onAuthorChange: (value: string) => void;
  categoryIds: string[];
  onCategoryIdsChange: (value: string[]) => void;
  tagIds: string[];
  onTagIdsChange: (value: string[]) => void;
  commentingEnabled: boolean;
  onCommentingEnabledChange: (value: boolean) => void;
  featured: boolean;
  onFeaturedChange: (value: boolean) => void;
  conversion: WixConversionResult | null;
  publishIssue: string | null;
  liveUrl?: string | null;
  editUrl?: string | null;
  featuredImage: CmsFeaturedImageAsset | null;
  featuredImageAlt: string;
  onFeaturedImageAltChange: (value: string) => void;
  onFeaturedImageAltBlur: () => void;
  onFeaturedImageFile: (file: File | null) => Promise<void>;
  onClearFeaturedImage: () => Promise<void>;
  featuredImageLoading: boolean;
  featuredImageBusy: boolean;
  featuredImageUploadProgress: number | null;
  featuredImageError?: string | null;
  busy: boolean;
  onConfigure: () => void;
}

function toggle(values: string[], id: string, checked: boolean) {
  return checked ? Array.from(new Set([...values, id])) : values.filter(value => value !== id);
}

export function WixBlogPublishPanel(props: WixBlogPublishPanelProps) {
  const featuredImageInputRef = React.useRef<HTMLInputElement>(null);
  const [isFeaturedImageDragActive, setIsFeaturedImageDragActive] = React.useState(false);

  if (props.setupLoading) {
    return <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading Wix publishing options…</div>;
  }

  if (!props.ready || props.setup?.reconnectRequired || !props.setup?.setupReady) {
    return (
      <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Wix publishing setup is incomplete</p>
            <p className="text-xs">Reconnect Wix if requested, then choose a default Wix member author.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={props.onConfigure}>Open Wix settings</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg bg-muted/20 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Wix: {props.siteName}</p>
          <p className="text-xs text-muted-foreground">Native editable content with safe HTML fallbacks.</p>
        </div>
        <Badge
          className={cn(props.publishState === "live" && "border-transparent bg-green-600 text-white")}
          variant={props.publishState === "live" ? "default" : props.publishState === "draft" ? "secondary" : "outline"}
        >
          {props.publishState === "live" ? "Live" : props.publishState === "draft" ? "Draft" : "Not Published"}
        </Badge>
      </div>

      {props.publishIssue ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {props.publishIssue}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Publish slug</Label>
        <Input value={props.slug} onChange={event => props.onSlugChange(event.target.value)} disabled={props.slugBusy} placeholder="enter-blog-slug" />
        {props.slugChecking ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" />Checking slug availability…</div>
        ) : props.slugError ? <p className="text-xs text-destructive">{props.slugError}</p> : props.hasSlugConflict ? (
          <p className="text-xs text-destructive">This slug already belongs to another Wix post.</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Post author</Label>
          <Select value={props.authorMemberId} onValueChange={props.onAuthorChange} disabled={props.busy}>
            <SelectTrigger className="w-full cursor-pointer"><SelectValue placeholder="Select a Wix member" /></SelectTrigger>
            <SelectContent>
              {props.setup.members.map(member => <SelectItem key={member.id} value={member.id}>{member.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Categories</Label>
          <div className="max-h-28 space-y-2 overflow-y-auto rounded-md border bg-background p-2.5">
            {props.setup.categories.length ? props.setup.categories.map(category => (
              <label key={category.id} className="flex cursor-pointer items-start gap-2 text-xs">
                <Checkbox checked={props.categoryIds.includes(category.id)} onCheckedChange={checked => props.onCategoryIdsChange(toggle(props.categoryIds, category.id, Boolean(checked)))} disabled={props.busy} />
                <span>{category.label}</span>
              </label>
            )) : <p className="text-xs text-muted-foreground">No categories yet.</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="max-h-28 space-y-2 overflow-y-auto rounded-md border bg-background p-2.5">
            {props.setup.tags.length ? props.setup.tags.map(tag => (
              <label key={tag.id} className="flex cursor-pointer items-start gap-2 text-xs">
                <Checkbox checked={props.tagIds.includes(tag.id)} onCheckedChange={checked => props.onTagIdsChange(toggle(props.tagIds, tag.id, Boolean(checked)))} disabled={props.busy} />
                <span>{tag.label}</span>
              </label>
            )) : <p className="text-xs text-muted-foreground">No tags yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
          <span className="text-xs">Allow comments</span>
          <Switch checked={props.commentingEnabled} onCheckedChange={props.onCommentingEnabledChange} disabled={props.busy} />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
          <span className="text-xs">Featured post</span>
          <Switch checked={props.featured} onCheckedChange={props.onFeaturedChange} disabled={props.busy} />
        </label>
      </div>

      <div className="space-y-2">
        <Label>Featured image</Label>
        <p className="text-xs text-muted-foreground">
          Stored on Massic’s CDN and imported into Wix Media. Wix uses it for both the article header and the blog-feed thumbnail; it is not inserted into the article body.
        </p>
        <input
          ref={featuredImageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={event => {
            const file = event.target.files?.[0] || null;
            void props.onFeaturedImageFile(file).finally(() => {
              if (featuredImageInputRef.current) featuredImageInputRef.current.value = "";
            });
          }}
        />
        {props.featuredImageLoading ? (
          <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading featured image…
          </div>
        ) : props.featuredImage ? (
          <div className="space-y-3 rounded-md border bg-background p-3">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={props.featuredImage.cdnUrl}
                alt={props.featuredImageAlt || "Featured image preview"}
                className="h-[72px] w-[96px] shrink-0 rounded-md border object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{props.featuredImage.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {props.featuredImage.width && props.featuredImage.height
                    ? `${props.featuredImage.width} × ${props.featuredImage.height}`
                    : "Dimensions unavailable"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Ready for the next Wix publish.</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => featuredImageInputRef.current?.click()}
                  disabled={props.featuredImageBusy}
                  aria-label="Replace featured image"
                >
                  {props.featuredImageBusy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => void props.onClearFeaturedImage()}
                  disabled={props.featuredImageBusy}
                  aria-label="Remove featured image"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wix-featured-image-alt" className="text-xs text-muted-foreground">Alt text</Label>
              <Input
                id="wix-featured-image-alt"
                value={props.featuredImageAlt}
                onChange={event => props.onFeaturedImageAltChange(event.target.value)}
                onBlur={props.onFeaturedImageAltBlur}
                placeholder="Describe this image"
                disabled={props.featuredImageBusy}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={cn(
              "w-full cursor-pointer rounded-md border border-dashed bg-background p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isFeaturedImageDragActive ? "border-primary bg-primary/5" : "hover:border-primary/50",
              props.featuredImageBusy && "cursor-not-allowed opacity-70"
            )}
            onClick={() => featuredImageInputRef.current?.click()}
            onDragOver={event => { event.preventDefault(); setIsFeaturedImageDragActive(true); }}
            onDragLeave={event => { event.preventDefault(); setIsFeaturedImageDragActive(false); }}
            onDrop={event => {
              event.preventDefault();
              setIsFeaturedImageDragActive(false);
              void props.onFeaturedImageFile(event.dataTransfer.files?.[0] || null);
            }}
            disabled={props.featuredImageBusy}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted">
                {props.featuredImageBusy ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : <ImageIcon className="size-5 text-muted-foreground" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">Upload a featured image</span>
                <span className="block text-xs text-muted-foreground">JPG, PNG, or WebP up to 10 MB. Click or drag and drop.</span>
              </span>
            </div>
          </button>
        )}
        {props.featuredImageUploadProgress !== null ? (
          <div className="space-y-1.5" aria-live="polite">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" />Uploading to Massic CDN…</span>
              <span>{props.featuredImageUploadProgress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-[width]" style={{ width: `${props.featuredImageUploadProgress}%` }} />
            </div>
          </div>
        ) : null}
        {props.featuredImageError ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive" role="alert">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {props.featuredImageError}
          </div>
        ) : null}
      </div>

      {props.conversion?.warnings.length ? (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-950">Formatting review</p>
          {props.conversion.warnings.slice(0, 5).map((warning, index) => (
            <p key={`${warning.code}-${index}`} className="text-xs text-amber-900">• {warning.message}</p>
          ))}
          {props.conversion.warnings.length > 5 ? <p className="text-xs text-amber-800">+{props.conversion.warnings.length - 5} more warnings</p> : null}
        </div>
      ) : props.conversion ? (
        <p className="text-xs text-green-700">All content converted to native Wix blocks.</p>
      ) : null}

      {(props.liveUrl || props.editUrl) ? (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {props.editUrl ? <Button size="sm" variant="outline" asChild><a href={props.editUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 size-3.5" />Edit in Wix</a></Button> : null}
          {props.liveUrl ? <Button size="sm" variant="outline" asChild><a href={props.liveUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 size-3.5" />View live</a></Button> : null}
        </div>
      ) : null}
    </div>
  );
}
