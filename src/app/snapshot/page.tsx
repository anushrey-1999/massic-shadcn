"use client";

import * as React from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { WebsiteSnapshotReportViewer } from "@/components/templates/WebsiteSnapshotReportViewer";
import {
  normalizeWebsiteSnapshotReport,
  type WebsiteSnapshotReport,
} from "@/utils/website-snapshot-report";

type PublicSnapshotState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; report: WebsiteSnapshotReport };

export default function PublicSnapshotPage() {
  const [state, setState] = React.useState<PublicSnapshotState>({
    status: "loading",
  });

  React.useEffect(() => {
    const token = window.location.hash.slice(1).trim();
    if (!token) {
      setState({
        status: "error",
        message: "This snapshot link is not available.",
      });
      return;
    }

    const controller = new AbortController();

    async function loadSnapshot() {
      try {
        const response = await fetch("/api/public/snapshot", {
          method: "POST",
          cache: "no-store",
          credentials: "omit",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Snapshot unavailable");
        }

        const payload: unknown = await response.json();
        const report = normalizeWebsiteSnapshotReport(
          payload &&
            typeof payload === "object" &&
            "report" in payload
            ? (payload as { report: unknown }).report
            : null,
        );
        if (!report) throw new Error("Snapshot unavailable");

        setState({ status: "success", report });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof Error &&
            error.message.includes("temporarily")
              ? "The snapshot service is temporarily unavailable."
              : "This snapshot link is not available.",
        });
      }
    }

    void loadSnapshot();
    return () => controller.abort();
  }, []);

  if (state.status === "success") {
    return (
      <WebsiteSnapshotReportViewer
        report={state.report}
        mode="public"
      />
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f2ec] px-4 sm:px-6">
      <div
        className="flex max-w-sm flex-col items-center text-center"
        aria-live="polite"
      >
        {state.status === "loading" ? (
          <>
            <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin text-[#123c28]" />
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-[#6d726f]">
              Loading snapshot…
            </p>
          </>
        ) : (
          <>
            <AlertCircle className="h-6 w-6 sm:h-7 sm:w-7 text-[#b0566b]" />
            <h1 className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold text-[#1c1f1d]">
              Snapshot unavailable
            </h1>
            <p className="mt-2 text-xs sm:text-sm leading-6 text-[#6d726f]">
              {state.message}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
