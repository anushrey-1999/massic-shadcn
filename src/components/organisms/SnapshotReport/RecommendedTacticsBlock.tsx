"use client";

import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { InlineTipTapEditor } from "@/components/ui/inline-tiptap-editor";
import { Typography } from "@/components/ui/typography";
import type { ExpressPitchTactic } from "@/hooks/use-pitch-reports";

type RecommendedTacticsBlockProps = {
  tactics: ExpressPitchTactic[];
  onTacticChange: (index: number, next: ExpressPitchTactic) => void;
};

export function RecommendedTacticsBlock({ tactics, onTacticChange }: RecommendedTacticsBlockProps) {
  return (
    <Card className="shadow-none gap-0 border-0 rounded-none pt-0 pb-4">
      <CardContent className="px-0">
        <div className="pb-0">
          <Typography
            variant="p"
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-general-muted-foreground"
          >
            Recommended tactics — priority order
          </Typography>
        </div>

        <div>
          {tactics.map((t, idx) => {
            return (
              <div key={`${t.priority}-${idx}`}>
                <div
                  className={[
                    "flex gap-4 py-5",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="h-8 w-8 rounded-md border border-general-border flex items-center justify-center shrink-0">
                    <Typography variant="small" className="text-general-secondary-foreground">
                      {t.priority}
                    </Typography>
                  </div>

                  <div className="min-w-0 flex-1">
                    <input
                      value={t.tactic}
                      onChange={(e) =>
                        onTacticChange(idx, { ...t, tactic: e.target.value })
                      }
                      className="w-full bg-transparent text-sm font-semibold text-general-foreground outline-none rounded-md px-1 -mx-1 focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Tactic title"
                    />

                    <div className="mt-0">
                      <InlineTipTapEditor
                        content={t.context}
                        placeholder="Add context..."
                        isEditable={true}
                        editorClassName="tactics-editor min-h-0 border-0 bg-transparent p-0 text-sm text-general-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                        onChange={(markdown) =>
                          onTacticChange(idx, { ...t, context: markdown })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-general-unofficial-outline ml-12 w-full" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

