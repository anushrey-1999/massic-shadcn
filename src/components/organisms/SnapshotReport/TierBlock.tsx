"use client";

import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { InlineTipTapEditor } from "@/components/ui/inline-tiptap-editor";

type TierBlockProps = {
  tier: number | null;
  tierLabel: string;
  why: string;
  onTierLabelChange: (value: string) => void;
  onWhyChange: (value: string) => void;
};

export function TierBlock({
  tier,
  tierLabel,
  why,
  onTierLabelChange,
  onWhyChange,
}: TierBlockProps) {
  return (
    <Card className="shadow-none gap-0 rounded-lg border-emerald-100 bg-emerald-50 py-4">
      <CardContent className="min-w-0">
        <input
          value={tierLabel}
          onChange={(e) => onTierLabelChange(e.target.value)}
          className="w-full bg-transparent text-base font-semibold text-general-primary outline-none rounded-md px-1 -mx-1 focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Tier label"
        />

        <div className="mt-1">
          <InlineTipTapEditor
            content={why}
            placeholder="Why does this tier matter?"
            isEditable={true}
            editorClassName="min-h-0 border-0 bg-transparent p-0 text-sm text-general-secondary-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            onChange={(markdown) => onWhyChange(markdown)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

