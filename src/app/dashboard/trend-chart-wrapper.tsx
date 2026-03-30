'use client'

import { useState } from 'react'
import { AssetTrendChart } from '@/components/asset-trend-chart'
import { cn } from '@/lib/utils'
import type { TrendPoint } from '@/lib/types'

type Mode = 'total' | 'profit' | 'rate'

const MODES: { key: Mode; label: string }[] = [
  { key: 'total',  label: '総資産' },
  { key: 'profit', label: '含み益' },
  { key: 'rate',   label: '利益率' },
]

interface Props {
  trendData: TrendPoint[]
  /** 株・投信のみの取得コスト合計（銀行を除く） */
  investmentCostBasis: number
  /** 現在の銀行残高合計 */
  bankTotal: number
}

export function TrendChartWrapper({ trendData, investmentCostBasis, bankTotal }: Props) {
  const [mode, setMode] = useState<Mode>('total')

  const chartData: TrendPoint[] = trendData.map((p) => {
    if (mode === 'profit') {
      // スナップショット合計 − 現在の銀行残高 ≈ 投資評価額
      // 含み益 = 投資評価額 − 投資元本
      const investmentValue = p.total - bankTotal
      return { date: p.date, total: investmentValue - investmentCostBasis }
    }
    if (mode === 'rate') {
      const investmentValue = p.total - bankTotal
      const profit = investmentValue - investmentCostBasis
      return {
        date: p.date,
        total: investmentCostBasis > 0 ? (profit / investmentCostBasis) * 100 : 0,
      }
    }
    return p
  })

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-300">資産推移</h2>
          {mode !== 'total' && (
            <p className="text-xs text-zinc-600 mt-0.5">※現金・預金を除く投資資産ベース</p>
          )}
        </div>
        <div className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                mode === m.key
                  ? 'border-emerald-600 bg-emerald-900/30 text-emerald-400'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {trendData.length >= 2 ? (
        <AssetTrendChart data={chartData} mode={mode} />
      ) : (
        <p className="text-zinc-500 text-sm py-8 text-center">データ蓄積中... (複数日のアクセスで表示されます)</p>
      )}
    </>
  )
}
