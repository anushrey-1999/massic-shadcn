"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";
import { type VariantProps } from "class-variance-authority";
import { Typography } from "../ui/typography";

export interface EmptyStateButton {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  buttons?: EmptyStateButton[];
  className?: string;
  iconClassName?: string;
  cardClassName?: string;
  cardContentClassName?: string;
  showCard?: boolean;
  isLoading?: boolean;
  isProcessing?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  buttons = [],
  className,
  iconClassName,
  cardClassName = "shadow-none border-none",
  cardContentClassName = "p-0",
  showCard = true,
  isLoading = false,
  isProcessing = false,
}: EmptyStateProps) {
  const shouldAnimate = isLoading || isProcessing;
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-8 w-full h-full",
        className
      )}
    >
      <div className="flex flex-col gap-3 items-center justify-center">
        {icon !== null && (
          <div
            className={cn(
              "text-muted-foreground relative w-[83px] h-[88px] flex items-center justify-center",
              iconClassName
            )}
          >
            {shouldAnimate ? (
              <Loader size="md" />
            ) : (
              icon || (
                <div className="relative w-[83px] h-[88px]">
                  <Image src="/massic-loader-grey.svg" alt="" layout="fill" />
                </div>
              )
            )}
          </div>
        )}

        <Typography variant="h3" className="text-general-muted-foreground">
          {title}
        </Typography>
        {description && (
          <Typography variant="p" className="text-muted-foreground -mt-2">
            {description}
          </Typography>
        )}
      </div>
      {buttons.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {buttons.map((button, index) => {
            if (button.href) {
              return (
                <Button
                  key={index}
                  variant={button.variant || "outline"}
                  size={button.size || "default"}
                  asChild
                >
                  <Link href={button.href}>{button.label}</Link>
                </Button>
              );
            }
            return (
              <Button
                key={index}
                variant={button.variant || "outline"}
                size={button.size || "default"}
                onClick={button.onClick}
              >
                {button.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card className={cn("shadow-none border-none rounded-lg bg-foreground-light", cardClassName)}>
      <CardContent className={cn("shadow-none border-none", cardContentClassName)}>
        {content}
      </CardContent>
    </Card>
  );
}
