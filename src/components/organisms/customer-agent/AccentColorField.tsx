"use client";

import { useEffect, useId, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { accentContrast } from "@/lib/customer-agent";
import { cn } from "@/lib/utils";

const SWATCHES = ["#0A0A0A", "#737373", "#FAFAFA"];
const HEX = /^#[0-9A-F]{6}$/;
const AA_CONTRAST = 4.5;

interface AccentColorFieldProps {
  value: string;
  onChange: (hex: string) => void;
  error?: string;
}

export function AccentColorField({ value, onChange, error }: AccentColorFieldProps) {
  const inputId = useId();
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = (raw: string) => {
    const hex = (raw.startsWith("#") ? raw : `#${raw}`).toUpperCase();
    setDraft(hex);
    if (HEX.test(hex)) onChange(hex);
  };

  const lowContrast = HEX.test(value) && accentContrast(value) < AA_CONTRAST;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-general-foreground">
        Accent color
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => commit(swatch)}
            aria-label={`Use ${swatch}`}
            aria-pressed={value === swatch}
            className="flex size-7 items-center justify-center rounded-full border border-black/10 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            style={{ background: swatch }}
          >
            {value === swatch && (
              <Check
                className={cn(
                  "size-3.5",
                  swatch === "#FAFAFA" ? "text-general-foreground" : "text-white",
                )}
              />
            )}
          </button>
        ))}
        <div className="flex items-center gap-2 pl-1">
          <Input
            id={inputId}
            value={draft}
            maxLength={7}
            spellCheck={false}
            aria-invalid={Boolean(error)}
            onChange={(event) => commit(event.target.value)}
            className={cn("h-8 w-[104px] font-mono text-xs uppercase")}
          />
        </div>
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        lowContrast && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            Text on this color is hard to read (below 4.5:1). Pick a darker or lighter shade.
          </p>
        )
      )}
    </div>
  );
}
