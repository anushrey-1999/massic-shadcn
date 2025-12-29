'use client'

import { useState, useCallback } from 'react'

interface UseScrollBlurEffectOptions {
  fadeZone?: number // Distance from bottom where fade starts (in pixels)
  height?: string // Height of the blur effect (default: h-36)
  className?: string // Additional custom classes
}

export function useScrollBlurEffect(options: UseScrollBlurEffectOptions = {}) {
  const { fadeZone = 60, height = 'h-[6rem]', className = '' } = options
  const [blurOpacity, setBlurOpacity] = useState(1)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const { scrollTop, scrollHeight, clientHeight } = target
    
    // Calculate how close we are to the bottom
    const scrollBottom = scrollHeight - scrollTop - clientHeight
    
    if (scrollBottom <= fadeZone) {
      // Gradually fade from 1 to 0 as we approach the bottom
      const opacity = Math.max(0, scrollBottom / fadeZone)
      setBlurOpacity(opacity)
    } else {
      // Full opacity when not near bottom
      setBlurOpacity(1)
    }
  }, [fadeZone])

  // Default blur effect styling
  const blurEffectClassName = `absolute bottom-0 left-0 right-0 ${height} bg-gradient-to-t from-foreground-light via-foreground-light/70 to-transparent backdrop-blur-[0.6px] pointer-events-none dark:from-sidebar-background/85 dark:via-sidebar-background/60 transition-opacity duration-200 ease-out ${className}`.trim()

  const blurEffectStyle = { opacity: blurOpacity }

  return {
    blurOpacity,
    handleScroll,
    blurEffectClassName,
    blurEffectStyle,
  }
}