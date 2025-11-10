"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SortableContextValue<T> {
  value: T[]
  onValueChange: (value: T[]) => void
  getItemValue: (item: T) => string
}

const SortableContext = React.createContext<SortableContextValue<any> | null>(null)

interface SortableProps<T> {
  value: T[]
  onValueChange: (value: T[]) => void
  getItemValue: (item: T) => string
  children: React.ReactNode
}

export function Sortable<T>({ value, onValueChange, getItemValue, children }: SortableProps<T>) {
  return (
    <SortableContext.Provider value={{ value, onValueChange, getItemValue }}>
      {children}
    </SortableContext.Provider>
  )
}

export function SortableContent({ 
  asChild, 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLUListElement> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { className: cn(className, children.props.className) })
  }
  return (
    <ul className={cn("", className)} {...props}>
      {children}
    </ul>
  )
}

export function SortableItem({ 
  value, 
  asChild, 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLLIElement> & { 
  value: string
  asChild?: boolean 
}) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { 
      className: cn(className, children.props.className),
      ...props 
    })
  }
  return (
    <li className={cn("", className)} {...props}>
      {children}
    </li>
  )
}

export function SortableItemHandle({ 
  asChild, 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { 
      className: cn(className, children.props.className),
      ...props 
    })
  }
  return (
    <div className={cn("cursor-grab active:cursor-grabbing", className)} {...props}>
      {children}
    </div>
  )
}

export function SortableOverlay({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("pointer-events-none", className)} {...props}>
      {children}
    </div>
  )
}

