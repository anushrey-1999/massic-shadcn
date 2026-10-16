"use client";

import { useState } from "react";
import { Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AgentMarkdown } from "@/components/massic-agent/agent-markdown";
import markdownStyles from "@/components/massic-agent/agent.module.css";
import { Button } from "@/components/ui/button";
import { useProfileReference } from "@/hooks/use-profile-reference";
import { apiErrorMessage } from "@/lib/api-error";
import type { ProfileStatus } from "@/types/profile-v2";
import { copyToClipboard } from "@/utils/clipboard";
import { downloadMarkdown } from "@/utils/markdown-generator";

export interface ProfileReferenceSource {
  businessId: string;
  profileId?: string | null;
  profileStatus?: ProfileStatus | null;
}

export function ProfileReferenceDocument({
  businessId,
  profileId,
  profileStatus,
}: ProfileReferenceSource) {
  const reference = useProfileReference(businessId, profileId, profileStatus);
  const [copying, setCopying] = useState(false);
  const markdown = reference.data?.document ?? "";
  const hasDocument = Boolean(markdown.trim());
  const disabled = !hasDocument || reference.isPending || reference.isError;
  const processing =
    profileStatus === "processing" || reference.data?.status === "processing";

  const copy = async () => {
    if (disabled || copying) return;
    setCopying(true);
    try {
      if (await copyToClipboard(markdown)) {
        toast.success("Profile reference copied");
      } else {
        toast.error("Couldn't copy the profile reference. Please try again.");
      }
    } finally {
      setCopying(false);
    }
  };

  const download = () => {
    if (disabled) return;
    try {
      downloadMarkdown(markdown, "profile-reference.md");
    } catch {
      toast.error("Couldn't download the profile reference. Please try again.");
    }
  };

  return (
    <section
      className="flex h-full min-h-0 min-w-0 max-w-[920px] flex-col"
      aria-label="Profile reference"
    >
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-general-border/30 pb-3">
        <h2 className="text-base font-medium text-general-foreground">
          Profile reference
        </h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || copying}
            onClick={() => void copy()}
          >
            {copying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Copy className="size-4" />
            )}
            {copying ? "Copying…" : "Copy"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={download}
          >
            <Download className="size-4" />
            Download
          </Button>
        </div>
      </div>
      <div
        role="region"
        aria-label="Profile reference document"
        tabIndex={0}
        className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border border-general-border bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {!profileId ? (
          <p className="text-sm text-general-muted-foreground">
            {processing
              ? "Your profile reference is being prepared."
              : "A profile reference will appear here after a profile is generated."}
          </p>
        ) : reference.isPending ? (
          <div
            role="status"
            className="flex items-center gap-2 py-8 text-sm text-general-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin" />
            Loading profile reference…
          </div>
        ) : reference.isError ? (
          <div role="alert" className="space-y-3 text-sm">
            <p>
              Couldn't load the profile reference. {apiErrorMessage(reference.error)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reference.isFetching}
              onClick={() => void reference.refetch()}
            >
              {reference.isFetching ? "Retrying…" : "Retry"}
            </Button>
          </div>
        ) : !hasDocument ? (
          <p className="text-sm text-general-muted-foreground">
            {processing
              ? "Your profile reference is being prepared. It will appear here when ready."
              : "No profile reference is available yet."}
          </p>
        ) : (
          <div className={`${markdownStyles.markdown} min-w-0 break-words text-sm text-general-foreground [&_img]:h-auto [&_img]:max-w-full [&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0 [&_.task-list-item>input]:mr-2`}>
            <AgentMarkdown content={markdown} tableLabel="Profile reference table" />
          </div>
        )}
      </div>
    </section>
  );
}
