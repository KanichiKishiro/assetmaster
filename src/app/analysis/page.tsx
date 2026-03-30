import { redirect } from 'next/navigation'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fetchStockPrices } from '@/lib/stock-prices'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/constants'
import { formatJpy, formatPercent, cn } from '@/lib/utils'
import { AnalysisCharts } from './analysis-charts'
import type { DbAsset, AssetCategory } from '@/lib/types'

function calcValue(asset: DbAsset, prices: Record<string, number | null>, usdJpy: number): number {
  if (asset.category === 'japan_stock') return (asset.shares ?? 0) * (prices[asset.ticker!] ?? 0)
  if (asset.category === 'us_stock') return (asset.shares ?? 0) * (prices[asset.ticker!] ?? 0) * usdJpy
  if (asset.category === 'mutual_fund') return ((asset.units ?? 0) * (asset.current_nav ?? 0)) / 10000
  if (asset.category === 'bank') return asset.balance ?? 0
  return 0
}

function calcPurchaseValue(asset: DbAsset, usdJpy: number): number {
  if (asset.category === 'japan_stock') return (asset.shares ?? 0) * (asset.purchase_price ?? 0)
  if (asset.category === 'us_stock') return (asset.shares ?? 0) * (asset.purchase_price ?? 0) * usdJpy
  if (asset.category === 'mutual_fund') return ((asset.units ?? 0) * (asset.nav_at_purchase ?? 0)) / 10000
  return 0
}

export default async function AnalysisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [assetsRes, settingsRes] = await Promise.all([
    supabase.from('assets').select('*').eq('user_id', user.id),
    supabase.from('user_settings').select('usd_jpy').eq('user_id', user.id).single(),
  ])

  const assets: DbAsset[] = assetsRes.data ?? []
  const usdJpy: number = settingsRes.data?.usd_jpy ?? 149.5

  const japanTickers = assets.filter((a) => a.category === 'japan_stock' && a.ticker).map((a) => a.ticker!)
  const usTickers = assets.filter((a) => a.category === 'us_stock' && a.ticker).map((a) => a.ticker!)
  const prices = await fetchStockPrices(japanTickers, usTickers)

  const byCategory: Record<string, number> = {}
  let total = 0
  for (const asset of assets) {
    const val = calcValue(asset, prices, usdJpy)
    byCategory[asset.category] = (byCategory[asset.category] ?? 0) + val
    total += val
  }

  const categoryBreakdown = Object.entries(byCategory).map(([cat, val]) => ({
    category: cat as AssetCategory,
    label: CATEGORY_LABELS[cat] ?? cat,
    value: Math.round(val),
    ratio: total > 0 ? (val / total) * 100 : 0,
    color: CATEGORY_COLORS[cat] ?? '#6b7280',
  })).sort((a, b) => b.value - a.value)

  const gainLossRanking = assets
    .filter((a) => a.category !== 'bank')
    .map((a) => {
      const value = calcValue(a, prices, usdJpy)
      const purchase = calcPurchaseValue(a, usdJpy)
      const gainLoss = value - purchase
      const rate = purchase > 0 ? (gainLoss / purchase) * 100 : 0
      return { id: a.id, name: a.name, category: a.category, gainLoss, gainLossRate: rate, value }
    })
    .sort((a, b) => b.gainLossRate - a.gainLossRate)

  const barChartData = categoryBreakdown.map((c) => ({ name: c.label, value: c.value, color: c.color }))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">詳細分析</h1>

      {assets.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          資産を登録するとここに分析が表示されます
        </div>
      ) : (
        <>
          {/* カテゴリ別比率 */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 mb-4">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">カテゴリ別配分</h2>
            <div className="space-y-3 mb-4">
              {categoryBreakdown.map((cat) => (
                <div key={cat.category}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-zinc-300">{cat.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-white">{formatJpy(cat.value)}</span>
                      <span className="text-xs text-zinc-500 ml-2">{cat.ratio.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${cat.ratio}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <AnalysisCharts data={barChartData} />
          </div>

          {/* 騰落率ランキング */}
          {gainLossRanking.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">騰落率ランキング</h2>
              <div className="space-y-1">
                {gainLossRanking.map((item, i) => {
                  const isUp = item.gainLossRate >= 0
                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-800/50">
                      <span className="text-xs text-zinc-600 w-5 text-right shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-white">{item.name}</span>
                        <span className="ml-2 text-xs text-zinc-500">{CATEGORY_LABELS[item.category as AssetCategory]}</span>
                      </div>
                      <div className={cn('flex items-center gap-1 text-sm font-semibold shrink-0', isUp ? 'text-emerald-500' : 'text-rose-500')}>
                        {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {formatPercent(item.gainLossRate)}
                      </div>
                      <div className="text-right shrink-0 w-28">
                        <p className="text-sm font-medium text-white">{formatJpy(Math.round(item.value))}</p>
                        <p className={cn('text-xs', isUp ? 'text-emerald-500' : 'text-rose-500')}>
                          {item.gainLoss >= 0 ? '+' : ''}{formatJpy(Math.round(item.gainLoss))}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-sm text-zinc-400">合計評価額</span>
                <span className="text-lg font-bold text-white">{formatJpy(Math.round(total))}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
