import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "placeholder:text-general-muted-foreground/70 placeholder:text-xs focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-100 disabled:border-general-border disabled:bg-general-secondary disabled:text-general-foreground disabled:placeholder:text-general-muted-foreground/50 read-only:cursor-default read-only:border-general-border read-only:bg-general-primary-foreground read-only:text-general-foreground read-only:shadow-none md:text-sm",
  {
    variants: {
      variant: {
        default: "border-input border bg-white",
        noBorder: "border-0 bg-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface TextareaProps
  extends React.ComponentProps<"textarea">,
    VariantProps<typeof textareaVariants> {}

function Textarea({ className, variant, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Textarea }
