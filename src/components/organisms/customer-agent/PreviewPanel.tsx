"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChoiceGroup, SECONDARY_BUTTON_CLASS } from "./controls";
import { TestAgentDialog } from "./TestAgentDialog";
import { WidgetPreview, type PreviewLayout } from "./WidgetPreview";

interface PreviewPanelProps {
  businessId: string;
  /** Public widget config rendered by the frame. */
  config: unknown;
  /** Page the test conversation pretends to be on. */
  pageUrl: string;
  showDeviceToggle?: boolean;
}

/** Live widget preview plus the "Test your agent" chat, shown beside the settings on wide screens. */
export function PreviewPanel({ businessId, config, pageUrl, showDeviceToggle = false }: PreviewPanelProps) {
  const [layout, setLayout] = useState<PreviewLayout>("panel");
  const [testOpen, setTestOpen] = useState(false);

  return (
    <aside className="sticky top-0 hidden w-[392px] shrink-0 flex-col items-center gap-3 self-start lg:flex">
      {showDeviceToggle && (
        <div className="flex w-full justify-end">
          <ChoiceGroup
            label="Preview device"
            value={layout}
            onChange={setLayout}
            options={[
              { value: "panel", label: "Desktop" },
              { value: "sheet", label: "Mobile" },
            ]}
          />
        </div>
      )}
      <WidgetPreview config={config} view="welcome" layout={layout} />
      <Button variant="outline" className={cn("w-full", SECONDARY_BUTTON_CLASS)} onClick={() => setTestOpen(true)}>
        <MessageSquareText className="size-4" />
        Test your agent
      </Button>
      <p className="text-center text-xs text-general-muted-foreground">
        Test chats use your saved knowledge and don&apos;t count toward usage.
      </p>
      <TestAgentDialog
        businessId={businessId}
        open={testOpen}
        onOpenChange={setTestOpen}
        config={config}
        pageUrl={pageUrl}
      />
    </aside>
  );
}
