import { FileText, Share2 } from "lucide-react";
import type { PlanSurface } from "./types";

export function PlanSurfaceIcon({ surface, className = "h-3.5 w-3.5" }: { surface: PlanSurface; className?: string }) {
  const Icon = surface === "webpages" ? FileText : Share2;
  return <Icon className={className} aria-hidden="true" />;
}
