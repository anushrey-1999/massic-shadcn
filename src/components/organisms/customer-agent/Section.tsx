import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Section({ title, description, action, children, className }: SectionProps) {
  return (
    <section
      className={cn(
        "relative rounded-lg border border-general-border bg-white p-4 shadow-xs",
        className
      )}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-medium text-general-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-general-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </header>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
