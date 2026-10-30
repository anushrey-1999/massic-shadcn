"use client";

import { useState } from "react";
import { Loader2, MessageSquareText, Monitor, Moon, Smartphone, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVisitorAgentInstall } from "@/hooks/use-customer-agent";
import { cn } from "@/lib/utils";
import { ChoiceGroup, Hint, SECONDARY_BUTTON_CLASS } from "./controls";
import { TestAgentDialog } from "./TestAgentDialog";
import { WidgetPreview, type PreviewLayout, type PreviewScheme } from "./WidgetPreview";

interface PreviewPanelProps {
  businessId: string;
  /** Public widget config rendered by the frame. */
  config: unknown;
  siteId: string;
  pageUrl: string;
  showDeviceToggle?: boolean;
  /** Hidden during setup, where testing has its own step. */
  showTest?: boolean;
}

/** Live appearance preview and customer chat test shown beside the settings on wide screens. */
export function PreviewPanel({
  businessId,
  config,
  siteId,
  pageUrl,
  showDeviceToggle = false,
  showTest = true,
}: PreviewPanelProps) {
  const [layout, setLayout] = useState<PreviewLayout>("panel");
  const [scheme, setScheme] = useState<PreviewScheme>("light");
  const [testOpen, setTestOpen] = useState(false);
  const install = useVisitorAgentInstall(businessId);
  const credits = install.credits.data;
  const siteKey = install.siteKey.data;
  const loading = install.credits.isLoading || install.siteKey.isLoading;
  const canTest = credits?.enabled === true && Boolean(siteKey);

  return (
    <aside className="sticky top-0 hidden w-[392px] shrink-0 flex-col items-center gap-3 self-start lg:flex">
      <div className="flex w-full justify-end gap-2">
        <ChoiceGroup
          label="Preview mode"
          value={scheme}
          onChange={setScheme}
          options={[
            { value: "light", label: <Sun className="size-4" aria-hidden />, ariaLabel: "Light" },
            { value: "dark", label: <Moon className="size-4" aria-hidden />, ariaLabel: "Dark" },
          ]}
        />
        {showDeviceToggle && (
          <ChoiceGroup
            label="Preview device"
            value={layout}
            onChange={setLayout}
            options={[
              { value: "panel", label: <Monitor className="size-4" aria-hidden />, ariaLabel: "Desktop" },
              { value: "sheet", label: <Smartphone className="size-4" aria-hidden />, ariaLabel: "Mobile" },
            ]}
          />
        )}
      </div>
      <WidgetPreview config={config} view="welcome" layout={layout} scheme={scheme} />
      {showTest && (
        <>
          <Hint
            label={!loading && !canTest ? "Turn on your customer agent to test it" : undefined}
            disabled
            className="w-full"
          >
            <Button
              type="button"
              variant="outline"
              className={cn("w-full", SECONDARY_BUTTON_CLASS)}
              disabled={!canTest || loading}
              onClick={() => setTestOpen(true)}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareText className="size-4" />}
              Test your agent
            </Button>
          </Hint>
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
        </>
      )}
    </aside>
  );
}
