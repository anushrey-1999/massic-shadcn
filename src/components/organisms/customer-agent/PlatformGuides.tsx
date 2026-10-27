"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PlatformIcon,
  type PlatformKey,
} from "@/components/organisms/WebChannels/platform-icon";
import { cn } from "@/lib/utils";
import { SECONDARY_BUTTON_CLASS } from "./controls";

type Guide = { platform: PlatformKey; name: string; steps: string[] };

const GUIDES: Guide[] = [
  {
    platform: "wordpress",
    name: "WordPress",
    steps: [
      "In WordPress admin, go to Appearance → Theme File Editor, or use a header and footer plugin such as WPCode.",
      "Paste the code just before the closing </body> tag (in WPCode, add it to the Footer section).",
      "Save, then open your website in a new tab to see the chat button.",
    ],
  },
  {
    platform: "webflow",
    name: "Webflow",
    steps: [
      "Open Site settings → Custom code.",
      "Paste the code in the Footer code box.",
      "Save, then publish your website.",
    ],
  },
  {
    platform: "wix",
    name: "Wix",
    steps: [
      "Open Settings → Custom code (needs a Premium plan and a connected domain).",
      "Click Add custom code, paste the code, and apply it to all pages.",
      "Choose Body - end as the placement, then save and publish.",
    ],
  },
  {
    platform: "shopify",
    name: "Shopify",
    steps: [
      "In Shopify admin, go to Online Store → Themes, then choose Edit code on your live theme.",
      "Open layout/theme.liquid and paste the code just before </body>.",
      "Save, then visit your store to see the chat button.",
    ],
  },
];

/** Platform buttons; picking one shows its steps right below. Picking it again hides them. */
export function PlatformGuides() {
  const [active, setActive] = useState<Guide | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {GUIDES.map((guide) => {
          const selected = active?.platform === guide.platform;
          return (
            <Button
              key={guide.platform}
              type="button"
              variant="outline"
              aria-pressed={selected}
              onClick={() => setActive(selected ? null : guide)}
              className={cn(
                "h-7 gap-1.5 px-2 text-xs font-normal",
                SECONDARY_BUTTON_CLASS,
                selected && "border-general-border-three bg-muted",
              )}
            >
              <PlatformIcon
                platform={guide.platform}
                className="size-4 rounded-none border-none bg-transparent [&_img]:size-4"
              />
              {guide.name}
            </Button>
          );
        })}
      </div>

      {active && (
        <div className="rounded-lg bg-muted px-4 py-3 motion-safe:animate-in motion-safe:fade-in">
          <p className="text-sm font-medium text-general-foreground">
            On {active.name}
          </p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm text-general-muted-foreground">
            {active.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
