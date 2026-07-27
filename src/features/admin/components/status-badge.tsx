import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  strong: "border-emerald-200 bg-emerald-50 text-emerald-800",
  dip: "border-amber-200 bg-amber-50 text-amber-900",
  check: "border-red-200 bg-red-50 text-red-800",
  no_signal: "border-neutral-200 bg-neutral-50 text-neutral-600",
};

export function AdminStatusBadge({
  status,
}: {
  status: keyof typeof styles | string;
}) {
  const normalized =
    status in styles ? (status as keyof typeof styles) : "no_signal";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs shadow-[0_1px_1px_rgba(10,10,10,0.03)] transition-colors duration-150",
        styles[normalized],
      )}
    >
      <Circle className="size-2 fill-current" />
      {normalized
        .replace("_", " ")
        .replace(/^./, (value) => value.toUpperCase())}
    </span>
  );
}
