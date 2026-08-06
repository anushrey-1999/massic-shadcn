"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useConfigureWixPublishing, useWixPublishingSetup } from "@/hooks/use-wix-connector";

interface WixPublishSetupProps {
  businessId: string;
  onReconnect: () => void;
  reconnecting?: boolean;
}

function toggleId(values: string[], id: string, checked: boolean) {
  return checked ? Array.from(new Set([...values, id])) : values.filter(value => value !== id);
}

export function WixPublishSetup({ businessId, onReconnect, reconnecting = false }: WixPublishSetupProps) {
  const setupQuery = useWixPublishingSetup(businessId);
  const configureMutation = useConfigureWixPublishing(businessId);
  const setup = setupQuery.data;
  const [authorMemberId, setAuthorMemberId] = React.useState("");
  const [categoryIds, setCategoryIds] = React.useState<string[]>([]);
  const [tagIds, setTagIds] = React.useState<string[]>([]);
  const [commentingEnabled, setCommentingEnabled] = React.useState(true);
  const [featured, setFeatured] = React.useState(false);

  React.useEffect(() => {
    const metadata = setup?.target?.metadata;
    setAuthorMemberId(metadata?.authorMemberId || "");
    setCategoryIds(metadata?.defaultCategoryIds || []);
    setTagIds(metadata?.defaultTagIds || []);
    setCommentingEnabled(metadata?.commentingEnabled !== false);
    setFeatured(Boolean(metadata?.featured));
  }, [setup?.target]);

  if (setupQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-general-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking Wix Blog access…
      </div>
    );
  }

  if (setupQuery.isError) {
    return (
      <Alert>
        <div className="flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <AlertTitle className="mb-0">Publishing setup could not be loaded</AlertTitle>
        </div>
        <AlertDescription className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <span>Refresh the Wix connection details and try again.</span>
          <Button size="sm" variant="outline" onClick={() => setupQuery.refetch()}>
            <RotateCcw className="mr-1.5 size-3.5" /> Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (setup?.reconnectRequired) {
    return (
      <Alert className="border-amber-200 bg-amber-50 text-amber-950">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <AlertTitle className="mb-0">Wix needs to be reconnected</AlertTitle>
        </div>
        <AlertDescription className="mt-2 space-y-3">
          <p>Massic no longer has publishing access. Reconnect using a Wix account that can manage apps for this site.</p>
          <Button size="sm" onClick={onReconnect} disabled={reconnecting}>
            {reconnecting ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
            {reconnecting ? "Opening Wix…" : "Reconnect Wix"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!setup) return null;

  if (setup.setupIssue === "wix_blog_not_installed") {
    return (
      <Alert className="border-amber-200 bg-amber-50 text-amber-950">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <AlertTitle className="mb-0">Install Wix Blog to continue</AlertTitle>
        </div>
        <AlertDescription className="mt-2 space-y-3">
          <p>
            This site is connected, but Wix Blog is not installed. In Wix, install Wix Blog from the App Market,
            then return here and check again.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setupQuery.refetch()}
            disabled={setupQuery.isFetching}
          >
            {setupQuery.isFetching ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 size-3.5" />}
            {setupQuery.isFetching ? "Checking…" : "Check again"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (setup.setupIssue === "wix_blog_unavailable" || setup.setupIssue === "wix_members_unavailable") {
    return (
      <Alert>
        <div className="flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <AlertTitle className="mb-0">Wix publishing access could not be verified</AlertTitle>
        </div>
        <AlertDescription className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <span>Wix did not complete the access check. Wait a moment, then try again.</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setupQuery.refetch()}
            disabled={setupQuery.isFetching}
          >
            {setupQuery.isFetching ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 size-3.5" />}
            {setupQuery.isFetching ? "Checking…" : "Try again"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const saveDisabled = !authorMemberId || configureMutation.isPending || setup.members.length === 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-general-foreground">
            {setup.setupReady ? <CheckCircle2 className="size-4 text-green-600" /> : <AlertCircle className="size-4 text-amber-600" />}
            {setup.setupReady ? "Ready to publish blogs" : "Finish publishing setup"}
          </div>
          <p className="text-xs text-general-muted-foreground">
            Massic converts your blog into editable Wix content and preserves unsupported blocks safely.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wix-default-author">Default post author</Label>
        <Select value={authorMemberId} onValueChange={setAuthorMemberId} disabled={configureMutation.isPending}>
          <SelectTrigger id="wix-default-author" className="w-full cursor-pointer">
            <SelectValue placeholder={setup.members.length ? "Select a Wix member" : "No Wix members available"} />
          </SelectTrigger>
          <SelectContent>
            {setup.members.map(member => (
              <SelectItem key={member.id} value={member.id}>{member.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!setup.members.length ? (
          <p className="text-xs text-amber-700">Add or approve a Wix site member before publishing.</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Default categories</Label>
          <div className="max-h-32 space-y-2 overflow-y-auto rounded-lg border border-general-border p-3">
            {setup.categories.length ? setup.categories.map(category => (
              <label key={category.id} className="flex cursor-pointer items-start gap-2 text-sm">
                <Checkbox
                  checked={categoryIds.includes(category.id)}
                  onCheckedChange={checked => setCategoryIds(values => toggleId(values, category.id, Boolean(checked)))}
                  disabled={configureMutation.isPending}
                />
                <span className="min-w-0 break-words">{category.label}</span>
              </label>
            )) : <p className="text-xs text-general-muted-foreground">No Wix categories yet.</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Default tags</Label>
          <div className="max-h-32 space-y-2 overflow-y-auto rounded-lg border border-general-border p-3">
            {setup.tags.length ? setup.tags.map(tag => (
              <label key={tag.id} className="flex cursor-pointer items-start gap-2 text-sm">
                <Checkbox
                  checked={tagIds.includes(tag.id)}
                  onCheckedChange={checked => setTagIds(values => toggleId(values, tag.id, Boolean(checked)))}
                  disabled={configureMutation.isPending}
                />
                <span className="min-w-0 break-words">{tag.label}</span>
              </label>
            )) : <p className="text-xs text-general-muted-foreground">No Wix tags yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-general-border px-3 py-2.5">
          <span className="text-sm">Allow comments by default</span>
          <Switch checked={commentingEnabled} onCheckedChange={setCommentingEnabled} disabled={configureMutation.isPending} />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-general-border px-3 py-2.5">
          <span className="text-sm">Feature posts by default</span>
          <Switch checked={featured} onCheckedChange={setFeatured} disabled={configureMutation.isPending} />
        </label>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={saveDisabled}
          onClick={() => configureMutation.mutate({
            authorMemberId,
            defaultCategoryIds: categoryIds,
            defaultTagIds: tagIds,
            commentingEnabled,
            featured
          })}
        >
          {configureMutation.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
          {configureMutation.isPending ? "Saving…" : "Save publishing setup"}
        </Button>
      </div>
    </div>
  );
}
