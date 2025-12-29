"use client";

import * as React from "react";
import { ChevronRight, Download, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Typography } from "../ui/typography";
import { useAskMassicOverlayOptional } from "@/components/chatbot/ask-massic-overlay-provider";
import { useParams } from "next/navigation";
import { useJobByBusinessId } from "@/hooks/use-jobs";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  onDownload?: () => void;
  onSettings?: () => void;
  isButton?: boolean;
  showAskMassic?: boolean;
  trial?: {
    remainingDays?: number;
  };
  onUpgrade?: () => void;
}

export function PageHeader({
  breadcrumbs,
  onDownload,
  onSettings,
  isButton = false,
  showAskMassic,
  trial,
  onUpgrade,
}: PageHeaderProps) {
  const askMassic = useAskMassicOverlayOptional();
  const askMassicButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const params = useParams();
  const rawBusinessId = (params as any)?.id as string | string[] | undefined;
  const businessId = Array.isArray(rawBusinessId)
    ? rawBusinessId[0]
    : rawBusinessId || null;

  const { data: jobDetails } = useJobByBusinessId(
    showAskMassic === undefined ? businessId : null
  );

  const effectiveShowAskMassic =
    typeof showAskMassic === "boolean"
      ? showAskMassic
      : Boolean(jobDetails?.job_id);

  return (
    <div className="w-full border-b border-border bg-foreground-light">
      <div className="w-full max-w-[1224px] mx-auto px-7 py-3 flex items-center justify-between">
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <span key={index} className="flex items-center gap-1">
                {index > 0 && (
                  <Typography
                    variant="p"
                    className="text-general-border-three px-0.5"
                  >
                    /
                  </Typography>
                )}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-general-muted-foreground hover:text-general-foreground transition-colors "
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={
                      isLast
                        ? "font-medium text-general-foreground"
                        : "text-general-muted-foreground"
                    }
                  >
                    {item.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {trial ? (
            <div className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3">
              <span className="text-xs font-medium text-foreground whitespace-nowrap">
                You're on a free trial
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {typeof trial.remainingDays === "number" &&
                trial.remainingDays >= 0
                  ? `${trial.remainingDays} day${
                      trial.remainingDays === 1 ? "" : "s"
                    } left`
                  : "Trial active"}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 whitespace-nowrap"
                onClick={onUpgrade}
              >
                Upgrade
              </Button>
            </div>
          ) : null}

          {askMassic && effectiveShowAskMassic ? (
            <Button
              ref={askMassicButtonRef}
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const rect = askMassicButtonRef.current?.getBoundingClientRect();
                askMassic.open(
                  rect
                    ? {
                        top: rect.top,
                        left: rect.left,
                        right: rect.right,
                        bottom: rect.bottom,
                        width: rect.width,
                        height: rect.height,
                      }
                    : undefined
                );
              }}
            >
              <Image
                src="/massic-icon-green.svg"
                alt="Massic"
                width={18}
                height={18}
              />
              <span className="bg-linear-to-r from-general-primary to-general-primary-gradient-to bg-clip-text text-transparent">
                Ask Massic
              </span>
            </Button>
          ) : null}

          {isButton ? (
            <div className="flex items-center gap-2">
              <Button
                className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
                onClick={onDownload}
              >
                <Download className="h-4 w-4" />
                Download Report
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="border-border"
                onClick={onSettings}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default PageHeader;
