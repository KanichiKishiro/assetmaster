'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { formatJpy } from '@/lib/utils'

export interface MonthlyData {
  month: string
  dividend: number
  benefit: number
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
      <p className="text-zinc-400 text-xs mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-white">{p.name}: {formatJpy(p.value)}</p>
      ))}
    </div>
  )
}

export function DividendBarChart({ data, showBenefit }: { data: MonthlyData[]; showBenefit: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={(v) => v >= 10000 ? `${(v/10000).toFixed(0)}万` : `${v}`} width={48} />
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={(v) => <span className="text-xs text-zinc-400">{v}</span>} />
        <Bar dataKey="dividend" name="配当金" stackId="a" fill="#3b82f6" radius={showBenefit ? [0,0,0,0] : [4,4,0,0]} />
        {showBenefit && (
          <Bar dataKey="benefit" name="株主優待（換算額）" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
