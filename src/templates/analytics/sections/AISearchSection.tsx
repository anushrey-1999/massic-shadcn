"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { AITrafficChartCard } from "../components/AITrafficChartCard"
import { LLMComparisonChart } from "../components/LLMComparisonChart"
import { useAISearchAnalytics, type TimePeriodValue } from "@/hooks/use-ai-search-analytics"
import { useBusinessStore } from "@/store/business-store"

const llmIcons: Record<string, React.ReactNode> = {
  chatgpt: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" fill="currentColor" />
    </svg>
  ),
  perplexity: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  gemini: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L9 9l-7 3 7 3 3 7 3-7 7-3-7-3-3-7z" fill="#22D3EE" />
    </svg>
  ),
  claude: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" fill="#3B82F6" />
      <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  "bing.com/chat": (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M5 2v16.5l4 2.25 8-4.5V10l-5 2.5V5L5 2z" fill="#00A4EF" />
    </svg>
  ),
}

function getIconForSource(sourceName: string): React.ReactNode {
  const normalizedName = sourceName.toLowerCase()
  return llmIcons[normalizedName] || (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

interface AISearchSectionProps {
  period?: TimePeriodValue
}

export function AISearchSection({ period = "3 months" }: AISearchSectionProps) {
  const pathname = usePathname()
  const profiles = useBusinessStore((state) => state.profiles)

  const { businessUniqueId, website } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/)
    if (!match) return { businessUniqueId: null, website: null }

    const id = match[1]
    const profile = profiles.find((p) => p.UniqueId === id)
    return {
      businessUniqueId: id,
      website: profile?.Website || null,
    }
  }, [pathname, profiles])

  const {
    chartData,
    normalizedSourcesData,
    metricsForCard,
    isLoading,
    hasChartData,
    hasSourcesData,
  } = useAISearchAnalytics(businessUniqueId, website, period)

  const llmDataWithIcons = useMemo(() => {
    return normalizedSourcesData.map((source) => ({
      name: source.name,
      icon: getIconForSource(source.name),
      value: source.normalizedValue,
      rawValue: source.value,
      change: source.change,
      color: source.color,
    }))
  }, [normalizedSourcesData])

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold leading-[120%] tracking-[-0.4px] text-[#171D1A]">AI Search</h2>

      <div className="grid grid-cols-2 gap-4">
        <AITrafficChartCard
          title="AI Search Traffic Over Time"
          metrics={metricsForCard}
          data={chartData}
          isLoading={isLoading}
          hasData={hasChartData}
        />

        <LLMComparisonChart
          title="Relative search traffic across major LLMs"
          data={llmDataWithIcons}
          isLoading={isLoading}
          hasData={hasSourcesData}
        />
      </div>
    </div>
  )
}
