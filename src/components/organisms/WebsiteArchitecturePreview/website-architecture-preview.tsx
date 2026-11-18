"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/molecules/PageHeader";
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";
import { Button } from "@/components/ui/button";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import {
  architectureRequestError,
  useWebsiteArchitectureContent,
} from "@/hooks/use-website-architecture-content";
import { architectureListHref } from "@/lib/website-architecture-navigation";
import { WebsiteArchitectureRenderer } from "./website-architecture-renderer";

export function WebsiteArchitecturePreview({ businessId, pageId }: { businessId: string; pageId: string }) {
  const { profileData } = useBusinessProfileById(businessId);
  const search = useSearchParams();
  const backHref = architectureListHref(businessId, search);
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
          { label: "Web Architecture", href: backHref },
          { label: "Preview" },
        ]} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="w-full max-w-4xl space-y-5">
          <Button asChild variant="outline" size="sm" className="transition-colors focus-visible:ring-2 focus-visible:ring-foreground active:opacity-80 motion-reduce:transition-none">
            <Link href={backHref}><ArrowLeft aria-hidden />Back to Web Architecture</Link>
          </Button>
          <EntitlementsGuard
            entitlement="web"
            businessId={businessId}
            loadingFallback={<PreviewLoading title={title} message={run === "optimize" ? "Optimizing page…" : run === "generate" ? "Generating page…" : "Loading preview…"} />}
          >
            <PreviewContent businessId={businessId} pageId={pageId} site={siteUrl} title={title} run={run} />
          </EntitlementsGuard>
        </div>
      </div>
    </div>
  );
}

function PreviewContent({
  businessId, pageId, site, title, run,
}: {
  businessId: string;
  pageId: string;
  site?: string;
  title?: string;
  run?: "generate" | "optimize";
}) {
  const { artifactOptions } = useWebsiteArchitectureContent(businessId);
  const query = useQuery(artifactOptions(pageId, Boolean(run)));
  const artifact = query.data;
  const status = artifact?.request_status;
  const pageTitle = title || artifact?.assembly?.page?.h1?.trim() ||
    artifact?.package?.page?.h1?.trim() || artifact?.package?.page?.title_tag?.trim();
  const optimize = artifact?.action ? artifact.action === "OPTIMIZE" : run === "optimize";
  const processing = status === "processing" || (run && query.isFetching && status !== "success");

  if (query.isError) {
    return (
      <section className="space-y-3 border-b pb-5">
        <PreviewTitle title={pageTitle || "Page preview"} />
        <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          {architectureRequestError(query.error, "Couldn’t check this page.")}
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
  if (processing || query.isPending) {
    const message = processing ? (optimize ? "Optimizing page…" : "Generating page…") : "Loading preview…";
    return <PreviewLoading title={pageTitle} message={message} />;
  }
  if (artifact && status === "success") {
    return <WebsiteArchitectureRenderer artifact={artifact} site={site} pageTitle={pageTitle} />;
  }
  return (
    <section className="space-y-2 border-b pb-5">
      <PreviewTitle title={pageTitle || "Page preview"} />
      <p role="status" className="text-sm text-foreground/75">
        {status === "error"
          ? "This request failed. Go back to Web Architecture to try again."
          : "This page has no generated content yet."}
      </p>
    </section>
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
