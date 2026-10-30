import { creditsLeftPercent } from "@/lib/customer-agent";
import { cn } from "@/lib/utils";

const RING_SIZE = 16;
const RING_RADIUS = 6;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

interface CreditsMeterProps {
  balanceUsd: number;
  allowanceUsd: number;
  className?: string;
}

/** Credits left as a share of the plan allowance, as a small ring that empties; dollar amounts stay hidden. */
export function CreditsMeter({
  balanceUsd,
  allowanceUsd,
  className,
}: CreditsMeterProps) {
  const left = creditsLeftPercent(balanceUsd, allowanceUsd);
  const tone =
    left <= 0
      ? "stroke-red-500"
      : left <= 20
        ? "stroke-amber-500"
        : "stroke-general-primary";

  return (
    <div
      className={cn("flex shrink-0 items-center gap-1.5 text-sm", className)}
    >
      <svg
        role="progressbar"
        aria-label="Credits left"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={left}
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="-rotate-90"
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={2.5}
          className="stroke-general-border"
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - left / 100)}
          className={cn("transition-[stroke-dashoffset] duration-300", tone)}
        />
      </svg>
      <span className="font-medium tabular-nums text-general-foreground">
        {left}%
      </span>
      <span className="text-general-muted-foreground">credits left</span>
    </div>
  );
}
