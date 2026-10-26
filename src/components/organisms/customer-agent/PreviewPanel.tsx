"use client";

import { useState } from "react";
import { Loader2, MessageSquareText, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVisitorAgentInstall } from "@/hooks/use-customer-agent";
import { cn } from "@/lib/utils";
import { ChoiceGroup, SECONDARY_BUTTON_CLASS } from "./controls";
import { TestAgentDialog } from "./TestAgentDialog";
import { WidgetPreview, type PreviewLayout } from "./WidgetPreview";

interface PreviewPanelProps {
  businessId: string;
  /** Public widget config rendered by the frame. */
  config: unknown;
  siteId: string;
  pageUrl: string;
  showDeviceToggle?: boolean;
}

/** Live appearance preview and visitor chat test shown beside the settings on wide screens. */
export function PreviewPanel({
  businessId,
  config,
  siteId,
  pageUrl,
  showDeviceToggle = false,
}: PreviewPanelProps) {
  const [layout, setLayout] = useState<PreviewLayout>("panel");
  const [testOpen, setTestOpen] = useState(false);
  const install = useVisitorAgentInstall(businessId);
  const credits = install.credits.data;
  const siteKey = install.siteKey.data;
  const loading = install.credits.isLoading || install.siteKey.isLoading;
  const canTest = credits?.enabled === true && Boolean(siteKey);

  return (
    <aside className="sticky top-0 hidden w-[392px] shrink-0 flex-col items-center gap-3 self-start lg:flex">
      {showDeviceToggle && (
        <div className="flex w-full justify-end">
          <ChoiceGroup
            label="Preview device"
            value={layout}
            onChange={setLayout}
            options={[
              {
                value: "panel",
                label: <Monitor className="size-4" aria-hidden />,
                ariaLabel: "Desktop preview",
              },
              {
                value: "sheet",
                label: <Smartphone className="size-4" aria-hidden />,
                ariaLabel: "Mobile preview",
              },
            ]}
          />
        </div>
      )}
      <WidgetPreview config={config} view="welcome" layout={layout} />
      <Button
        type="button"
        variant="outline"
        className={cn("w-full", SECONDARY_BUTTON_CLASS)}
        disabled={!canTest || loading}
        title={
          !loading && !canTest
            ? "Enable your customer agent before testing it."
            : undefined
        }
        onClick={() => setTestOpen(true)}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <MessageSquareText className="size-4" />
        )}
        Test your agent
      </Button>
      {siteKey && (
        <TestAgentDialog
          open={testOpen}
          onOpenChange={setTestOpen}
          config={config}
          siteId={siteId}
          siteKey={siteKey.key}
          pageUrl={pageUrl}
        />
      )}
    </aside>
  );
}
