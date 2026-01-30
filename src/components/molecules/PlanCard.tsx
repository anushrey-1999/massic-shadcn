import { Crosshair, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface PlanFeature {
  text: string;
}

interface PlanCardProps {
  title: string;
  price: string;
  description: string;
  tags: string[];
  features: PlanFeature[];
  buttonText: string;
  onUpgrade?: () => void;
  onDeactivate?: () => void;
  onReactivate?: () => void;
  isActive?: boolean;
  isUpgrading?: boolean;
  isDeactivating?: boolean;
  isReactivating?: boolean;
  cancelAtPeriodEnd?: boolean;
}

export function PlanCard({
  title,
  price,
  description,
  tags,
  features,
  buttonText,
  onUpgrade,
  onDeactivate,
  onReactivate,
  isActive = false,
  isUpgrading = false,
  isDeactivating = false,
  isReactivating = false,
  cancelAtPeriodEnd = false,
}: PlanCardProps) {
  return (
    <div className="bg-white flex flex-col gap-4 p-6 rounded-xl w-full">
      <div className="flex items-center justify-between w-full">
        <div className="flex gap-2 items-center">
          <Crosshair className="size-6 text-general-foreground" />
          <p className="font-semibold leading-[1.2] text-2xl text-general-foreground tracking-[-0.48px]">
            {title}
          </p>
        </div>
        {isActive ? (
          <div className="flex items-center gap-1.5 font-mono font-normal leading-normal text-base text-general-muted-foreground">
            <Check className="h-4 w-4" />
            <span className="">Plan Activated</span>
          </div>
        ) : (
          <p className="font-mono font-normal leading-normal text-base text-general-muted-foreground">
            {price}
          </p>
        )}
      </div>

      <Separator />

      <div className="flex items-start flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="bg-white/10 border-general-border min-h-6 px-2 py-[3px] rounded-lg text-[10px] font-medium text-general-foreground tracking-[0.15px]"
          >
            {tag}
          </Badge>
        ))}
      </div>

      <p className="font-normal leading-normal text-sm text-foreground/87 tracking-[0.07px]">
        {description}
      </p>

      <div className="bg-secondary flex flex-col p-2 rounded-xl w-full">
        <div className="flex flex-col gap-2 w-full">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex gap-2 items-start w-full"
            >
              <Check className="size-6 shrink-0 text-general-foreground" />
              <p className="flex-1 font-normal leading-normal text-sm text-foreground/87 tracking-[0.07px]">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full">
        <Button
          className={isActive && !cancelAtPeriodEnd
            ? "w-full min-h-10 px-6 py-[9.5px] flex items-center justify-center gap-2 rounded-lg bg-[#FEF2F2] text-red-600 hover:bg-red-50 border-none"
            : "w-full h-10"
          }
          onClick={isActive ? (cancelAtPeriodEnd ? onReactivate : onDeactivate) : onUpgrade}
          variant={isActive && !cancelAtPeriodEnd ? "ghost" : "default"}
          disabled={isUpgrading || isDeactivating || isReactivating}
        >
          {isActive ? (
            cancelAtPeriodEnd ? (
              <>
                {isReactivating && <Loader2 className="h-4 w-4 animate-spin" />}
                Reactivate Plan
              </>
            ) : (
              <>
                {isDeactivating && <Loader2 className="h-4 w-4 animate-spin" />}
                Deactivate Plan
              </>
            )
          ) : (
            <>
              {isUpgrading && <Loader2 className="h-4 w-4 animate-spin" />}
              {buttonText}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

const defaultFeatures: PlanFeature[] = [
  {
    text: "15 Snapshot analyses included – quick SEO opportunity overviews for prospects or clients",
  },
  {
    text: "3 Detailed Pitches included – full workflows, strategy outputs, and pitch-ready insights",
  },
  {
    text: "Create shareable snapshot or deep-dive pitch reports",
  },
  {
    text: "Ask Massic access for instant answers for search, strategy, and pre-sales research",
  },
  {
    text: "Identify topics, channels, and audiences worth selling",
  },
  {
    text: "Run strategy without onboarding a client",
  },
];

const defaultTags = ["Analytics", "Technical", "SEO", "Social", "Ads"];

export function MassicOpportunitiesPlanCard({
  onUpgrade,
  onDeactivate,
  onReactivate,
  isActive = false,
  isUpgrading = false,
  isDeactivating = false,
  isReactivating = false,
  cancelAtPeriodEnd = false,
}: {
  onUpgrade?: () => void;
  onDeactivate?: () => void;
  onReactivate?: () => void;
  isActive?: boolean;
  isUpgrading?: boolean;
  isDeactivating?: boolean;
  isReactivating?: boolean;
  cancelAtPeriodEnd?: boolean;
}) {
  return (
    <PlanCard
      title="Massic Opportunities"
      price="$499 / mo"
      description="Win more deals with fast, data-backed opportunity analysis and client-ready pitch outputs—without setting up full business accounts. Built specifically for agencies that want to validate prospects, surface upsells, and generate SEO strategy on demand."
      tags={defaultTags}
      features={defaultFeatures}
      buttonText="Activate Plan"
      onUpgrade={onUpgrade}
      onDeactivate={onDeactivate}
      onReactivate={onReactivate}
      isActive={isActive}
      isUpgrading={isUpgrading}
      isDeactivating={isDeactivating}
      isReactivating={isReactivating}
      cancelAtPeriodEnd={cancelAtPeriodEnd}
    />
  );
}
