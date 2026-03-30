import { TrendingUp, TrendingDown, Gift, RefreshCw } from 'lucide-react'
import { AssetPieChart } from '@/components/asset-pie-chart'
import { TrendChartWrapper } from './trend-chart-wrapper'
import { createClient } from '@/lib/supabase/server'
import { fetchStockPrices } from '@/lib/stock-prices'
import { formatJpy, formatDiff, formatPercent, currentMonth } from '@/lib/utils'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/constants'
import type { DbAsset } from '@/lib/types'
import { saveSnapshot } from '@/lib/actions/assets'

async function loadData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [assetsRes, settingsRes, snapshotsRes] = await Promise.all([
    supabase.from('assets').select('*').eq('user_id', user.id).order('sort_order'),
    supabase.from('user_settings').select('usd_jpy').eq('user_id', user.id).single(),
    supabase
      .from('asset_snapshots')
      .select('total_jpy, snapshot_date')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: true })
      .limit(30),
  ])

  const assets: DbAsset[] = assetsRes.data ?? []
  const usdJpy: number = settingsRes.data?.usd_jpy ?? 149.5

  // 株価・基準価額取得
  const japanTickers = assets.filter((a) => a.category === 'japan_stock' && a.ticker).map((a) => a.ticker!)
  const usTickers = assets.filter((a) => a.category === 'us_stock' && a.ticker).map((a) => a.ticker!)
  const fundCodes = assets.filter((a) => a.category === 'mutual_fund' && a.fund_code).map((a) => a.fund_code!)
  const prices = await fetchStockPrices(japanTickers, usTickers, fundCodes)

  // カテゴリ別集計
  const byCategory: Record<string, number> = {}
  let total = 0
  for (const asset of assets) {
    const val = calcValue(asset, prices, usdJpy)
    byCategory[asset.category] = (byCategory[asset.category] ?? 0) + val
    total += val
  }

  const pieData = Object.entries(byCategory).map(([cat, val]) => ({
    name: CATEGORY_LABELS[cat] ?? cat,
    value: Math.round(val),
    color: CATEGORY_COLORS[cat] ?? '#6b7280',
  }))

  // 優待アラート（当月確定）
  const month = currentMonth()
  const alerts = assets.filter(
    (a) => a.category === 'japan_stock' && Array.isArray(a.settlement_months) && a.settlement_months.includes(month)
  )

  // 投資元本（銀行残高は除く）と現金残高を分離して計算
  let investmentCostBasis = 0  // 株・投信の取得コスト合計
  let bankTotal = 0            // 現金・預金合計（現在値）
  for (const asset of assets) {
    if (asset.category === 'japan_stock') {
      investmentCostBasis += (asset.shares ?? 0) * (asset.purchase_price ?? 0)
    } else if (asset.category === 'us_stock') {
      investmentCostBasis += (asset.shares ?? 0) * (asset.purchase_price ?? 0) * usdJpy
    } else if (asset.category === 'mutual_fund') {
      investmentCostBasis += ((asset.units ?? 0) * (asset.nav_at_purchase ?? 0)) / 10000
    } else if (asset.category === 'bank') {
      bankTotal += asset.balance ?? 0
    }
  }
  // 含み益 = 総資産 − 現金 − 投資元本
  const investmentCurrentValue = total - bankTotal
  const unrealizedGain = Math.round(investmentCurrentValue - investmentCostBasis)
  const unrealizedRate = investmentCostBasis > 0 ? (unrealizedGain / investmentCostBasis) * 100 : 0

  // スナップショット推移グラフ用
  const snapshots = snapshotsRes.data ?? []
  const trendData = snapshots.map((s) => ({
    date: s.snapshot_date.replace(/-/g, '/').slice(5),
    total: Math.round(s.total_jpy),
  }))

  // 前日スナップショットで差分計算
  const prevSnap = snapshots.length >= 2 ? snapshots[snapshots.length - 2].total_jpy : null
  const diff = prevSnap !== null ? total - prevSnap : 0
  const diffRate = prevSnap ? (diff / prevSnap) * 100 : 0

  return {
    total: Math.round(total),
    diff: Math.round(diff),
    diffRate,
    pieData,
    byCategory,
    trendData,
    investmentCostBasis: Math.round(investmentCostBasis),
    bankTotal: Math.round(bankTotal),
    unrealizedGain,
    unrealizedRate,
    alerts,
    usdJpy,
    currentTotal: Math.round(total),
  }
}

function calcValue(asset: DbAsset, prices: Record<string, number | null>, usdJpy: number): number {
  if (asset.category === 'japan_stock') {
    const price = prices[asset.ticker!] ?? 0
    return (asset.shares ?? 0) * price
  }
  if (asset.category === 'us_stock') {
    const price = prices[asset.ticker!] ?? 0
    return (asset.shares ?? 0) * price * usdJpy
  }
  if (asset.category === 'mutual_fund') {
    return ((asset.units ?? 0) * (asset.current_nav ?? 0)) / 10000
  }
  if (asset.category === 'bank') {
    return asset.balance ?? 0
  }
  return 0
}

export default async function DashboardPage() {
  const data = await loadData()

  if (!data) {
    return (
      <div className="p-6 text-zinc-400">データを読み込めませんでした。</div>
    )
  }

  const { total, diff, diffRate, pieData, byCategory, trendData, investmentCostBasis, bankTotal, unrealizedGain, unrealizedRate, alerts, usdJpy, currentTotal } = data
  const isUp = diff >= 0

  // スナップショット保存（今日分がなければ保存）
  if (currentTotal > 0) {
    saveSnapshot(currentTotal).catch(() => {})
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">ダッシュボード</h1>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <RefreshCw size={13} />
          <span>1USD = {usdJpy}円 / 株価: 15分キャッシュ</span>
        </div>
      </div>

      {/* 総資産サマリー */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="lg:col-span-2 bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-sm text-zinc-400 mb-1">総資産</p>
          <p className="text-3xl font-bold text-white tracking-tight">{formatJpy(total)}</p>
          {diff !== 0 && (
            <div className={`flex items-center gap-1.5 mt-2 text-sm font-medium ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{formatDiff(diff)}</span>
              <span className="text-zinc-500 font-normal">({formatPercent(diffRate)})</span>
              <span className="text-zinc-500 font-normal text-xs">前日比</span>
            </div>
          )}
          {investmentCostBasis > 0 && (
            <div className={`flex items-center gap-2 mt-1 text-xs ${unrealizedGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>含み益 {formatDiff(unrealizedGain)}</span>
              <span className="text-zinc-500">({unrealizedRate >= 0 ? '+' : ''}{unrealizedRate.toFixed(2)}%)</span>
              <span className="text-zinc-600">投資元本 {formatJpy(investmentCostBasis)}</span>
            </div>
          )}
        </div>

        {Object.entries(byCategory).map(([cat, val]) => (
          <div key={cat} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
              <p className="text-xs text-zinc-400">{CATEGORY_LABELS[cat]}</p>
            </div>
            <p className="text-lg font-semibold text-white">{formatJpy(Math.round(val))}</p>
          </div>
        ))}
      </div>

      {/* チャート */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">資産配分</h2>
          {pieData.length > 0 ? (
            <AssetPieChart data={pieData} />
          ) : (
            <p className="text-zinc-500 text-sm py-8 text-center">資産を登録してください</p>
          )}
        </div>

        <div className="lg:col-span-2 bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <TrendChartWrapper trendData={trendData} investmentCostBasis={investmentCostBasis} bankTotal={bankTotal} />
        </div>
      </div>

      {/* 優待アラート */}
      {alerts.length > 0 && (
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <div className="flex items-center gap-2 mb-3">
            <Gift size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-zinc-300">今月の優待権利確定銘柄</h2>
            <span className="ml-auto text-xs text-zinc-500">{currentMonth()}月</span>
          </div>
          <div className="space-y-2">
            {alerts.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between rounded-lg bg-zinc-800 px-4 py-2.5">
                <div>
                  <span className="text-sm font-medium text-white">{asset.name}</span>
                  {asset.ticker && <span className="ml-2 text-xs text-zinc-500">{asset.ticker}</span>}
                </div>
                <div className="text-right">
                  {asset.benefit_description && (
                    <p className="text-xs text-zinc-400">{asset.benefit_description}</p>
                  )}
                  {asset.benefit_value && (
                    <p className="text-sm font-medium text-amber-400">{formatJpy(asset.benefit_value)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
