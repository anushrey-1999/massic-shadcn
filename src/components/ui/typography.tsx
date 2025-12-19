import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
      h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight",
      h5: "scroll-m-20 text-lg font-semibold tracking-tight",
      h6: "scroll-m-20 text-base font-semibold tracking-tight",
      p: "leading-7 [&:not(:first-child)]:mt-6",
      blockquote: "mt-6 border-l-2 pl-6 italic",
      ul: "my-6 ml-6 list-disc [&>li]:mt-2",
      ol: "my-6 ml-6 list-decimal [&>li]:mt-2",
      code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
      extraSmall: "text-[10px] font-medium text-foreground leading-[150%]",
    },
  },
  defaultVariants: {
    variant: "p",
  },
})

type TypographyElement =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "span"
  | "div"
  | "blockquote"
  | "ul"
  | "ol"
  | "code"
  | "pre"
  | "small"

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: TypographyElement
}

const variantToElement: Record<
  NonNullable<VariantProps<typeof typographyVariants>["variant"]>,
  TypographyElement
> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  p: "p",
  blockquote: "blockquote",
  ul: "ul",
  ol: "ol",
  code: "code",
  lead: "p",
  large: "div",
  small: "small",
  extraSmall: "span",
  muted: "p",
}

function Typography({
  className,
  variant,
  as,
  ...props
}: TypographyProps) {
  const Component =
    as || (variant ? variantToElement[variant] : "p")
  return (
    <Component
      className={cn(typographyVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Typography, typographyVariants }
