import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "bg-card text-card-foreground flex flex-col border shadow-sm",
  {
    variants: {
      variant: {
        default: "gap-6 rounded-xl py-6",
        profileCard: "gap-0 rounded-lg p-2 bg-general-primary-foreground border-general-border shadow-xs",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const CardContext = React.createContext<{ variant?: VariantProps<typeof cardVariants>["variant"] }>({
  variant: "default",
})

function Card({ 
  className, 
  variant = "default",
  ...props 
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <CardContext.Provider value={{ variant }}>
      <div
        data-slot="card"
        data-variant={variant}
        className={cn(cardVariants({ variant }), className)}
        {...props}
      />
    </CardContext.Provider>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  const { variant } = React.useContext(CardContext)
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        variant === "profileCard" ? "px-0" : "px-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  const { variant } = React.useContext(CardContext)
  return (
    <div
      data-slot="card-title"
      className={cn(
        "leading-none font-semibold",
        variant === "profileCard" ? "px-0" : "",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  const { variant } = React.useContext(CardContext)
  return (
    <div
      data-slot="card-content"
      className={cn(
        variant === "profileCard" ? "px-0" : "px-6",
        className
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
