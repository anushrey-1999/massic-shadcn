import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetupStepProps {
  index: number;
  title: string;
  done: boolean;
  last?: boolean;
  children?: ReactNode;
}

/** One numbered step in a vertical checklist; the number turns into a check once the step is done. */
export function SetupStep({ index, title, done, last = false, children }: SetupStepProps) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium",
            done
              ? "bg-general-primary text-primary-foreground"
              : "border border-general-border-three bg-white text-general-muted-foreground"
          )}
        >
          {done ? <Check className="size-3" aria-hidden /> : index}
          {done && <span className="sr-only"> (done)</span>}
        </span>
        {!last && <span aria-hidden className="mt-1 w-px flex-1 bg-general-border" />}
      </div>
      <div className={cn("min-w-0 flex-1 space-y-2.5", !last && "pb-5")}>
        <h3 className="text-sm leading-5 font-medium text-general-foreground">{title}</h3>
        {children}
      </div>
    </li>
  );
}
