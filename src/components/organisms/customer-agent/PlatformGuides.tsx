"use client";

import { useState } from "react";
import { CodeSnippet } from "@/components/molecules/CodeSnippet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlatformIcon, type PlatformKey } from "@/components/organisms/WebChannels/platform-icon";

type Guide = { platform: PlatformKey; name: string; steps: string[] };

const GUIDES: Guide[] = [
  {
    platform: "wordpress",
    name: "WordPress",
    steps: [
      "In WordPress admin, go to Appearance → Theme File Editor, or use a header and footer plugin such as WPCode.",
      "Paste the snippet just before the closing </body> tag (in WPCode, add it to the Footer section).",
      "Save, then open your site in a new tab to see the chat button.",
    ],
  },
  {
    platform: "webflow",
    name: "Webflow",
    steps: [
      "Open Site settings → Custom code.",
      "Paste the snippet in the Footer code box.",
      "Save, then publish your site.",
    ],
  },
  {
    platform: "wix",
    name: "Wix",
    steps: [
      "Open Settings → Custom code (needs a Premium plan and a connected domain).",
      "Click Add custom code, paste the snippet, and apply it to all pages.",
      "Choose Body - end as the placement, then save and publish.",
    ],
  },
  {
    platform: "shopify",
    name: "Shopify",
    steps: [
      "In Shopify admin, go to Online Store → Themes, then choose Edit code on your live theme.",
      "Open layout/theme.liquid and paste the snippet just before </body>.",
      "Save, then visit your store to see the chat button.",
    ],
  },
];

export function PlatformGuides({ snippet }: { snippet: string }) {
  const [active, setActive] = useState<Guide | null>(null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {GUIDES.map((guide) => (
          <Button key={guide.platform} variant="outline" onClick={() => setActive(guide)}>
            <PlatformIcon platform={guide.platform} className="size-6 border-none bg-transparent" />
            {guide.name}
          </Button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-medium">Install on {active?.name}</DialogTitle>
            <DialogDescription>Add the snippet once and it appears on every page.</DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-3 py-1 pl-5 text-sm text-general-foreground">
            {active?.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <CodeSnippet code={snippet} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
