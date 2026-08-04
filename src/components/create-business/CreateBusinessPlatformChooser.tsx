"use client";

import React from "react";
import { ArrowRight, Globe2 } from "lucide-react";
import { PlatformIcon } from "@/components/organisms/WebChannels/platform-icon";
import { ProfileGateCard } from "@/components/templates/ProfileGateCard";
import { CreateBusinessGateLayout } from "./CreateBusinessGateLayout";
import { cn } from "@/lib/utils";

type Platform = "webflow" | "other";

const choices: Array<{
  value: Platform;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: "webflow",
    title: "Webflow",
    description:
      "Connect Webflow to choose an authorized site. No URL entry needed.",
  },
  {
    value: "other",
    title: "Other website",
    description: "Use the website URL to build your business profile.",
    icon: Globe2,
  },
];

export function CreateBusinessPlatformChooser({
  onSelect,
}: {
  onSelect: (platform: Platform) => void;
}) {
  return (
    <CreateBusinessGateLayout>
      <ProfileGateCard
        title="Add a business"
        description="Choose where your current website is hosted."
        className="w-full max-w-[560px]"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {choices.map((choice) => {
            const Icon = choice.icon;
            return (
              <button
                key={choice.value}
                type="button"
                onClick={() => onSelect(choice.value)}
                className={cn(
                  "group flex min-h-[148px] cursor-pointer flex-col rounded-lg border border-general-border-three bg-white p-4 text-left shadow-xs transition-colors",
                  "hover:bg-general-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-general-primary focus-visible:ring-offset-2",
                )}
              >
                {choice.value === "webflow" ? (
                  <PlatformIcon
                    platform="webflow"
                    className="size-9 rounded-md"
                  />
                ) : (
                  <span className="flex size-9 items-center justify-center rounded-md bg-general-secondary text-general-foreground">
                    {Icon ? <Icon className="size-4" /> : null}
                  </span>
                )}
                <span className="mt-4 text-sm font-medium text-general-foreground">
                  {choice.title}
                </span>
                <span className="mt-1 flex-1 text-xs leading-5 text-general-muted-foreground">
                  {choice.description}
                </span>
                <span className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-general-foreground">
                  Continue
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            );
          })}
        </div>
      </ProfileGateCard>
    </CreateBusinessGateLayout>
  );
}
