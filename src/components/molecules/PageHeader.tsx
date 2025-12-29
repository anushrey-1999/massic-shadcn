"use client";

import { ChevronRight, Download, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Typography } from "../ui/typography";

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
  return (
    <div className="w-full border-b border-border">
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

        {isButton && (
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
        )}
      </div>
    </div>
  );
}

export default PageHeader;
