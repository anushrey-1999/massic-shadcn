"use client";

import Link, { useLinkStatus } from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, Eye, Sparkles } from "lucide-react";
import { useMutation, useQueries, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import type { SmartSitemapListPage } from "@/hooks/use-smart-sitemap";
import {
  ARCHITECTURE_INSTRUCTIONS_LIMIT,
  architectureRequestError,
  useWebsiteArchitectureContent,
} from "@/hooks/use-website-architecture-content";
import { decodePath } from "@/lib/smart-sitemap";
import { architectureRequestHref } from "@/lib/website-architecture-navigation";
import type {
  ArchitectureContentArtifact,
  ArchitectureContentTag,
} from "@/types/website-architecture-content-types";

type ArtifactQuery = UseQueryResult<ArchitectureContentArtifact | null, Error>;

const OptimizeActions = createContext<{
  byPageId: Map<string, ArtifactQuery>;
  tagsByUrl: Map<string, ArchitectureContentTag>;
  tagsLoading: boolean;
  href: (page: SmartSitemapListPage, pageId: string, inFlight?: boolean) => string;
  open: (page: SmartSitemapListPage, button: HTMLButtonElement) => void;
} | null>(null);

function isTagInFlight(tag: ArchitectureContentTag | undefined) {
  return tag?.status === "pending" || tag?.status === "processing";
}

function PreviewLinkLabel({ label, inFlight, hasError }: { label: string; inFlight: boolean; hasError: boolean }) {
  const { pending } = useLinkStatus();
  const Icon = hasError ? CircleAlert : Eye;
  return (
    <>
      {pending || (inFlight && !hasError) ? <MassicAmoebaLoader size={16} label={null} /> : <Icon aria-hidden />}
      {pending ? "Opening…" : label}
    </>
  );
}

export function WebV2OptimizeActionCell({ page }: { page: SmartSitemapListPage }) {
  const actions = useContext(OptimizeActions);
  if (!actions) return null;

  if (actions.tagsLoading) {
    return <Skeleton className="h-8 w-[100px]" aria-label="Loading page status" />;
  }

  const tag = actions.tagsByUrl.get(page.path);
  const pageId = tag?.page_id ?? null;
  const query = pageId ? actions.byPageId.get(pageId) : undefined;
  const status = query?.data === undefined ? tag?.status ?? null : query.data?.request_status ?? null;
  const inFlight = status === "processing" || status === "pending";
  const paused = query?.data?.current?.status === "needs_answers";
  const hasError = Boolean(query?.isError);
  const hasReadableArtifact =
    status === "success" || status === "stale" || status === "update_required";

  if (pageId && (hasError || inFlight || hasReadableArtifact)) {
    const label = hasError
      ? "Check status"
      : paused
        ? "Answer questions"
        : !inFlight
          ? "View"
          : "Optimizing…";
    return (
      <Button
        asChild
        size="sm"
        variant={inFlight && !paused ? "ghost" : "outline"}
        className="min-w-[100px] justify-center transition-colors focus-visible:ring-2 focus-visible:ring-ring active:opacity-80 motion-reduce:transition-none"
      >
        <Link
          href={actions.href(page, pageId, inFlight)}
          prefetch={false}
          aria-label={label === "View" ? "View Page" : label}
        >
          <PreviewLinkLabel label={label} inFlight={inFlight && !paused} hasError={hasError} />
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      className="min-w-[100px] justify-center transition-colors focus-visible:ring-2 focus-visible:ring-ring active:opacity-80 motion-reduce:transition-none"
      variant={status === "error" ? "outline" : "default"}
      aria-label={status === "error" ? "Retry optimize" : "Optimize Page"}
      aria-haspopup="dialog"
      onClick={(event) => actions.open(page, event.currentTarget)}
    >
      {status === "error" ? <CircleAlert aria-hidden /> : <Sparkles aria-hidden />}
      {status === "error" ? "Retry" : "Optimize"}
    </Button>
  );
}

export function WebV2OptimizeActions({
  businessId,
  pages,
  tagsByUrl,
  tagsLoading,
  children,
}: {
  businessId: string;
  pages: SmartSitemapListPage[];
  tagsByUrl: Map<string, ArchitectureContentTag>;
  tagsLoading: boolean;
  children: ReactNode;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const search = useSearchParams();
  const { artifactOptions, startByUrl, fetchTags } = useWebsiteArchitectureContent(businessId);
  const guardGenerate = useFeatureActionGuard("web.generatePage");
  const [selected, setSelected] = useState<SmartSitemapListPage | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const submitLock = useRef(false);
  const contentQueryKey = ["website-architecture-content", businessId];
  const [tracking, setTracking] = useState(() => new Set(
    client.getQueriesData<ArchitectureContentArtifact | null>({ queryKey: contentQueryKey })
      .flatMap(([, artifact]) => artifact?.request_status === "processing" ? [artifact.page_id] : []),
  ));

  const visibleRuns = useMemo(() => {
    const ids = new Set<string>();
    for (const page of pages) {
      const tag = tagsByUrl.get(page.path);
      if (tag?.page_id && isTagInFlight(tag)) ids.add(tag.page_id);
    }
    return ids;
  }, [pages, tagsByUrl]);

  const selectedTag = selected ? tagsByUrl.get(selected.path) : undefined;
  const selectedPageId = selectedTag?.page_id ?? null;

  const pageIds = useMemo(() => [...new Set([
    ...visibleRuns,
    ...tracking,
    ...(selectedPageId ? [selectedPageId] : []),
  ])], [selectedPageId, tracking, visibleRuns]);

  const results = useQueries({
    queries: pageIds.map((pageId) => {
      const watching = tracking.has(pageId) || visibleRuns.has(pageId);
      return {
        ...artifactOptions(pageId, watching),
        enabled: watching || selectedPageId === pageId,
      };
    }),
  });
  const byPageId = new Map(pageIds.map((pageId, index) => [pageId, results[index]]));

  useEffect(() => {
    const next = new Set(tracking);
    let finished = false;
    for (const [pageId, query] of byPageId) {
      const status = query.data?.request_status;
      if ((status === "success" || status === "error") && !query.isError && !query.isFetching) {
        finished = next.delete(pageId) || finished;
      } else if (status === "processing" || visibleRuns.has(pageId)) {
        next.add(pageId);
      }
    }
    if (next.size !== tracking.size || [...next].some((pageId) => !tracking.has(pageId))) {
      setTracking(next);
    }
    if (finished) void client.invalidateQueries({ queryKey: ["website-architecture-tags", businessId] });
  }, [businessId, byPageId, client, tracking, visibleRuns]);

  const buildHref = (page: SmartSitemapListPage, pageId: string, inFlight = false) =>
    architectureRequestHref(businessId, pageId, search, {
      title: decodePath(page.path),
      run: inFlight ? "optimize" : undefined,
      v2Scope: "optimize",
    });

  const mutation = useMutation({
    retry: false,
    mutationFn: async (request: { page: SmartSitemapListPage; instructions: string }) => {
      try {
        const artifact = await startByUrl({
          url: request.page.path,
          instructions: request.instructions,
        });
        return {
          pageId: artifact.page_id,
          inFlight: artifact.request_status === "processing",
        };
      } catch (error) {
        if (!isAxiosError(error) || error.response?.status !== 409) throw error;
        let pageId = tagsByUrl.get(request.page.path)?.page_id ?? null;
        if (!pageId) {
          const fresh = await fetchTags([request.page.path]);
          pageId = fresh[0]?.page_id ?? null;
        }
        if (!pageId) throw error;
        return { pageId, inFlight: true };
      }
    },
  });

  const selectedQuery = selectedPageId ? byPageId.get(selectedPageId) : undefined;
  const selectedStatus = selectedQuery?.data?.request_status;
  const selectedReady = Boolean(
    selectedPageId &&
    selectedQuery &&
    !selectedQuery.isFetching &&
    !selectedQuery.isError &&
    (selectedStatus === "success" || selectedStatus === "processing"),
  );

  useEffect(() => {
    if (!selected || !selectedPageId || !selectedReady || mutation.isPending || submitLock.current) return;
    router.push(buildHref(selected, selectedPageId, selectedStatus === "processing"));
    setSelected(null);
  }, [mutation.isPending, router, selected, selectedPageId, selectedReady, selectedStatus]);

  const submit = (page: SmartSitemapListPage, instructions: string) => {
    if (submitLock.current || !guardGenerate()) return;
    submitLock.current = true;
    mutation.mutate({ page, instructions }, {
      onSuccess: ({ pageId, inFlight }) => {
        void client.invalidateQueries({ queryKey: ["website-architecture-tags", businessId] });
        router.push(buildHref(page, pageId, inFlight));
        setSelected(null);
      },
      onSettled: () => {
        submitLock.current = false;
      },
    });
  };

  return (
    <OptimizeActions.Provider value={{
      byPageId,
      tagsByUrl,
      tagsLoading,
      href: buildHref,
      open: (page, button) => {
        mutation.reset();
        trigger.current = button;
        setSelected(page);
      },
    }}>
      {children}
      <Dialog open={selected !== null} onOpenChange={(open) => {
        if (!open && !submitLock.current) setSelected(null);
      }}>
        {selected && (
          <OptimizeContentDialog
            key={selected.id}
            page={selected}
            query={selectedQuery}
            starting={mutation.isPending}
            opening={selectedReady}
            startError={mutation.error}
            submit={(instructions) => submit(selected, instructions)}
            restoreFocus={(event) => {
              if (!trigger.current?.isConnected) return;
              event.preventDefault();
              trigger.current.focus();
            }}
          />
        )}
      </Dialog>
    </OptimizeActions.Provider>
  );
}

function OptimizeContentDialog({
  page,
  query,
  starting,
  opening,
  startError,
  submit,
  restoreFocus,
}: {
  page: SmartSitemapListPage;
  query: ArtifactQuery | undefined;
  starting: boolean;
  opening: boolean;
  startError: Error | null;
  submit: (instructions: string) => void;
  restoreFocus: (event: Event) => void;
}) {
  const [instructions, setInstructions] = useState("");
  const checking = Boolean(query && (query.isFetching || query.isPending));
  const failed = query?.data?.request_status === "error";
  const busy = checking || starting || opening;

  return (
    <DialogContent className="gap-0 p-0 sm:max-w-[520px]" onCloseAutoFocus={restoreFocus}>
      <header className="space-y-1 border-b px-4 py-4 pr-12">
        <DialogTitle className="text-xl font-medium">Optimize page</DialogTitle>
        <DialogDescription className="break-words">{decodePath(page.path)}</DialogDescription>
      </header>
      <form aria-busy={busy} onSubmit={(event) => {
        event.preventDefault();
        if (!busy && !query?.isError) submit(instructions);
      }}>
        <div className="space-y-3 px-4 pt-4">
          {checking || opening ? (
            <div className="space-y-2" aria-hidden>
              <Skeleton className="h-4 w-32 motion-reduce:animate-none" />
              <Skeleton className="h-22 w-full motion-reduce:animate-none" />
            </div>
          ) : query?.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {architectureRequestError(query.error, "Couldn’t check this page.")}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="optimize-instructions" className="text-sm font-medium">
                  Instructions <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  id="optimize-instructions"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  maxLength={ARCHITECTURE_INSTRUCTIONS_LIMIT}
                  placeholder="What should this page emphasize or avoid?"
                  rows={4}
                  disabled={starting}
                />
              </div>
              {(startError || failed) && (
                <p role="alert" className="text-sm text-destructive">
                  {architectureRequestError(
                    startError,
                    startError ? "Couldn’t start this request." : "The last request failed.",
                  )}
                </p>
              )}
            </>
          )}
        </div>
        <DialogFooter className="px-4 py-4 sm:justify-start">
          {busy ? (
            <Button type="button" disabled className="disabled:opacity-60">
              <MassicAmoebaLoader size={16} label={null} />
              {starting ? "Starting…" : opening ? "Opening…" : "Checking page…"}
            </Button>
          ) : query?.isError ? (
            <Button type="button" onClick={() => void query.refetch()}>Check again</Button>
          ) : (
            <Button type="submit">{startError || failed ? "Try again" : "Optimize"}</Button>
          )}
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
