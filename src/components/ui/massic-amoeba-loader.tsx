"use client";

import { cn } from "@/lib/utils";
import styles from "./massic-amoeba-loader.module.css";

type MassicAmoebaLoaderProps = {
  className?: string;
  size?: number;
  animate?: boolean;
  label?: string | null;
};

const panelPath =
  "M15.3455 0L15.3409 0.0046055H5.57266L3.47255 2.27512L2.79093 3.0166L1.83299 4.05284L1.16519 4.7713L0 6.0286H12.2414L12.6882 5.53121V5.51739L14.9679 2.99818L15.0093 2.95673L17.6667 0H15.3455Z";

/** The three-frame Figma loader, animated at Claude's 1.8-second cadence. */
export function MassicAmoebaLoader({
  className,
  size = 36,
  animate = true,
  label = "Loading",
}: MassicAmoebaLoaderProps) {
  const announced = animate && Boolean(label);

  return (
    <span
      className={cn(styles.root, className)}
      data-animate={animate}
      style={{ width: size, height: size }}
      role={announced ? "status" : undefined}
      aria-label={announced ? label ?? undefined : undefined}
      aria-hidden={announced ? undefined : true}
    >
      <svg
        className={styles.artwork}
        viewBox="0 0 17.6667 14.0852"
        fill="none"
        aria-hidden="true"
      >
        <g transform="translate(0 8.05664)">
          <path className={cn(styles.panel, styles.bottom)} d={panelPath} />
        </g>
        <g transform="translate(0 4)">
          <path className={cn(styles.panel, styles.middle)} d={panelPath} />
        </g>
        <path className={cn(styles.panel, styles.top)} d={panelPath} />
      </svg>
    </span>
  );
}
