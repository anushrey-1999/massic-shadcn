"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";

interface LoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Custom animated loader with three 3D vertical rectangles
 * Heights: small, medium, large (left to right)
 * All grow from 0 to full height together in a loop
 */
export function Loader({ className, size = "md" }: LoaderProps) {
  const sizeConfig = {
    sm: { 
      barWidth: 8, 
      heights: [16, 24, 32], 
      gap: 6, 
      container: "h-10" 
    },
    md: { 
      barWidth: 12, 
      heights: [24, 36, 48], 
      gap: 8, 
      container: "h-14" 
    },
    lg: { 
      barWidth: 16, 
      heights: [32, 48, 64], 
      gap: 10, 
      container: "h-20" 
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn("relative flex items-end gap-2", config.container)}>
        {/* Create 3 3D vertical rectangles with different heights */}
        {config.heights.map((maxHeight, index) => (
          <div
            key={index}
            className="relative animate-loader-grow"
            style={{
              width: `${config.barWidth}px`,
              height: `${maxHeight}px`,
            }}
          >
            {/* Front face - main rectangle */}
            <div
              className="absolute inset-0 border border-foreground"
              style={{
                backgroundColor: "transparent",
                borderWidth: "1px",
              }}
            />
            {/* Top face (3D perspective - parallelogram) */}
            <div
              className="absolute border border-foreground"
              style={{
                width: `${config.barWidth}px`,
                height: `${config.barWidth * 0.6}px`,
                top: `-${config.barWidth * 0.6}px`,
                left: 0,
                backgroundColor: "transparent",
                borderWidth: "1px",
                transform: "skewX(-45deg)",
                transformOrigin: "bottom left",
              }}
            />
            {/* Right face (3D perspective - parallelogram) */}
            <div
              className="absolute border border-foreground"
              style={{
                width: `${config.barWidth * 0.6}px`,
                height: `${maxHeight}px`,
                right: `-${config.barWidth * 0.6}px`,
                top: 0,
                backgroundColor: "transparent",
                borderWidth: "1px",
                transform: "skewY(-45deg)",
                transformOrigin: "top left",
              }}
            />
          </div>
        ))}
      </div>
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
          <p className="text-sm text-muted-foreground animate-pulse">
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
