"use client";

import { Bot, Download, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Typography } from "../ui/typography";
import { useParams, usePathname } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  onDownload?: () => void;
  onSettings?: () => void;
  isButton?: boolean;
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
  trial,
  onUpgrade,
}: PageHeaderProps) {
  const params = useParams();
  const pathname = usePathname();
  const rawBusinessId = (params as any)?.id as string | string[] | undefined;
  const businessId = Array.isArray(rawBusinessId)
    ? rawBusinessId[0]
    : rawBusinessId || null;
  const isBusinessPage = pathname.startsWith("/business/");

  return (
    <div className="w-full border-b border-border bg-foreground-light">
      <div className="w-full max-w-[1224px] px-7 py-3 flex items-center justify-between">
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

          {isBusinessPage && businessId ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Link href={`/business/${businessId}/agent`}>
                <Bot className="h-4 w-4 text-general-primary" />
                <span className="bg-linear-to-r from-general-primary to-general-primary-gradient-to bg-clip-text text-transparent">
                  Ask Massic
                </span>
              </Link>
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
