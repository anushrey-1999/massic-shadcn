import React from 'react'
import { VerticalBarCharts } from '@/components/VerticalBarCharts'
import { AreaChart } from '@/components/AreaChart'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BusinessAnalyticsPage({ params }: PageProps) {
  const { id } = await params


  const chartData = [
    {
      name: "Direct",
      Goals: 120,
      Sessions: 2230,
    },
    {
      name: "Organic Search",
      Goals: 175,
      Sessions: 1825,
    },
    {
      name: "Referral",
      Goals: 15,
      Sessions: 185,
    },
    {
      name: "Organic Social",
      Goals: 8,
      Sessions: 112,
    },
    {
      name: "Unassigned",
      Goals: 2,
      Sessions: 25,
    },
  ]
  
  const chartConfig = {
    Goals: {
      label: "Goals",
      color: "oklch(0.6 0.118 184.704)", // Teal/green color (chart-2)
    },
    Sessions: {
      label: "Sessions",
      color: "oklch(0.646 0.222 41.116)", // Light blue color (chart-1)
    },
  }
  // Sample area chart data (time series) - Extended from August to November
  const areaChartData = [
    { date: "Aug 01", Series1: 1200, Series2: 1000, Series4: 700 },
    { date: "Aug 05", Series1: 1350, Series2: 1100, Series4: 750 },
    { date: "Aug 10", Series1: 1400, Series2: 1150, Series4: 800 },
    { date: "Aug 15", Series1: 1450, Series2: 1180, Series4: 820 },
    { date: "Aug 20", Series1: 1500, Series2: 1200, Series4: 800 },
    { date: "Aug 25", Series1: 1600, Series2: 1300, Series4: 900 },
    { date: "Aug 30", Series1: 1800, Series2: 1500, Series4: 1000 },
    { date: "Sep 01", Series1: 2800, Series2: 2900, Series4: 1500 },
    { date: "Sep 05", Series1: 2600, Series2: 2700, Series4: 1600 },
    { date: "Sep 10", Series1: 2500, Series2: 2500, Series4: 1800 },
    { date: "Sep 15", Series1: 2200, Series2: 2000, Series4: 1500 },
    { date: "Sep 20", Series1: 1800, Series2: 1500, Series4: 1200 },
    { date: "Sep 25", Series1: 1900, Series2: 1600, Series4: 1300 },
    { date: "Sep 30", Series1: 1950, Series2: 1700, Series4: 1400 },
    { date: "Oct 01", Series1: 2000, Series2: 2500, Series4: 1600 },
    { date: "Oct 05", Series1: 2100, Series2: 2400, Series4: 1550 },
    { date: "Oct 10", Series1: 2200, Series2: 2000, Series4: 1400 },
    { date: "Oct 15", Series1: 2050, Series2: 2100, Series4: 1500 },
    { date: "Oct 20", Series1: 1900, Series2: 2500, Series4: 1700 },
    { date: "Oct 25", Series1: 2000, Series2: 2300, Series4: 1600 },
    { date: "Oct 30", Series1: 2050, Series2: 2250, Series4: 1650 },
    { date: "Nov 01", Series1: 2100, Series2: 2200, Series4: 1500 },
    { date: "Nov 05", Series1: 2150, Series2: 2150, Series4: 1550 },
    { date: "Nov 10", Series1: 2200, Series2: 2100, Series4: 1600 },
    { date: "Nov 15", Series1: 2250, Series2: 2050, Series4: 1650 },
    { date: "Nov 20", Series1: 2300, Series2: 2000, Series4: 1700 },
    { date: "Nov 25", Series1: 2350, Series2: 1950, Series4: 1750 },
    { date: "Nov 30", Series1: 2400, Series2: 1900, Series4: 1800 },
  ]

  const areaChartConfig = {
    Series1: {
      label: "Series 1",
      color: "oklch(0.488 0.243 264.376)", // Purple
    },
    Series2: {
      label: "Series 2",
      color: "oklch(0.646 0.222 41.116)", // Blue
    },
    Series4: {
      label: "Series 4",
      color: "oklch(0.828 0.189 84.429)", // Orange/Yellow
    },
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Analytics - {id}</h1>
      <p className="text-muted-foreground mb-6">Analytics page for {id}</p>
      
      <div className="mt-8 bg-white p-5 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Goals vs Sessions</h2>
        <VerticalBarCharts chartData={chartData} chartConfig={chartConfig} tickCount={6} tickInterval={500}/>
      </div>

      <div className="mt-8 bg-white p-5 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Trend Analysis</h2>
        <AreaChart 
          chartData={areaChartData} 
          chartConfig={areaChartConfig}
          dateKey="date"
          height={400}
        />
      </div>
    </div>
  )
}

