"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { PageHeader } from "@/components/molecules/PageHeader";
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";
import { Button } from "@/components/ui/button";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import {
  architectureRequestError,
  isArchitectureContentRunning,
  isArchitecturePageId,
  useWebsiteArchitectureContent,
} from "@/hooks/use-website-architecture-content";
import { architectureListHref, architectureRequestHref } from "@/lib/website-architecture-navigation";
import type { ArchitectureContentStage } from "@/types/website-architecture-content-types";
import { ArchitectureQuestions, ArchitectureQuestionHistory } from "./website-architecture-questions";
import { WebsiteArchitectureRenderer } from "./website-architecture-renderer";

const STAGE_MESSAGES: Record<ArchitectureContentStage, string> = {
  adhoc: "Finding where this page fits…",
  brief: "Planning the page…",
  writing: "Writing the page…",
  composition: "Assembling the preview…",
};

const FAILURE_MESSAGES = new Map([
  ["page_busy", "The matching page already has a request in progress. Check its status in Web."],
  ["body_unavailable", "Massic couldn’t read the live page. Check that the URL is reachable before trying again."],
  ["turn", "Massic couldn’t save a page for this request. Return to Web to try again."],
]);

export function WebsiteArchitecturePreview({ businessId, pageId }: { businessId: string; pageId: string }) {
  const { profileData } = useBusinessProfileById(businessId);
  const scrollRegion = useRef<HTMLDivElement>(null);
  const search = useSearchParams();
  const backHref = architectureListHref(businessId, search);
  const backLabel = search.get("architectureOrigin") === "v2" ? "Web V2" : "Web Architecture";
  const title = search.get("title")?.trim().slice(0, 200);
  const runParam = search.get("run");
  const run = runParam === "generate" || runParam === "optimize" ? runParam : undefined;
  const site = profileData?.Website?.trim().replace(/^sc-domain:/i, "");
  const siteUrl = site && (/^https?:\/\//i.test(site) ? site : `https://${site}`);

  return (
    <div className="flex h-dvh min-w-0 flex-col overflow-hidden">
      <div className="[&_nav]:min-w-0 [&_nav]:flex-wrap [&_nav>span]:min-w-0 [&_nav>span]:[overflow-wrap:anywhere]">
        <PageHeader showAskMassic={false} breadcrumbs={[
          { label: "Home", href: "/" },
          { label: profileData?.Name || profileData?.DisplayName || "Business" },
          { label: backLabel, href: backHref },
          { label: "Preview" },
        ]} />
      </div>
      <div ref={scrollRegion} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 [overflow-anchor:none] sm:px-6">
        <div className="w-full max-w-4xl space-y-5">
          <Button asChild variant="ghost" className="gap-2">
            <Link href={backHref}><ArrowLeft aria-hidden className="h-4 w-4" />Back</Link>
          </Button>
          <EntitlementsGuard
            entitlement="web"
            businessId={businessId}
            loadingFallback={<PreviewLoading title={title} message={run === "optimize" ? "Optimizing page…" : run === "generate" ? "Generating page…" : "Loading preview…"} />}
          >
            <PreviewContent key={JSON.stringify([businessId, pageId])} businessId={businessId} pageId={pageId} site={siteUrl} title={title} run={run} scrollRegion={scrollRegion} />
          </EntitlementsGuard>
        </div>
      </div>
    </div>
  );
}

function PreviewContent({
  businessId, pageId, site, title, run, scrollRegion,
}: {
  businessId: string;
  pageId: string;
  site?: string;
  title?: string;
  run?: "generate" | "optimize";
  scrollRegion: RefObject<HTMLDivElement | null>;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const client = useQueryClient();
  const followed = useRef<string | null>(null);
  const { artifactOptions, submitAnswers } = useWebsiteArchitectureContent(businessId);
  const query = useQuery(artifactOptions(pageId, Boolean(run)));
  const artifact = query.data;
  const status = artifact?.request_status;
  const v2 = artifact?.schema_version === 2;
  const sourceId = artifact?.request?.from_page_id;
  const hasSource = v2 && isArchitecturePageId(sourceId) && sourceId !== pageId;
  const source = useQuery({
    ...artifactOptions(hasSource ? sourceId : "", true),
    enabled: hasSource,
    refetchInterval: false,
  });
  const rounds = [...(source.data?.answered ?? []), ...(artifact?.answered ?? [])];
  const pageTitle = title || artifact?.assembly?.page?.h1?.trim() ||
    (!v2 ? artifact?.package?.page?.h1?.trim() || artifact?.package?.page?.title_tag?.trim() : undefined) ||
    (artifact?.origin === "ad_hoc" ? "New page" : undefined);
  const optimize = artifact?.action ? artifact.action === "OPTIMIZE" : run === "optimize";
  const stage = artifact?.current?.stage;
  const paused = v2 && artifact.current?.status === "needs_answers";
  const processing = isArchitectureContentRunning(artifact);
  const destination = status === "success" ? artifact?.resolved_page_id : null;
  const handoffHref = isArchitecturePageId(destination) && destination !== pageId && search.get("architectureHandoff") !== "1"
    ? architectureRequestHref(businessId, destination, search, { run: "generate", handoff: true })
    : null;
  const shouldRefreshList = status === "success" || status === "error" ||
    (artifact?.origin === "ad_hoc" && stage !== undefined && stage !== "adhoc");

  useLayoutEffect(() => {
    // Replacing a long question form with progress or the result can leave the
    // viewport scrolled to the old submit button.
    if (!paused && status && scrollRegion.current) scrollRegion.current.scrollTop = 0;
  }, [paused, scrollRegion, status]);

  useEffect(() => {
    if (shouldRefreshList) void client.invalidateQueries({ queryKey: ["website-architecture", businessId] });
  }, [businessId, client, shouldRefreshList, status]);

  useEffect(() => {
    if (!handoffHref || followed.current === handoffHref) return;
    followed.current = handoffHref;
    router.replace(handoffHref);
  }, [handoffHref, router]);

  const round = paused ? artifact.questions : null;
  if (round && Array.isArray(round.questions) && round.questions.length) {
    return (
      <>
        <PreviewTitle title={pageTitle || "Page preview"} />
        <ArchitectureQuestions
          key={JSON.stringify([round.stage, round.asked_at, round.questions])}
          round={round}
          submit={(answers) => submitAnswers(pageId, answers)}
          refresh={async () => (await query.refetch()).isSuccess}
          reading={query.isFetching}
          readFailed={query.isError}
        />
        <ArchitectureQuestionHistory rounds={rounds} />
      </>
    );
  }

  if (query.isError || paused) {
    return (
      <section className="space-y-3 border-b pb-5">
        <PreviewTitle title={pageTitle || "Page preview"} />
        <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          {architectureRequestError(query.error, paused ? "The questions for this request could not be loaded." : "Couldn’t check this page.")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="transition-colors focus-visible:ring-2 focus-visible:ring-foreground active:opacity-80 disabled:opacity-60 motion-reduce:transition-none"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {query.isFetching ? <MassicAmoebaLoader size={16} label={null} /> : null}
          {query.isFetching ? "Checking…" : "Check again"}
        </Button>
      </section>
    );
  }
  if (handoffHref || processing || query.isPending) {
    const message = handoffHref ? "Opening the matching page…" : processing
      ? (v2 && stage && STAGE_MESSAGES[stage]) || (optimize ? "Optimizing page…" : "Generating page…")
      : "Loading preview…";
    return (
      <>
        <PreviewLoading title={pageTitle} message={message} />
        <ArchitectureQuestionHistory rounds={rounds} />
      </>
    );
  }

  const noChange = v2 && artifact.current?.status === "no_change";
  const failure = status === "error";
  const reasons = artifact?.current?.reasons ?? [];
  let resultMessage = "This page has no generated content yet.";
  if (destination != null) {
    resultMessage = "Massic couldn’t open the matching page. Return to Web to find the page in the list.";
  } else if (failure) {
    resultMessage = reasons.map(({ code }) => FAILURE_MESSAGES.get(code)).find(Boolean) ??
      "Massic couldn’t finish this request. Return to Web to try again.";
  } else if (noChange) {
    resultMessage = "No changes needed. Massic reviewed the request and left the page as it was.";
  }
  return (
    <>
      {artifact && status === "success" && !noChange && destination == null ? (
        <WebsiteArchitectureRenderer artifact={artifact} site={site} pageTitle={pageTitle} />
      ) : (
        <section className="space-y-2 border-b pb-5">
          <PreviewTitle title={pageTitle || "Page preview"} />
          <p role={failure || destination != null ? "alert" : "status"} className="text-sm text-foreground/75">
            {resultMessage}
          </p>
        </section>
      )}
      <ArchitectureQuestionHistory rounds={rounds} />
    </>
  );
}

function PreviewTitle({ title }: { title: string }) {
  return <h1 className="min-w-0 break-words text-2xl font-medium tracking-tight sm:text-3xl">{title}</h1>;
}

function PreviewLoading({ title, message }: { title?: string; message: string }) {
  return (
    <section className="space-y-5">
      <header className="space-y-2">
        {title ? <PreviewTitle title={title} /> : <Skeleton aria-hidden className="h-8 w-2/3 max-w-72 motion-reduce:animate-none" />}
        <p role="status" className="flex items-center gap-2 text-sm text-foreground/75">
          <MassicAmoebaLoader size={20} label={null} />
          {message}
        </p>
      </header>
      <div aria-hidden className="space-y-5 rounded-lg border bg-background px-4 py-6 sm:px-8">
        <Skeleton className="h-8 w-2/3 max-w-sm motion-reduce:animate-none" />
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-full max-w-xl motion-reduce:animate-none" />
          <Skeleton className="h-4 w-5/6 max-w-lg motion-reduce:animate-none" />
        </div>
        <div className="space-y-3 border-t pt-5">
          <Skeleton className="h-5 w-2/5 max-w-48 motion-reduce:animate-none" />
          <Skeleton className="h-4 w-full max-w-xl motion-reduce:animate-none" />
          <Skeleton className="h-4 w-3/4 max-w-md motion-reduce:animate-none" />
        </div>
      </div>
    </section>
  );
}
