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
  entityKind = "business",
  period,
}: {
  title: string;
  metric: string;
  target: number | null;
  median: number | null;
  rank: number | null;
  cohortCount: number;
  cohort: string | null;
  entityKind?: "business" | "agency";
  period?: { currentStart: string; currentEnd: string };
}) {
  const entityLabel = entityKind === "agency" ? "This agency" : "This business";
  const peerLabel =
    entityKind === "agency"
      ? "Typical business outside this agency"
      : `Typical ${cohort || "similar"} business`;
  const difference =
    target === null || median === null ? null : target - median;
  const sameAtDisplayedPrecision =
    difference !== null &&
    (metric === "ctr"
      ? Math.abs(difference) < 0.00005
      : Math.abs(difference) < 0.005);
  const comparison =
    difference === null
      ? "No comparison"
      : sameAtDisplayedPrecision
        ? "About the same"
        : difference > 0
          ? "Above typical"
          : "Below typical";
  const differenceDetail =
    difference === null || sameAtDisplayedPrecision
      ? null
      : metric === "ctr"
        ? `${(Math.abs(difference) * 100).toFixed(2)} percentage points ${difference > 0 ? "higher" : "lower"}`
        : `${formatAdminValue(metric, Math.abs(difference))} ${difference > 0 ? "higher" : "lower"}`;
  const rangeLabel = period
    ? `${period.currentStart} to ${period.currentEnd}`
    : "the selected date range";
  const description =
    entityKind === "agency"
      ? `Compares the agency’s combined click-through rate (CTR) with businesses outside the agency for ${rangeLabel}. Higher CTR is better.`
      : `Compares this business’s click-through rate (CTR) with other ${cohort || "similar"} businesses in Massic for ${rangeLabel}. CTR is the share of Google search views that became clicks; higher is better.`;
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
            {description}
          </p>
        </div>
        <span className="flex size-8 items-center justify-center rounded-md bg-general-primary/8 text-general-primary">
          <Gauge className="size-4" />
        </span>
      </div>
      {cohortCount === 0 ? (
        <div className="mt-5 flex gap-2 rounded-md bg-general-primary-foreground p-3 text-sm text-general-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            {entityKind === "agency"
              ? "There are no businesses outside this agency available for a useful comparison yet."
              : `There are no other ${cohort || "similar"} businesses with a different website available for a useful comparison yet.`}
          </span>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 overflow-hidden rounded-lg border border-general-border/80 bg-white/55 sm:grid-cols-3 sm:divide-x sm:divide-general-border/80">
          <div className="p-3">
            <p className="text-xs text-general-muted-foreground">
              {entityLabel}
            </p>
            <p className="mt-1 text-lg font-medium">
              {formatAdminValue(metric, target)}
            </p>
          </div>
          <div className="border-t border-general-border/80 p-3 sm:border-t-0">
            <p className="text-xs text-general-muted-foreground">
              {peerLabel}
            </p>
            <p className="mt-1 text-lg font-medium">
              {formatAdminValue(metric, median)}
            </p>
          </div>
          <div className="border-t border-general-border/80 p-3 sm:border-t-0">
            <p className="text-xs text-general-muted-foreground">What it means</p>
            <p className="mt-1 text-lg font-medium">{comparison}</p>
            {differenceDetail && (
              <p className="mt-1 text-xs text-general-muted-foreground">
                {differenceDetail}
              </p>
            )}
          </div>
        </div>
      )}
      {cohortCount > 0 && (
        <p className="mt-4 text-xs text-general-muted-foreground">
          Based on {cohortCount} other {cohortCount === 1 ? "business" : "businesses"}.
          {" "}
          {entityKind === "agency"
            ? "The agency’s own businesses and duplicate websites are excluded."
            : "This business and duplicate website records are excluded."}
          {rank !== null && entityKind === "business"
            ? ` Its CTR is higher than about ${rank.toFixed(0)}% of the comparison businesses.`
            : ""}
        </p>
      )}
    </section>
  );
}
