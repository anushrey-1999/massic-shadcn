import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  /** Any CSS color; defaults to the brand primary. */
  color?: string;
  durationSeconds?: number;
}

/** Decorative light that circles the parent's border. Place inside a `relative` element with a radius. */
export function BorderBeam({ className, color, durationSeconds }: BorderBeamProps) {
  const style = {
    ...(color && { "--border-beam-color": color }),
    ...(durationSeconds && { "--border-beam-duration": `${durationSeconds}s` }),
  } as CSSProperties;

  return <span aria-hidden className={cn("border-beam", className)} style={style} />;
}
