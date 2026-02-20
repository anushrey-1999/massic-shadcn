"use client";

import * as React from "react";
import { ArrowLeft, Copy, Download } from "lucide-react";
import { toast } from "sonner";

import { HeaderBlock } from "@/components/organisms/SnapshotReport/HeaderBlock";
import { QuickEvaluationBlock } from "@/components/organisms/SnapshotReport/QuickEvaluationBlock";
import { ProfileStrip, type ProfileTag } from "@/components/organisms/SnapshotReport/ProfileStrip";
import { RecommendedTacticsBlock } from "@/components/organisms/SnapshotReport/RecommendedTacticsBlock";
import { ReportFooter } from "@/components/organisms/SnapshotReport/ReportFooter";
import type { Competitor } from "@/components/organisms/SnapshotReport/TopCompetitorsBlock";
import { TopCompetitorsBlock } from "@/components/organisms/SnapshotReport/TopCompetitorsBlock";
import { TierBlock } from "@/components/organisms/SnapshotReport/TierBlock";
import { Button } from "@/components/ui/button";
import { DownloadReportDialog } from "@/components/organisms/ReportDetail/download-report-dialog";
import type { ExpressPitch, ExpressPitchTactic } from "@/hooks/use-pitch-reports";
import { snapshotReportToMarkdown } from "@/utils/snapshot-report-to-markdown";
import { ContentConverter } from "@/utils/content-converter";
import { copyToClipboard } from "@/utils/clipboard";
import { generatePdfFromSnapshotTemplate } from "@/utils/pdf-generator";

type SnapshotReportViewerProps = {
  expressPitch: ExpressPitch;
  generatedAt?: string;
  profileTags?: ProfileTag[];
  competitors?: Competitor[];
  footerSummary?: string;
  quickEvaluation?: unknown;
  quickEvaluationLoading?: boolean;
  quickEvaluationErrorMessage?: string;
  onBack: () => void;
  onCopy?: (draft: ExpressPitch) => void;
  onDownload?: (draft: ExpressPitch) => void;
};

function normalizeDraft(pitch: ExpressPitch): ExpressPitch {
  const tactics = Array.isArray(pitch.tactics) ? [...pitch.tactics] : [];
  tactics.sort((a, b) => Number(a.priority) - Number(b.priority));

  const normalizedTactics: ExpressPitchTactic[] = tactics.map((t) => ({
    priority: Number(t.priority),
    tactic: String(t.tactic || ""),
    context: String(t.context || ""),
  }));

  return {
    ...pitch,
    url: pitch.url != null ? String(pitch.url) : "",
    tier: pitch.tier != null ? Number(pitch.tier) : undefined,
    tier_label: pitch.tier_label != null ? String(pitch.tier_label) : "",
    why: pitch.why != null ? String(pitch.why) : "",
    tactics: normalizedTactics,
  };
}

export function SnapshotReportViewer({
  expressPitch,
  generatedAt,
  profileTags,
  competitors,
  footerSummary,
  quickEvaluation,
  quickEvaluationLoading = false,
  quickEvaluationErrorMessage,
  onBack,
  onCopy,
  onDownload,
}: SnapshotReportViewerProps) {
  const sourceKey = React.useMemo(() => {
    const url = String(expressPitch?.url || "");
    const tier = String(expressPitch?.tier ?? "");
    const tacticsCount = Array.isArray(expressPitch?.tactics)
      ? expressPitch.tactics.length
      : 0;
    return `${url}|${tier}|${tacticsCount}`;
  }, [expressPitch]);

  const [draft, setDraft] = React.useState<ExpressPitch>(() => normalizeDraft(expressPitch));
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setDraft(normalizeDraft(expressPitch));
  }, [sourceKey]);

  const tactics = Array.isArray(draft.tactics) ? draft.tactics : [];

  const markdownForExport = React.useMemo(() => {
    return snapshotReportToMarkdown({
      expressPitch: draft,
      generatedAt,
      profileTags,
      quickEvaluation,
      competitors,
      footerSummary,
    });
  }, [draft, generatedAt, profileTags, quickEvaluation, competitors, footerSummary]);

  const defaultFilename = React.useMemo(() => {
    const raw = String(draft.url || "").trim();
    const withoutProtocol = raw.replace(/^https?:\/\//i, "");
    const host = withoutProtocol.split("/")[0]?.trim();
    return host ? `SEO Snapshot Report - ${host}` : "SEO Snapshot Report";
  }, [draft.url]);

  const handleCopy = React.useCallback(async () => {
    if (onCopy) {
      onCopy(draft);
      return;
    }

    const markdown = String(markdownForExport || "").trim();
    if (!markdown) {
      toast.error("Nothing to copy yet");
      return;
    }

    const htmlContent = ContentConverter.markdownToHtml(markdown);

    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const clipboardItem = new ClipboardItem({
          "text/html": new Blob([htmlContent], { type: "text/html" }),
          "text/plain": new Blob([markdown], { type: "text/plain" }),
        });
        await navigator.clipboard.write([clipboardItem]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
      } else {
        const ok = await copyToClipboard(markdown);
        if (!ok) throw new Error("copy failed");
      }
      toast.success("Copied");
    } catch {
      toast.error("Failed to copy");
    }
  }, [onCopy, draft, markdownForExport]);

  const handleDownload = React.useCallback(() => {
    if (onDownload) {
      onDownload(draft);
      return;
    }

    const markdown = String(markdownForExport || "").trim();
    if (!markdown) {
      toast.error("Nothing to download yet");
      return;
    }
    setIsDownloadDialogOpen(true);
  }, [onDownload, draft, markdownForExport]);

  return (
    <div className="h-full bg-white rounded-lg p-6 flex flex-col gap-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleCopy}
            disabled={!String(markdownForExport || "").trim()}
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          <Button
            className="gap-2"
            onClick={handleDownload}
            disabled={!String(markdownForExport || "").trim()}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6">
        <HeaderBlock
          title="SEO Snapshot Report"
          url={String(draft.url || "")}
          generatedAt={generatedAt}
        />

        <TierBlock
          tier={Number.isFinite(draft.tier as number) ? (draft.tier as number) : null}
          tierLabel={String(draft.tier_label || "")}
          why={String(draft.why || "")}
          onTierLabelChange={(value) =>
            setDraft((prev) => ({ ...prev, tier_label: value }))
          }
          onWhyChange={(value) => setDraft((prev) => ({ ...prev, why: value }))}
        />

        <ProfileStrip tags={profileTags || []} />

        <QuickEvaluationBlock
          data={quickEvaluation}
          isLoading={quickEvaluationLoading}
          errorMessage={quickEvaluationErrorMessage}
        />

        <TopCompetitorsBlock competitors={competitors || []} />

        <RecommendedTacticsBlock
          tactics={tactics}
          onTacticChange={(index, next) =>
            setDraft((prev) => {
              const current = Array.isArray(prev.tactics) ? [...prev.tactics] : [];
              if (index < 0 || index >= current.length) return prev;
              current[index] = next;
              return { ...prev, tactics: current };
            })
          }
        />

        <ReportFooter summary={footerSummary} />
      </div>

      <DownloadReportDialog
        isOpen={isDownloadDialogOpen}
        onClose={() => setIsDownloadDialogOpen(false)}
        markdownContent={markdownForExport}
        defaultFilename={defaultFilename}
        onDownloadPdf={(filename) =>
          generatePdfFromSnapshotTemplate({
            expressPitch: draft,
            quickEvaluation,
            profileTags,
            competitors,
            footerSummary,
            filename,
            generatedAt,
          })
        }
      />
    </div>
  );
}

