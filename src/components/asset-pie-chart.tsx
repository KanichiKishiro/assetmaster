'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatJpy } from '@/lib/utils'

interface PieData {
  name: string
  value: number
  color: string
}

interface AssetPieChartProps {
  data: PieData[]
  showLegend?: boolean
  height?: number
}

function CustomTooltip({
  active,
  payload,
  total,
  showPercent,
}: {
  active?: boolean
  payload?: { name: string; value: number }[]
  total: number
  showPercent: boolean
}) {
  if (active && payload && payload.length) {
    const pct = total > 0 ? (payload[0].value / total) * 100 : 0
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
        <p className="font-medium text-white">{payload[0].name}</p>
        <p className="text-zinc-300">
          {showPercent ? `${pct.toFixed(1)}%` : formatJpy(payload[0].value)}
        </p>
        {showPercent && (
          <p className="text-zinc-500 text-xs">{formatJpy(payload[0].value)}</p>
        )}
      </div>
    )
  }
  return null
}

export function AssetPieChart({ data, showLegend = true, height = 260 }: AssetPieChartProps) {
  const [showPercent, setShowPercent] = useState(false)
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const cy = showLegend ? '43%' : '50%'

  return (
    <div>
      <div className="flex justify-end mb-1">
        <div className="flex rounded-md overflow-hidden border border-zinc-700 text-xs">
          <button
            onClick={() => setShowPercent(false)}
            className={`px-2.5 py-1 transition-colors ${!showPercent ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            金額
          </button>
          <button
            onClick={() => setShowPercent(true)}
            className={`px-2.5 py-1 transition-colors ${showPercent ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            ％
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy={cy}
            innerRadius={65}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip total={total} showPercent={showPercent} />} />
        </PieChart>
      </ResponsiveContainer>
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-1 max-h-24 overflow-y-auto px-2">
          {data.map((d) => {
            const pct = total > 0 ? (d.value / total) * 100 : 0
            return (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-zinc-300">{d.name}</span>
                <span className="text-xs text-zinc-500">
                  {showPercent ? `${pct.toFixed(1)}%` : formatJpy(d.value)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
