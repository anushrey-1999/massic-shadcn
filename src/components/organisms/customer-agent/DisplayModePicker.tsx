"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";
import type { DisplayMode } from "@/types/customer-agent";

const MODES: Record<DisplayMode, { label: string; hint: string }> = {
  bubble: { label: "Chat bubble", hint: "Small window above the button" },
  sidebar: { label: "Sidebar", hint: "Full-height panel on the side" },
};

// Widget "clean" light surfaces, matching ThemePresetPicker.
const SURFACE = { bg: "#FFFFFF", border: "#E7E5E4", bubble: "#F5F5F4" };

function Thumbnail({ mode, accent, side }: { mode: DisplayMode; accent: string; side: "left" | "right" }) {
  const sideClass = side === "left" ? "left-2" : "right-2";
  return (
    <div
      aria-hidden
      className="relative h-16 w-full overflow-hidden rounded-md border border-general-border bg-general-primary-foreground"
    >
      <div className="flex flex-col gap-1.5 p-2">
        <span className="h-1 w-2/5 rounded-full bg-general-border" />
        <span className="h-1 w-3/5 rounded-full bg-general-border" />
        <span className="h-1 w-1/2 rounded-full bg-general-border" />
      </div>
      {mode === "bubble" ? (
        <>
          <div
            className={cn("absolute bottom-6 h-8 w-10 overflow-hidden rounded border", sideClass)}
            style={{ background: SURFACE.bg, borderColor: SURFACE.border }}
          >
            <div className="flex h-2 items-center px-1" style={{ borderBottom: `1px solid ${SURFACE.border}` }}>
              <span className="size-1 rounded-full" style={{ background: accent }} />
            </div>
          </div>
          <span className={cn("absolute bottom-1.5 size-3 rounded-full", sideClass)} style={{ background: accent }} />
        </>
      ) : (
        <div
          className={cn("absolute inset-y-0 w-1/3", side === "left" ? "left-0 border-r" : "right-0 border-l")}
          style={{ background: SURFACE.bg, borderColor: SURFACE.border }}
        >
          <div className="flex h-2.5 items-center px-1" style={{ borderBottom: `1px solid ${SURFACE.border}` }}>
            <span className="size-1.5 rounded-full" style={{ background: accent }} />
          </div>
          <div className="flex flex-col gap-1 p-1">
            <span className="h-1.5 w-4/5 rounded-sm" style={{ background: SURFACE.bubble }} />
            <span className="h-1.5 w-3/5 rounded-sm" style={{ background: SURFACE.bubble }} />
          </div>
        </div>
      )}
    </div>
  );
}

interface DisplayModePickerProps {
  value: DisplayMode;
  accent: string;
  side: "left" | "right";
  onChange: (mode: DisplayMode) => void;
}

export function DisplayModePicker({ value, accent, side, onChange }: DisplayModePickerProps) {
  return (
    <RadioGroupPrimitive.Root
      aria-label="Open as"
      value={value}
      onValueChange={(next) => onChange(next as DisplayMode)}
      className="grid grid-cols-2 gap-3"
    >
      {(Object.keys(MODES) as DisplayMode[]).map((mode) => (
        <RadioGroupPrimitive.Item
          key={mode}
          value={mode}
          className={cn(
            "flex cursor-pointer flex-col gap-2 rounded-lg border border-general-border bg-white p-2 text-left transition-colors outline-none",
            "hover:bg-general-primary-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
            "data-[state=checked]:border-general-foreground data-[state=checked]:shadow-xs"
          )}
        >
          <Thumbnail mode={mode} accent={accent} side={side} />
          <span className="px-0.5">
            <span className="block text-sm font-medium text-general-foreground">{MODES[mode].label}</span>
            <span className="block text-xs text-general-muted-foreground">{MODES[mode].hint}</span>
          </span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
