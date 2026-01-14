"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const barOutlines = [
  {
    front: "M3.11424 27.9974H18.5225V84.8282H3.11424V27.9974Z",
    top: "M4.96974 24.8269L9.63609 19.7264L23.9548 19.7264L19.3925 24.8269L4.96974 24.8269Z",
    right: "M18.5225 27.9974L23.9548 19.7264L23.9548 84.8282L18.5225 84.8282L18.5225 27.9974Z",
  },
  {
    front: "M29.0374 19.7124H44.4456V76.5432H29.0374V19.7124Z",
    top: "M30.8916 16.5419L35.558 11.4415L49.8767 11.4415L45.3144 16.5419L30.8916 16.5419Z",
    right: "M44.4456 19.7124L49.8767 11.4415L49.8767 76.5432L44.4456 76.5432L44.4456 19.7124Z",
  },
  {
    front: "M55.111 11.4415H70.5192V68.2723H55.111V11.4415Z",
    top: "M56.9653 8.27094L61.6316 3.17053L75.9503 3.17053L71.388 8.27094L56.9653 8.27094Z",
    right: "M70.5192 11.4415L75.9503 3.17053L75.9503 68.2723L70.5192 68.2723L70.5192 11.4415Z",
  },
];

export function Loader({ className, size = "md" }: LoaderProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <svg
        width="83"
        height="88"
        viewBox="0 0 83 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative"
      >
        {barOutlines.map((bar, index) => (
          <g
            key={index}
            className="animate-loader-wave"
            style={{
              transformOrigin: "bottom",
            }}
          >
            <path
              d={bar.front}
              fill="none"
              stroke="#D4D4D4"
              strokeWidth="1"
            />
            <path
              d={bar.top}
              fill="none"
              stroke="#D4D4D4"
              strokeWidth="1"
            />
            <path
              d={bar.right}
              fill="none"
              stroke="#D4D4D4"
              strokeWidth="1"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * Full-page loader overlay for blocking operations
 */
interface LoaderOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export function LoaderOverlay({
  isLoading,
  message,
  children,
}: LoaderOverlayProps) {
  if (!isLoading) return <>{children}</>;

  return (
    <div className="relative flex-1 min-h-0">
      {/* Overlay - Fixed to viewport so it's always visible regardless of scroll position */}
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
        <Loader size="lg" />
        {message && (
          <p className="text-base" style={{ color: "#737373" }}>
            {message}
          </p>
        )}
      </div>
      {/* Content (blurred/disabled behind overlay) */}
      <div className={isLoading ? "opacity-30 pointer-events-none" : ""}>
        {children}
      </div>
    </div>
  );
}
