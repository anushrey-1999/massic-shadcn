"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
  animate?: boolean;
};

const cells: Array<[number, number]> = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
  [1, 1],
  [2, 2],
  [1, 3],
  [0, 4],
  [1, 4],
  [2, 4],
  [3, 4],
  [4, 4],
];

const sequence: Array<[number, number]> = [
  [4, 0],
  [3, 0],
  [2, 0],
  [1, 0],
  [0, 0],
  [1, 1],
  [2, 2],
  [1, 3],
  [0, 4],
  [1, 4],
  [2, 4],
  [3, 4],
  [4, 4],
];

export function MassicLoader({ className, size = 36, animate = true }: Props) {
  const cell = size / 6;
  const gap = cell * 0.18;
  const box = cell - gap;

  const total = sequence.length;
  const stepMs = 110;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      aria-label="Loading"
      role="status"
    >
      {cells.map(([row, col]) => {
        const idx = sequence.findIndex(([r, c]) => r === row && c === col);
        const delay = (idx * stepMs) / 1000;
        const duration = (total * stepMs) / 1000;

        return (
          <span
            key={`${row}-${col}`}
            className="absolute rounded-[2px] bg-general-primary"
            style={{
              width: box,
              height: box,
              top: row * cell + gap / 2,
              left: col * cell + gap / 2,
              animation: animate
                ? `massicLoaderPulse ${duration}s linear infinite`
                : undefined,
              animationDelay: animate ? `${delay}s` : undefined,
              opacity: animate ? undefined : 1,
            }}
          />
        );
      })}
    </div>
  );
}
