'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { TrendPoint } from '@/lib/types'
import { formatJpy } from '@/lib/utils'

type Mode = 'total' | 'profit' | 'rate'

interface AssetTrendChartProps {
  data: TrendPoint[]
  mode?: Mode
}

function CustomTooltip({
  active, payload, label, mode,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  mode?: Mode
}) {
  if (active && payload && payload.length) {
    const val = payload[0].value
    const formatted =
      mode === 'rate'
        ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`
        : `${val >= 0 ? '' : '-'}${formatJpy(Math.abs(Math.round(val)))}`
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
        <p className="text-zinc-400 text-xs">{label}</p>
        <p className={`font-medium ${val >= 0 ? 'text-white' : 'text-rose-400'}`}>{formatted}</p>
      </div>
    )
  }
  return null
}

export function AssetTrendChart({ data, mode = 'total' }: AssetTrendChartProps) {
  const isPositive = (data[data.length - 1]?.total ?? 0) >= 0
  const color = mode === 'total' ? '#10b981' : isPositive ? '#10b981' : '#f43f5e'
  const gradientId = `gradient-${mode}`

  const yFormatter = (v: number) =>
    mode === 'rate'
      ? `${v.toFixed(1)}%`
      : `${(v / 10000).toFixed(0)}万`

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fill: '#71717a', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={6}
        />
        <YAxis
          tick={{ fill: '#71717a', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={yFormatter}
          width={mode === 'rate' ? 42 : 50}
        />
        <Tooltip content={<CustomTooltip mode={mode} />} />
        {mode !== 'total' && (
          <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
        )}
        <Area
          type="monotone"
          dataKey="total"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
