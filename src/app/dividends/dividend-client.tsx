'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { addDividendRecord, deleteDividendRecord } from '@/lib/actions/dividends'
import { DividendBarChart, type MonthlyData } from './dividend-chart'
export type { MonthlyData } from './dividend-chart'
import { AssetPieChart } from '@/components/asset-pie-chart'
import { formatJpy, cn } from '@/lib/utils'

const PIE_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#6366f1',
  '#14b8a6','#e11d48',
]
const OTHER_COLOR = '#52525b'
const PIE_THRESHOLD = 3  // この%未満は「その他」にまとめる

function groupSmallSlices(items: { name: string; value: number }[]) {
  const total = items.reduce((s, d) => s + d.value, 0)
  if (total === 0) return []
  const main: typeof items = []
  let otherValue = 0
  let otherCount = 0
  for (const item of items) {
    if ((item.value / total) * 100 >= PIE_THRESHOLD) {
      main.push(item)
    } else {
      otherValue += item.value
      otherCount++
    }
  }
  if (otherCount > 0) main.push({ name: `その他（${otherCount}銘柄）`, value: otherValue })
  return main
}

interface DividendRecord {
  id: string
  asset_name: string
  payment_date: string
  amount: number
  dividend_type: string
  note: string | null
}

interface AssetOption {
  id: string
  name: string
}

interface Props {
  records: DividendRecord[]
  assetOptions: AssetOption[]
  monthlyData: MonthlyData[]
  dividendByAsset: { name: string; value: number }[]
  annualDividend: number
  afterTaxAnnualDividend: number
  annualBenefit: number
  annualTotal: number
  totalAssets: number
  totalStockCost: number
  selectedYear: number
  years: number[]
}

const TYPE_LABELS: Record<string, string> = {
  dividend: '配当金',
  benefit: '株主優待',
}

export function DividendClient({
  records, assetOptions, monthlyData, dividendByAsset,
  annualDividend, afterTaxAnnualDividend, annualBenefit, annualTotal,
  totalAssets, totalStockCost,
  selectedYear, years,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [showBenefit, setShowBenefit] = useState(false)
  const [year, setYear] = useState(selectedYear)
  const [isPending, startTransition] = useTransition()
  const [assetId, setAssetId] = useState('')
  const [assetName, setAssetName] = useState('')
  const [useManualName, setUseManualName] = useState(false)

  // 利回り計算（税引前）
  const divYield      = totalAssets > 0 ? (annualDividend / totalAssets) * 100 : 0
  const realYield     = totalAssets > 0 ? (annualTotal / totalAssets) * 100 : 0
  const costDivYield  = totalStockCost > 0 ? (annualDividend / totalStockCost) * 100 : 0
  const costRealYield = totalStockCost > 0 ? (annualTotal / totalStockCost) * 100 : 0
  // 利回り計算（税引後）
  const afterTaxTotal       = afterTaxAnnualDividend + annualBenefit
  const afterTaxDivYield    = totalAssets > 0 ? (afterTaxAnnualDividend / totalAssets) * 100 : 0
  const afterTaxRealYield   = totalAssets > 0 ? (afterTaxTotal / totalAssets) * 100 : 0
  const afterTaxCostDivYield  = totalStockCost > 0 ? (afterTaxAnnualDividend / totalStockCost) * 100 : 0
  const afterTaxCostRealYield = totalStockCost > 0 ? (afterTaxTotal / totalStockCost) * 100 : 0

  function handleDelete(id: string) {
    if (!confirm('この記録を削除しますか？')) return
    startTransition(() => deleteDividendRecord(id))
  }

  function handleAssetChange(id: string) {
    setAssetId(id)
    const found = assetOptions.find((a) => a.id === id)
    if (found) setAssetName(found.name)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (!useManualName) fd.set('asset_name', assetName)
    startTransition(async () => {
      await addDividendRecord(fd)
      setShowForm(false)
      setAssetId('')
      setAssetName('')
    })
  }

  const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-600'
  const labelCls = 'block text-xs text-zinc-400 mb-1'

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">配当管理</h1>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            {years.map((y) => <option key={y} value={y}>{y}年</option>)}
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            記録を追加
          </button>
        </div>
      </div>

      {/* 利回りサマリーカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <p className="text-xs text-zinc-400 mb-1">年間配当金（予定）</p>
          <p className="text-lg font-bold text-white">{formatJpy(Math.round(annualDividend))}</p>
          <p className="text-xs text-zinc-500 mt-0.5">税引後 {formatJpy(Math.round(afterTaxAnnualDividend))}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <p className="text-xs text-zinc-400 mb-1">実質配当（優待含む）</p>
          <p className="text-lg font-bold text-emerald-400">{formatJpy(Math.round(annualTotal))}</p>
          <p className="text-xs text-zinc-500 mt-0.5">税引後 {formatJpy(Math.round(afterTaxTotal))} / 優待 {formatJpy(Math.round(annualBenefit))}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <p className="text-xs text-zinc-400 mb-1">総資産利回り</p>
          <p className="text-lg font-bold text-white">{divYield.toFixed(2)}%</p>
          <p className="text-xs text-zinc-500">税引後 {afterTaxDivYield.toFixed(2)}% / 実質 {afterTaxRealYield.toFixed(2)}%</p>
          <p className="text-xs text-zinc-600 mt-0.5">総資産 {formatJpy(Math.round(totalAssets))}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <p className="text-xs text-zinc-400 mb-1">取得金額利回り</p>
          <p className="text-lg font-bold text-white">{costDivYield.toFixed(2)}%</p>
          <p className="text-xs text-zinc-500">税引後 {afterTaxCostDivYield.toFixed(2)}% / 実質 {afterTaxCostRealYield.toFixed(2)}%</p>
          <p className="text-xs text-zinc-600 mt-0.5">取得金額 {formatJpy(Math.round(totalStockCost))}</p>
        </div>
      </div>

      {/* 月別グラフ */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">月別配当・優待（{year}年）</h2>
          <button
            onClick={() => setShowBenefit(!showBenefit)}
            className={cn(
              'text-xs px-3 py-1 rounded-full border transition-colors',
              showBenefit
                ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
            )}
          >
            優待換算額を{showBenefit ? '非表示' : '表示'}
          </button>
        </div>
        {monthlyData.some((d) => d.dividend + d.benefit > 0) ? (
          <DividendBarChart data={monthlyData} showBenefit={showBenefit} />
        ) : (
          <p className="text-zinc-500 text-sm py-8 text-center">この年の記録がありません</p>
        )}
      </div>

      {/* 銘柄別配当割合（円グラフ） */}
      {dividendByAsset.length > 0 && (() => {
        const grouped = groupSmallSlices(dividendByAsset)
        const total = grouped.reduce((s, d) => s + d.value, 0)
        const pieData = grouped.map((d, i) => ({
          ...d,
          color: d.name.startsWith('その他') ? OTHER_COLOR : PIE_COLORS[i % PIE_COLORS.length],
        }))
        return (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-1">
              銘柄別配当割合
              <span className="text-xs text-zinc-500 font-normal ml-2">年間・設定値ベース（{PIE_THRESHOLD}%未満はその他）</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AssetPieChart data={pieData} showLegend={false} height={220} />
              <div className="flex flex-col justify-center gap-2 py-2">
                {pieData.map((d) => {
                  const pct = total > 0 ? (d.value / total) * 100 : 0
                  return (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="flex-1 text-zinc-300 truncate text-xs">{d.name}</span>
                      <span className="text-zinc-400 text-xs w-12 text-right">{pct.toFixed(1)}%</span>
                      <span className="text-white font-medium text-xs w-24 text-right">{formatJpy(d.value)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* 追加フォーム */}
      {showForm && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">配当・優待を記録</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* 銘柄選択 */}
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>銘柄</label>
              {!useManualName ? (
                <select
                  value={assetId}
                  onChange={(e) => handleAssetChange(e.target.value)}
                  className={inputCls}
                >
                  <option value="">選択してください</option>
                  {assetOptions.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              ) : (
                <input name="asset_name" className={inputCls} required placeholder="銘柄名を入力" />
              )}
              <input type="hidden" name="asset_id" value={assetId} />
              <input type="hidden" name="asset_name" value={!useManualName ? assetName : undefined} />
              <button
                type="button"
                onClick={() => { setUseManualName(!useManualName); setAssetId(''); setAssetName('') }}
                className="text-xs text-zinc-500 hover:text-zinc-300 mt-1"
              >
                {useManualName ? '← 一覧から選択' : '手入力する →'}
              </button>
            </div>

            <div>
              <label className={labelCls}>種別</label>
              <select name="dividend_type" className={inputCls}>
                <option value="dividend">配当金</option>
                <option value="benefit">株主優待</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>受取金額（円）</label>
              <input name="amount" type="number" min="1" required className={inputCls} placeholder="5000" />
            </div>

            <div>
              <label className={labelCls}>支払日</label>
              <input name="payment_date" type="date" required className={inputCls}
                defaultValue={new Date().toISOString().split('T')[0]} />
            </div>

            <div>
              <label className={labelCls}>メモ（任意）</label>
              <input name="note" className={inputCls} placeholder="中間配当 など" />
            </div>

            <div className="col-span-2 sm:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">
                キャンセル
              </button>
              <button type="submit" disabled={isPending}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg">
                {isPending ? '保存中...' : '記録する'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 記録一覧 */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">{year}年の記録</h2>
          <span className="text-sm font-medium text-zinc-300">{records.length}件</span>
        </div>
        {records.length === 0 ? (
          <p className="text-zinc-500 text-sm py-8 text-center">記録がありません</p>
        ) : (
          <div className="divide-y divide-zinc-800">
            {records.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/50 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{r.asset_name}</span>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      r.dividend_type === 'dividend'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-amber-500/20 text-amber-400'
                    )}>
                      {TYPE_LABELS[r.dividend_type] ?? r.dividend_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-500">{r.payment_date}</span>
                    {r.note && <span className="text-xs text-zinc-600">{r.note}</span>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-emerald-400">{formatJpy(r.amount)}</span>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-500 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {records.length > 0 && (
          <div className="px-5 py-3 border-t border-zinc-800 flex justify-between items-center">
            <span className="text-sm text-zinc-400">合計</span>
            <span className="text-sm font-bold text-emerald-400">{formatJpy(records.reduce((s, r) => s + r.amount, 0))}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className={cn('text-lg font-bold', accent ? 'text-emerald-400' : 'text-white')}>{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
    </div>
  )
}
