import { FileText, Globe2, Share2 } from "lucide-react";
import type { Surface } from "./types";

export function SurfaceIcon({ surface, className = "h-3.5 w-3.5" }: { surface: Surface; className?: string }) {
  const Icon = surface === "global" ? Globe2 : surface === "webpages" ? FileText : Share2;
  return <Icon className={className} aria-hidden="true" />;
}
