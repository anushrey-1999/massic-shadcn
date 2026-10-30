import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECONDARY_BUTTON_CLASS } from "../controls";

interface StepLayoutProps {
  /** Omitted when the step shows its own heading inside the body. */
  title?: string;
  line?: string;
  children: ReactNode;
  /** Omitted when the step renders its own footer, e.g. inside a form. */
  footer?: ReactNode;
  className?: string;
}

/** Title, one line of context, the step body, then the footer pinned to the bottom. */
export function StepLayout({
  title,
  line,
  children,
  footer,
  className,
}: StepLayoutProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {title && (
        <header className="shrink-0 pb-4">
          <h2 className="text-lg font-medium text-general-foreground">
            {title}
          </h2>
          {line && (
            <p className="mt-0.5 text-sm text-general-muted-foreground">
              {line}
            </p>
          )}
        </header>
      )}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {footer}
    </div>
  );
}

interface StepFooterProps {
  onBack?: () => void;
  /** Muted text shown beside the actions. */
  note?: ReactNode;
  children: ReactNode;
}

export function StepFooter({ onBack, note, children }: StepFooterProps) {
  return (
    <footer className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-general-border pt-4">
      <div className="flex min-w-0 items-center gap-3">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            className={SECONDARY_BUTTON_CLASS}
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        )}
        {note && (
          <p className="text-sm text-general-muted-foreground">{note}</p>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </footer>
  );
}
