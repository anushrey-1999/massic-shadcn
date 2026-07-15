import { Gauge, Info } from "lucide-react";
import { formatAdminValue } from "./admin-kpi-card";

export function AdminBenchmarkCard({
  title,
  metric,
  target,
  median,
  rank,
  cohortCount,
  cohort,
}: {
  title: string;
  metric: string;
  target: number | null;
  median: number | null;
  rank: number | null;
  cohortCount: number;
  cohort: string | null;
}) {
  return (
    <section
      className="admin-panel admin-panel-hover rounded-lg border p-4"
      aria-labelledby="benchmark-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="benchmark-title" className="text-sm font-medium">
            {title}
          </h2>
          <p className="mt-1 text-xs text-general-muted-foreground">
            Compared with {cohort || "the matching network cohort"}.
          </p>
        </div>
        <span className="flex size-8 items-center justify-center rounded-md bg-general-primary/8 text-general-primary">
          <Gauge className="size-4" />
        </span>
      </div>
      {cohortCount === 0 ? (
        <div className="mt-5 flex gap-2 rounded-md bg-general-primary-foreground p-3 text-sm text-general-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          No comparable businesses are available outside this entity.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 overflow-hidden rounded-lg border border-general-border/80 bg-white/55 sm:grid-cols-3 sm:divide-x sm:divide-general-border/80">
          <div className="p-3">
            <p className="text-xs text-general-muted-foreground">This entity</p>
            <p className="mt-1 text-lg font-medium">
              {formatAdminValue(metric, target)}
            </p>
          </div>
          <div className="border-t border-general-border/80 p-3 sm:border-t-0">
            <p className="text-xs text-general-muted-foreground">
              Cohort median
            </p>
            <p className="mt-1 text-lg font-medium">
              {formatAdminValue(metric, median)}
            </p>
          </div>
          <div className="border-t border-general-border/80 p-3 sm:border-t-0">
            <p className="text-xs text-general-muted-foreground">Percentile</p>
            <p className="mt-1 text-lg font-medium">
              {rank === null ? "Value only" : `${rank.toFixed(0)}th`}
            </p>
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-general-muted-foreground">
        {cohortCount} comparison {cohortCount === 1 ? "business" : "businesses"}
        . Agency comparisons exclude the agency’s own businesses.
      </p>
    </section>
  );
}
