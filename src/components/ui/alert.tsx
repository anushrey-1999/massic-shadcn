import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border border-border px-4 py-3 text-sm text-general-foreground",
  {
    variants: {
      variant: {
        default: "bg-general-primary-foreground",
        info: "bg-blue-50 border-blue-200 text-blue-900",
        warning: "bg-amber-50 border-amber-200 text-amber-900",
        destructive: "bg-red-50 border-red-200 text-red-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ...props
}: React.ComponentProps<"h5">) {
  return (
    <h5 className={cn("mb-0.5 font-medium leading-none", className)} {...props} />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("text-sm text-current opacity-90", className)} {...props} />
  );
}

