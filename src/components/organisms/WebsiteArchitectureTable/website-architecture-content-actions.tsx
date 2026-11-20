"use client";

import Link, { useLinkStatus } from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, Eye, Sparkles } from "lucide-react";
import { useMutation, useQueries, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import {
  ARCHITECTURE_INSTRUCTIONS_LIMIT,
  architectureContentKey,
  architectureRequestError,
  useWebsiteArchitectureContent,
} from "@/hooks/use-website-architecture-content";
import { architecturePreviewHref, getArchitectureAction } from "@/lib/website-architecture-navigation";
import type { ArchitectureContentArtifact } from "@/types/website-architecture-content-types";
import type {
  WebsiteArchitecturePage,
  WebsiteArchitectureScope,
} from "@/types/website-architecture-types";

type ArtifactQuery = UseQueryResult<ArchitectureContentArtifact | null, Error>;
const ContentActions = createContext<{
  byPageId: Map<string, ArtifactQuery>;
  href: (page: WebsiteArchitecturePage, inFlight?: boolean) => string;
  open: (page: WebsiteArchitecturePage, button: HTMLButtonElement) => void;
} | null>(null);

function isInFlight(page: WebsiteArchitecturePage) {
  return page.status === "pending" || page.status === "processing";
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

export function WebsiteArchitectureActionCell({ page }: { page: WebsiteArchitecturePage }) {
  const actions = useContext(ContentActions);
  if (!actions) return null;

  const query = actions.byPageId.get(page.page_id);
  const status = query?.data === undefined ? page.status : query.data?.request_status;
  const inFlight = status === "processing" || status === "pending";
  const paused = query?.data?.current?.status === "needs_answers";
  const action = getArchitectureAction(page);
  const hasError = Boolean(query?.isError);
  if (hasError || inFlight || status === "success") {
    const label = hasError ? "Check status" : paused ? "Answer questions" : !inFlight ? "View" : action === "Optimize" ? "Optimizing…" : "Generating…";
    return (
      <Button asChild size="sm" variant={inFlight && !paused ? "ghost" : "outline"} className="transition-colors focus-visible:ring-2 focus-visible:ring-ring active:opacity-80 motion-reduce:transition-none">
        <Link
          href={actions.href(page, inFlight)}
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
      className="transition-colors focus-visible:ring-2 focus-visible:ring-ring active:opacity-80 motion-reduce:transition-none"
      variant={status === "error" ? "outline" : "default"}
      aria-label={status === "error" ? `Retry ${action.toLowerCase()}` : `${action} Page`}
      aria-haspopup="dialog"
      onClick={(event) => actions.open(page, event.currentTarget)}
    >
      {status === "error" ? <CircleAlert aria-hidden /> : <Sparkles aria-hidden />}
      {status === "error" ? "Retry" : action}
    </Button>
  );
}

export function WebsiteArchitectureActions({
  businessId,
  pages,
  v2Scope,
  children,
}: {
  businessId: string;
  pages: WebsiteArchitecturePage[];
  v2Scope?: WebsiteArchitectureScope;
  children: ReactNode;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const search = useSearchParams();
  const { artifactOptions, start } = useWebsiteArchitectureContent(businessId);
  const guardGenerate = useFeatureActionGuard("web.generatePage");
  const [selected, setSelected] = useState<WebsiteArchitecturePage | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const submitLock = useRef(false);
  const contentQueryKey = ["website-architecture-content", businessId];
  const [tracking, setTracking] = useState(() => new Set(
    client.getQueriesData<ArchitectureContentArtifact | null>({ queryKey: contentQueryKey })
      .flatMap(([, artifact]) => artifact?.request_status === "processing" ? [artifact.page_id] : []),
  ));
  const visibleRuns = new Set(pages.filter(isInFlight).map((page) => page.page_id));
  const pageIds = [...new Set([
    ...pages.map((page) => page.page_id),
    ...tracking,
    ...(selected ? [selected.page_id] : []),
  ])];
  const results = useQueries({
    queries: pageIds.map((pageId) => {
      const watching = tracking.has(pageId) || visibleRuns.has(pageId);
      return {
        ...artifactOptions(pageId, watching),
        enabled: watching || selected?.page_id === pageId,
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
    if (finished) void client.invalidateQueries({ queryKey: ["website-architecture", businessId] });
  }, [businessId, byPageId, client, tracking, visibleRuns]);

  const mutation = useMutation({
    retry: false,
    mutationFn: async (request: { pageId: string; instructions: string }) => {
      const queryKey = architectureContentKey(businessId, request.pageId);
      await client.cancelQueries({ queryKey, exact: true });
      try {
        const artifact = await start(request);
        client.setQueryData(queryKey, artifact);
        return artifact.request_status === "processing";
      } catch (error) {
        if (!isAxiosError(error) || error.response?.status !== 409) throw error;
        return true;
      }
    },
  });

  const selectedQuery = selected ? byPageId.get(selected.page_id) : undefined;
  const selectedStatus = selectedQuery?.data?.request_status;
  const selectedReady = Boolean(selectedQuery && !selectedQuery.isFetching && !selectedQuery.isError &&
    (selectedStatus === "success" || selectedStatus === "processing"));

  useEffect(() => {
    if (!selected || !selectedReady || mutation.isPending || submitLock.current) return;
    router.push(
      architecturePreviewHref(
        businessId,
        selected,
        search,
        selectedStatus === "processing",
        v2Scope,
      ),
    );
    setSelected(null);
  }, [businessId, mutation.isPending, router, search, selected, selectedReady, selectedStatus, v2Scope]);

  const submit = (page: WebsiteArchitecturePage, instructions: string) => {
    if (submitLock.current || !guardGenerate()) return;
    submitLock.current = true;
    mutation.mutate({ pageId: page.page_id, instructions }, {
      onSuccess: (inFlight) => {
        router.push(architecturePreviewHref(businessId, page, search, inFlight, v2Scope));
        setSelected(null);
      },
      onSettled: () => { submitLock.current = false; },
    });
  };

  return (
    <ContentActions.Provider value={{
      byPageId,
      href: (page, inFlight) => architecturePreviewHref(
        businessId,
        page,
        search,
        inFlight,
        v2Scope,
      ),
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
        {selected && selectedQuery && (
          <ContentDialog
            key={selected.page_id}
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
    </ContentActions.Provider>
  );
}

function ContentDialog({
  page, query, starting, opening, startError, submit, restoreFocus,
}: {
  page: WebsiteArchitecturePage;
  query: ArtifactQuery;
  starting: boolean;
  opening: boolean;
  startError: Error | null;
  submit: (instructions: string) => void;
  restoreFocus: (event: Event) => void;
}) {
  const [instructions, setInstructions] = useState("");
  const action = getArchitectureAction(page);
  const checking = query.isFetching || query.isPending;
  const failed = query.data?.request_status === "error";
  const busy = checking || starting || opening;

  return (
    <DialogContent className="gap-0 p-0 sm:max-w-[520px]" onCloseAutoFocus={restoreFocus}>
      <header className="space-y-1 border-b px-4 py-4 pr-12">
        <DialogTitle className="text-xl font-medium">{action} page</DialogTitle>
        <DialogDescription className="break-words">{page.title || page.name}</DialogDescription>
      </header>
      <form aria-busy={busy} onSubmit={(event) => {
        event.preventDefault();
        if (!busy && !query.isError) submit(instructions);
      }}>
        <div className="space-y-3 px-4 pt-4">
          {checking || opening ? (
            <div className="space-y-2" aria-hidden>
              <Skeleton className="h-4 w-32 motion-reduce:animate-none" />
              <Skeleton className="h-22 w-full motion-reduce:animate-none" />
            </div>
          ) : query.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {architectureRequestError(query.error, "Couldn’t check this page.")}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="architecture-instructions" className="text-sm font-medium">Instructions <span className="font-normal text-muted-foreground">(optional)</span></label>
                <Textarea
                  id="architecture-instructions"
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
                  {architectureRequestError(startError, startError ? "Couldn’t start this request." : "The last request failed.")}
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
          ) : query.isError ? (
            <Button type="button" onClick={() => void query.refetch()}>Check again</Button>
          ) : (
            <Button type="submit">{startError || failed ? "Try again" : action}</Button>
          )}
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
