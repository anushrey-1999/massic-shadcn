"use client";

import { ArrowRight, Check, MousePointer2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type OnboardingTask = {
  id: string;
  title: string;
  description: string;
  completed?: boolean;
  action?: "settings" | "profile";
};

export function OnboardingCard({
  businessId,
  businessName,
  progressLabel,
  tasks,
}: {
  businessId: string;
  businessName: string;
  progressLabel: string;
  tasks: OnboardingTask[];
}) {
  const router = useRouter();

  const handleTaskClick = (task: OnboardingTask) => {
    if (task.action === "profile") {
      router.push(`/business/${businessId}/profile`);
      return;
    }

    // default for connect tasks
    router.push("/settings");
  };

  return (
    <div className="bg-white border border-general-border-three flex flex-col gap-4 items-start p-2 rounded-md w-full">
      <div className="flex items-center justify-between w-full">
        <div className="min-w-0 flex-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={`/business/${businessId}/analytics`}
                className="font-mono font-normal leading-[150%] text-[16px] text-general-unofficial-foreground-alt truncate cursor-pointer block"
              >
                {businessName}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {businessName}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex gap-1 items-center">
          <div className="bg-foreground-light flex items-center justify-center min-h-6 px-2 py-[3px] rounded-sm">
            <p className="font-medium leading-[150%] text-[10px] tracking-[0.15px] text-general-secondary-foreground">
              {progressLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full">
        {tasks.map((task, index) => {
          const isLast = index === tasks.length - 1;
          const isCompleted = task.completed === true;
          const titleClass = isCompleted
            ? "text-general-muted-foreground"
            : "text-general-secondary-foreground";

          return (
            <div
              key={task.id}
              className={cn(
                "flex gap-2 w-full cursor-pointer",
              )}
              role="button"
              tabIndex={0}
              onClick={() => handleTaskClick(task)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTaskClick(task);
                }
              }}
            >
              <div className="flex flex-col items-center shrink-0 gap-0.5">
                <div className="flex items-center pt-0.5">
                  {isCompleted ? (
                    <div className="bg-green-600 flex items-center justify-center p-0.5 rounded-sm h-4 w-4">
                      <Check
                        className="h-3 w-3 text-white"
                        strokeWidth={3}
                      />
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-sm border border-red-500" />
                  )}
                </div>
                {!isLast && (
                  <div className="h-[37px] w-px bg-general-border" />
                )}
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col leading-[150%]">
                    <p
                      className={cn(
                        "font-medium text-xs tracking-[0.18px]",
                        titleClass,
                      )}
                    >
                      {task.title}
                    </p>
                    <p className="font-normal text-[10px] tracking-[0.15px] text-general-muted-foreground">
                      {task.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="bg-transparent min-h-9 min-w-9 p-2 rounded-xl grid place-content-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskClick(task);
                    }}
                  >
                    <ArrowRight className="h-5 w-5 text-general-unofficial-foreground-alt" />
                  </button>
                </div>

                {!isLast && <div className="h-px w-full bg-foreground-light" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
