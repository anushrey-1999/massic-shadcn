"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";
import type { ThemePreset } from "@/types/customer-agent";

type PresetLook = {
  label: string;
  description: string;
  bg: string;
  bubble: string;
  border: string;
  radius: number;
  filledHeader: boolean;
};

// Light-mode surfaces and radii from the widget's preset definitions.
const PRESET_LOOKS: Record<ThemePreset, PresetLook> = {
  clean: { label: "Clean", description: "Neutral and quiet", bg: "#FFFFFF", bubble: "#F5F5F4", border: "#E7E5E4", radius: 8, filledHeader: false },
  soft: { label: "Soft", description: "Warm, rounded", bg: "#FAF8F5", bubble: "#F1EDE7", border: "#E9E3DB", radius: 12, filledHeader: false },
  sharp: { label: "Sharp", description: "Compact, square", bg: "#FFFFFF", bubble: "#F1F5F9", border: "#E2E8F0", radius: 2, filledHeader: false },
  bold: { label: "Bold", description: "Brand-colored header", bg: "#FFFFFF", bubble: "#F5F5F4", border: "#E7E5E4", radius: 6, filledHeader: true },
};

function Thumbnail({ look, accent }: { look: PresetLook; accent: string }) {
  return (
    <div
      aria-hidden
      className="flex h-20 w-full flex-col overflow-hidden border"
      style={{ background: look.bg, borderColor: look.border, borderRadius: look.radius }}
    >
      <div
        className="flex h-5 shrink-0 items-center gap-1 px-2"
        style={{ background: look.filledHeader ? accent : "transparent", borderBottom: `1px solid ${look.border}` }}
      >
        <span className="size-2 rounded-full" style={{ background: look.filledHeader ? "#FFFFFF" : accent }} />
        <span className="h-1 w-8 rounded-full" style={{ background: look.filledHeader ? "#FFFFFF99" : look.border }} />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1.5 px-2">
        <span className="h-1.5 w-3/4 rounded-full" style={{ background: look.border }} />
        <span
          className="ml-auto h-3 w-1/2"
          style={{ background: look.bubble, borderRadius: Math.min(look.radius, 6) }}
        />
      </div>
    </div>
  );
}

interface ThemePresetPickerProps {
  value: ThemePreset;
  accent: string;
  onChange: (preset: ThemePreset) => void;
}

export function ThemePresetPicker({ value, accent, onChange }: ThemePresetPickerProps) {
  return (
    <RadioGroupPrimitive.Root
      aria-label="Style"
      value={value}
      onValueChange={(next) => onChange(next as ThemePreset)}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {(Object.keys(PRESET_LOOKS) as ThemePreset[]).map((preset) => {
        const look = PRESET_LOOKS[preset];
        return (
          <RadioGroupPrimitive.Item
            key={preset}
            value={preset}
            className={cn(
              "flex flex-col gap-2 rounded-lg border border-general-border bg-white p-2 text-left transition-colors outline-none",
              "hover:bg-general-secondary focus-visible:ring-2 focus-visible:ring-ring/50",
              "data-[state=checked]:border-general-foreground data-[state=checked]:shadow-xs"
            )}
          >
            <Thumbnail look={look} accent={accent} />
            <span className="space-y-0.5 px-0.5">
              <span className="block text-sm font-medium text-general-foreground">{look.label}</span>
              <span className="block text-xs text-general-muted-foreground">{look.description}</span>
            </span>
          </RadioGroupPrimitive.Item>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}
