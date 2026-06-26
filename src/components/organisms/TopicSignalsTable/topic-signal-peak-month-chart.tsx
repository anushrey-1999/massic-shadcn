"use client";

import type { TopicSignalRow } from "@/types/topic-signals-types";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fullMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function TopicSignalPeakMonthChart({ row }: { row: TopicSignalRow }) {
  const peakSet = new Set(row.seasonal_peak_months || []);
  return (
    <div className="grid grid-cols-12 gap-1">
      {months.map((month, index) => {
        const isPeak = peakSet.has(fullMonths[index]);
        return (
          <div key={month} className="flex flex-col items-center gap-1">
            <div
              className={`h-12 w-full rounded-md border transition-colors ${
                isPeak
                  ? "border-blue-300 bg-blue-100"
                  : "border-slate-100 bg-slate-50"
              }`}
              title={fullMonths[index]}
            />
            <span className={`text-[10px] ${isPeak ? "font-medium text-blue-700" : "text-muted-foreground"}`}>
              {month}
            </span>
          </div>
        );
      })}
    </div>
  );
}
