"use client"

import * as React from "react"
import { RefinePlanOverlay } from "./refine-plan-overlay"

export type RefinePlanSource = "pages" | "posts"

type RefinePlanOverlayContextValue = {
  open: (source: RefinePlanSource) => void
  close: () => void
}

const RefinePlanOverlayContext = React.createContext<
  RefinePlanOverlayContextValue | undefined
>(undefined)

export function useRefinePlanOverlayOptional() {
  return React.useContext(RefinePlanOverlayContext)
}

type Props = {
  businessId: string
  children: React.ReactNode
}

export function RefinePlanOverlayProvider({ businessId, children }: Props) {
  const [overlayOpen, setOverlayOpen] = React.useState(false)
  const [source, setSource] = React.useState<RefinePlanSource>("pages")

  const open = React.useCallback((nextSource: RefinePlanSource) => {
    setSource(nextSource)
    setOverlayOpen(true)
  }, [])

  const close = React.useCallback(() => {
    setOverlayOpen(false)
  }, [])

  return (
    <RefinePlanOverlayContext.Provider value={{ open, close }}>
      {children}
      <RefinePlanOverlay
        open={overlayOpen}
        onOpenChange={setOverlayOpen}
        businessId={businessId}
        source={source}
      />
    </RefinePlanOverlayContext.Provider>
  )
}

