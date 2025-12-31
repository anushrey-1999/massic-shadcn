"use client";

import React from "react";
import { useParams } from "next/navigation";
import {
  Copy,
  Download,
  ArrowLeft,
  Zap,
  ListChecks,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Quote,
  List,
  ListOrdered,
  Link2,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";

import { PageHeader } from "@/components/molecules/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  useBusinessProfileById,
  useBusinessProfiles,
} from "@/hooks/use-business-profiles";
import { Badge } from "@/components/ui/badge";
import {
  useGenerateDetailedPitch,
  useStartQuickyReport,
  useQuickyReportStatus,
  useFetchReportFromDownloadUrl,
  extractSnapshotSectionsMarkdown,
} from "@/hooks/use-pitch-reports";
import { InlineTipTapEditor } from "@/components/ui/inline-tiptap-editor";

export default function PitchReportsPage() {
  const params = useParams();
  const businessId = (params as any)?.id as string | undefined;

  const startQuickyMutation = useStartQuickyReport();
  const fetchReportMutation = useFetchReportFromDownloadUrl();
  const detailedMutation = useGenerateDetailedPitch();

  const [snapshotStarted, setSnapshotStarted] = React.useState(false);

  const [activeReport, setActiveReport] = React.useState<
    "snapshot" | "detailed" | null
  >(null);
  const [reportContent, setReportContent] = React.useState<string>("");
  const [reportEditor, setReportEditor] = React.useState<Editor | null>(null);

  const quickyStatusQuery = useQuickyReportStatus({
    businessId: activeReport === "snapshot" && snapshotStarted ? businessId ?? null : null,
    enabled: activeReport === "snapshot" && snapshotStarted,
  });

  const { profiles } = useBusinessProfiles();
  const { profileData: businessProfile } = useBusinessProfileById(
    businessId ?? null
  );

  const businessName = React.useMemo(() => {
    const profileFromList = profiles.find((p) => p.UniqueId === businessId);
    return (
      profileFromList?.Name ||
      profileFromList?.DisplayName ||
      businessProfile?.Name ||
      businessProfile?.DisplayName ||
      "Business"
    );
  }, [
    profiles,
    businessId,
    businessProfile?.Name,
    businessProfile?.DisplayName,
  ]);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Pitches", href: "/pitches" },
    { label: businessName },
    { label: "Reports" },
  ];

  const isGenerating =
    detailedMutation.isPending ||
    startQuickyMutation.isPending ||
    fetchReportMutation.isPending ||
    (activeReport === "snapshot" && snapshotStarted && quickyStatusQuery.isFetching);

  const quickyStatus = React.useMemo(() => {
    const fromPoll = quickyStatusQuery.data?.status;
    const fromStart = startQuickyMutation.data?.status;
    return String(fromPoll ?? fromStart ?? "");
  }, [quickyStatusQuery.data?.status, startQuickyMutation.data?.status]);

  React.useEffect(() => {
    if (activeReport !== "snapshot") return;
    if (!snapshotStarted) return;
    if (!businessId) return;

    const status = String(quickyStatus).trim().toLowerCase();
    const snapshotFromPayload =
      extractSnapshotSectionsMarkdown(quickyStatusQuery.data) ||
      extractSnapshotSectionsMarkdown(startQuickyMutation.data);
    const downloadUrl =
      quickyStatusQuery.data?.output_data?.download_url ||
      startQuickyMutation.data?.output_data?.download_url;

    if (status !== "success") return;

    if (snapshotFromPayload && !reportContent.trim()) {
      setReportContent(snapshotFromPayload);
      return;
    }

    if (!downloadUrl) return;
    if (reportContent.trim()) return;
    if (fetchReportMutation.isPending || fetchReportMutation.isSuccess) return;

    fetchReportMutation
      .mutateAsync({ downloadUrl })
      .then((content) => {
        setReportContent(content);
      })
      .catch(() => {
        // toast handled in hook
      });
  }, [
    activeReport,
    snapshotStarted,
    businessId,
    quickyStatus,
    quickyStatusQuery.data?.output_data?.download_url,
    startQuickyMutation.data?.output_data?.download_url,
    reportContent,
    fetchReportMutation.isPending,
    fetchReportMutation.isSuccess,
  ]);

  const reportTitle = React.useMemo(() => {
    const match = (reportContent || "").match(/^#{1,6}\s+(.+)$/m);
    if (match?.[1]) return match[1].trim();
    return activeReport === "detailed"
      ? "Detailed Report"
      : activeReport === "snapshot"
        ? "Snapshot Report"
        : "Report";
  }, [reportContent, activeReport]);

  const handleCopyReport = React.useCallback(async () => {
    if (!reportEditor) {
      toast.error("Nothing to copy yet");
      return;
    }

    const htmlContent = reportEditor.getHTML();
    if (!htmlContent || !htmlContent.trim()) {
      toast.error("Nothing to copy yet");
      return;
    }

    try {
      if (typeof ClipboardItem !== "undefined") {
        const clipboardItem = new ClipboardItem({
          "text/html": new Blob([htmlContent], { type: "text/html" }),
          "text/plain": new Blob([reportEditor.getText()], {
            type: "text/plain",
          }),
        });
        await navigator.clipboard.write([clipboardItem]);
      } else {
        await navigator.clipboard.writeText(reportEditor.getText());
      }
      toast.success("Copied");
    } catch {
      try {
        await navigator.clipboard.writeText(reportEditor.getText());
        toast.success("Copied");
      } catch {
        toast.error("Copy failed");
      }
    }
  }, [reportEditor]);

  const handleDownloadPdf = React.useCallback(() => {
    // Minimal implementation: browser print dialog supports "Save as PDF".
    // We can replace this later with a dedicated PDF export pipeline.
    window.print();
  }, []);

  const showReportView = activeReport !== null;

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} showAskMassic={false} />

      <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5">
        {showReportView ? (
          <div className="h-full bg-white rounded-lg p-6 flex flex-col gap-6 overflow-hidden">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                className="gap-2"
                onClick={() => {
                  setActiveReport(null);
                  setReportContent("");
                  setReportEditor(null);
                  setSnapshotStarted(false);
                  startQuickyMutation.reset();
                  fetchReportMutation.reset();
                }}
                disabled={isGenerating}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleCopyReport}
                  disabled={isGenerating}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button
                  className="gap-2"
                  onClick={handleDownloadPdf}
                  disabled={isGenerating}
                >
                  <Download className="h-4 w-4" />
                  Download as PDF
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-border pb-3">
              <Typography variant="muted">Report Summary</Typography>
              {activeReport === "snapshot" && snapshotStarted && !reportContent.trim() ? (
                <Typography variant="muted" className="text-xs">
                  {quickyStatus ? `Status: ${quickyStatus}` : "Status: generating"}
                </Typography>
              ) : null}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="w-full">
                <Typography variant="h3" className="mb-4">
                  {reportTitle}
                </Typography>

                <div className="flex w-full items-center gap-2 border rounded-md px-2 py-1 mb-3">
                  {[Bold, Italic, Underline, Strikethrough, Quote, List, ListOrdered, Link2].map((Icon, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      size="icon"
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (!reportEditor) return;

                        switch (idx) {
                          case 0:
                            reportEditor.chain().focus().toggleBold().run();
                            break;
                          case 1:
                            reportEditor.chain().focus().toggleItalic().run();
                            break;
                          case 2:
                            reportEditor.chain().focus().toggleUnderline().run();
                            break;
                          case 3:
                            reportEditor.chain().focus().toggleStrike().run();
                            break;
                          case 4:
                            reportEditor.chain().focus().toggleBlockquote().run();
                            break;
                          case 5:
                            reportEditor.chain().focus().toggleBulletList().run();
                            break;
                          case 6:
                            reportEditor.chain().focus().toggleOrderedList().run();
                            break;
                          case 7: {
                            const url = window.prompt("Enter URL:");
                            if (url) {
                              reportEditor.chain().focus().setLink({ href: url }).run();
                            }
                            break;
                          }
                        }
                      }}
                      disabled={!reportEditor || isGenerating}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  ))}
                </div>

                <InlineTipTapEditor
                  content={reportContent || (isGenerating ? "Generating..." : "")}
                  isEditable={!isGenerating}
                  onEditorReady={setReportEditor}
                  placeholder="Write your report here..."
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 h-full bg-white rounded-lg items-center justify-center p-6">
          <Card className="bg-white border border-general-primary p-8 h-[652px] w-[488px] shadow-none">
            <CardContent className="p-0 h-full flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Zap className="h-7.5 w-7.5 text-general-primary" />
                <Typography
                  variant="h2"
                  className="text-general-primary font-semibold"
                >
                  Snapshot
                </Typography>
              </div>

              <div className="flex gap-2">
                <Badge
                  variant={"outline"}
                  className="text-[10px] text-primary py-1"
                >
                  5 pitches included in your Starter plan
                </Badge>
                <Badge
                  variant={"secondary"}
                  className="text-[10px] text-primary py-1"
                >
                  2 of 5 used
                </Badge>
              </div>

              <div className="flex-1">
                <Typography variant="p" className="text-primary">
                  A super-fast, low-cost snapshot of your SEO opportunity. In
                  10-20 seconds, it gives you a personalized, high-impact teaser
                  of where you stand and what you could gain—using only your
                  basic business info and current rankings. It's designed to
                  spark quick insight and help you decide when it's worth diving
                  deeper with a full Massic Pitch.
                </Typography>
              </div>

              <div className="mt-4">
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!businessId || startQuickyMutation.isPending}
                  onClick={async () => {
                    if (!businessId) return;
                    setActiveReport("snapshot");
                    setReportContent("");
                    setSnapshotStarted(true);
                    startQuickyMutation.reset();
                    fetchReportMutation.reset();
                    await startQuickyMutation.mutateAsync({ businessId });
                  }}
                >
                  {startQuickyMutation.isPending ? "Generating..." : "Generate"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-general-primary p-8 h-[652px] w-[488px] shadow-none ">
            <CardContent className="p-0 h-full flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-7.5 w-7.5 text-general-primary" />
                <Typography
                  variant="h2"
                  className="text-general-primary font-semibold"
                >
                  Detailed
                </Typography>
              </div>

              <div className="flex gap-2">
                <Badge
                  variant={"outline"}
                  className="text-[10px] text-primary py-1"
                >
                 100 credits per pitch
                </Badge>
              </div>

              <div className="flex-1">
                <Typography
                  variant="p"
                  className="text-primary leading-relaxed"
                >
                  A full, data-driven growth proposal built from Massic's
                  complete strategy workflows. It combines deterministic
                  calculations, real search data, and the SEO Segment Matrix to
                  generate a rich, narrative plan tailored to your business.
                  This is the in-depth version—actionable, comprehensive, and
                  grounded entirely in your actual inputs and proven tactics.
                </Typography>
              </div>

              {/* <div className="mt-4">
                <Typography variant="small" className="text-general-muted-foreground text-center">
                  Generated on —
                </Typography>
              </div> */}

              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  disabled={!businessId || detailedMutation.isPending}
                  onClick={async () => {
                    if (!businessId) return;
                    setActiveReport("detailed");
                    setReportContent("");
                    const content = await detailedMutation.mutateAsync({ businessId });
                    setReportContent(content);
                  }}
                >
                  {detailedMutation.isPending ? "Loading..." : "View"}
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </div>
  );
}
