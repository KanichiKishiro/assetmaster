'use client'

import { useState, useTransition, useRef } from 'react'
import { Plus, Pencil, Check, X, TrendingUp, TrendingDown, Settings2, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { addAsset, updateAssetField, deleteAsset } from '@/lib/actions/assets'
import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORIES } from '@/lib/constants'
import { formatJpy, formatPercent, cn } from '@/lib/utils'
import type { DbAsset, AssetCategory } from '@/lib/types'
import { BankTransaction } from './bank-transaction'
import { AssetEditModal } from './asset-edit-modal'

interface Props {
  initialAssets: DbAsset[]
  prices: Record<string, number | null>
  usdJpy: number
}

interface EditState {
  id: string
  field: 'shares' | 'balance' | 'units' | 'current_nav'
  value: string
}

function calcValue(asset: DbAsset, prices: Record<string, number | null>, usdJpy: number): number {
  if (asset.category === 'japan_stock') return (asset.shares ?? 0) * (prices[asset.ticker!] ?? 0)
  if (asset.category === 'us_stock') return (asset.shares ?? 0) * (prices[asset.ticker!] ?? 0) * usdJpy
  if (asset.category === 'mutual_fund') {
    const nav = (asset.fund_code && prices[asset.fund_code] != null)
      ? prices[asset.fund_code]!
      : (asset.current_nav ?? 0)
    return ((asset.units ?? 0) * nav) / 10000
  }
  if (asset.category === 'bank') return asset.balance ?? 0
  return 0
}

function calcCost(asset: DbAsset, usdJpy: number): number | null {
  if (asset.category === 'japan_stock') {
    if (!asset.purchase_price) return null
    return (asset.shares ?? 0) * asset.purchase_price
  }
  if (asset.category === 'us_stock') {
    if (!asset.purchase_price) return null
    return (asset.shares ?? 0) * asset.purchase_price * usdJpy
  }
  if (asset.category === 'mutual_fund') {
    if (!asset.nav_at_purchase) return null
    return ((asset.units ?? 0) * asset.nav_at_purchase) / 10000
  }
  return null
}

function calcGainRate(asset: DbAsset, prices: Record<string, number | null>): number | null {
  if (asset.category === 'japan_stock') {
    const cur = prices[asset.ticker!]
    const pur = asset.purchase_price
    if (!cur || !pur) return null
    return ((cur - pur) / pur) * 100
  }
  if (asset.category === 'us_stock') {
    const cur = prices[asset.ticker!]
    const pur = asset.purchase_price
    if (!cur || !pur) return null
    return ((cur - pur) / pur) * 100
  }
  if (asset.category === 'mutual_fund') {
    const cur = (asset.fund_code && prices[asset.fund_code] != null)
      ? prices[asset.fund_code]!
      : asset.current_nav
    const pur = asset.nav_at_purchase
    if (!cur || !pur) return null
    return ((cur - pur) / pur) * 100
  }
  return null
}

export function AssetsClient({ initialAssets, prices, usdJpy }: Props) {
  const [editState, setEditState] = useState<EditState | null>(null)
  const [editingAsset, setEditingAsset] = useState<DbAsset | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formCategory, setFormCategory] = useState<AssetCategory>('japan_stock')
  const [collapsed, setCollapsed] = useState<Set<AssetCategory>>(new Set())
  const [isPending, startTransition] = useTransition()

  function toggleCollapse(cat: AssetCategory) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function startEdit(asset: DbAsset) {
    if (asset.category === 'bank') {
      setEditState({ id: asset.id, field: 'balance', value: String(asset.balance ?? '') })
    } else if (asset.category === 'mutual_fund') {
      setEditState({ id: asset.id, field: 'current_nav', value: String(asset.current_nav ?? '') })
    } else {
      setEditState({ id: asset.id, field: 'shares', value: String(asset.shares ?? '') })
    }
  }

  function commitEdit() {
    if (!editState) return
    const val = parseFloat(editState.value)
    if (isNaN(val) || val < 0) { setEditState(null); return }
    startTransition(async () => {
      await updateAssetField(editState.id, editState.field, val)
      setEditState(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('この資産を削除しますか？')) return
    startTransition(() => deleteAsset(id))
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">資産管理</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          資産を追加
        </button>
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 mb-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">新規資産登録</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFormCategory(cat)}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium border transition-colors',
                  formCategory === cat
                    ? 'border-emerald-600 bg-emerald-900/30 text-emerald-400'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          <AssetForm
            category={formCategory}
            onClose={() => setShowForm(false)}
            isPending={isPending}
            startTransition={startTransition}
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      {/* カテゴリ別一覧 */}
      {CATEGORIES.map((cat) => {
        const catAssets = initialAssets.filter((a) => a.category === cat)
        if (catAssets.length === 0) return null
        const catTotal = catAssets.reduce((sum, a) => sum + calcValue(a, prices, usdJpy), 0)

        const isCollapsed = collapsed.has(cat)
        return (
          <div key={cat} className="bg-zinc-900 rounded-xl border border-zinc-800 mb-4 overflow-hidden">
            <button
              onClick={() => toggleCollapse(cat)}
              className="w-full flex items-center justify-between px-5 py-3 border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                <h2 className="text-sm font-semibold text-zinc-200">{CATEGORY_LABELS[cat]}</h2>
                <span className="text-xs text-zinc-500">{catAssets.length}件</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-300">{formatJpy(Math.round(catTotal))}</span>
                {isCollapsed ? <ChevronRight size={15} className="text-zinc-500" /> : <ChevronDown size={15} className="text-zinc-500" />}
              </div>
            </button>

            {!isCollapsed && <div className="divide-y divide-zinc-800">
              {catAssets.map((asset) => {
                const value = calcValue(asset, prices, usdJpy)
                const cost = calcCost(asset, usdJpy)
                const gainRate = calcGainRate(asset, prices)
                const isEditing = editState?.id === asset.id

                return (
                  <div key={asset.id} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{asset.name}</span>
                        {asset.ticker && (
                          <span className="text-xs text-zinc-500">{asset.ticker}</span>
                        )}
                        {asset.account_type && (
                          <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded font-medium',
                            asset.account_type === 'nisa'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-zinc-700 text-zinc-400'
                          )}>
                            {asset.account_type === 'nisa' ? 'NISA' : asset.account_type === 'tokutei' ? '特定' : '一般'}
                          </span>
                        )}
                        {asset.broker && (
                          <span className="text-xs text-zinc-600">{asset.broker}</span>
                        )}
                        {asset.category === 'japan_stock' &&
                          Array.isArray(asset.settlement_months) &&
                          asset.settlement_months.includes(new Date().getMonth() + 1) && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">優待月</span>
                          )}
                        {asset.category === 'us_stock' &&
                          Array.isArray(asset.settlement_months) &&
                          asset.settlement_months.includes(new Date().getMonth() + 1) && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">配当月</span>
                          )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {formatQuantityLabel(asset, prices)}
                      </p>
                      {(asset.category === 'japan_stock' || asset.category === 'us_stock') &&
                        asset.dividend_per_month?.some((v) => v > 0) && (() => {
                          const annualPerShare = (asset.dividend_per_month ?? []).reduce((s, v) => s + (v ?? 0), 0)
                          const annualTotal = Math.round((asset.shares ?? 0) * annualPerShare)
                          return (
                            <p className="text-xs text-blue-400 mt-0.5">
                              年間配当 {formatJpy(annualTotal)}
                              <span className="text-zinc-500 ml-1">({formatJpy(Math.round(annualPerShare))}/株)</span>
                            </p>
                          )
                        })()}
                      {asset.category === 'japan_stock' && (asset.benefit_description || asset.benefit_value) && (
                        <p className="text-xs text-amber-400 mt-0.5">
                          優待: {asset.benefit_description ?? ''}
                          {asset.benefit_value ? <span className="text-zinc-500 ml-1">（{formatJpy(asset.benefit_value)}）</span> : null}
                        </p>
                      )}
                      {asset.category === 'bank' && (
                        <BankTransaction
                          assetId={asset.id}
                          assetName={asset.name}
                          currentBalance={asset.balance ?? 0}
                        />
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editState.value}
                            onChange={(e) => setEditState({ ...editState, value: e.target.value })}
                            className="w-28 bg-zinc-800 border border-emerald-600 rounded px-2 py-1 text-sm text-white text-right focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit()
                              if (e.key === 'Escape') setEditState(null)
                            }}
                          />
                          <button onClick={commitEdit} disabled={isPending} className="text-emerald-500 hover:text-emerald-400">
                            <Check size={15} />
                          </button>
                          <button onClick={() => setEditState(null)} className="text-zinc-500 hover:text-zinc-400">
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {gainRate !== null && (
                            <div className={cn(
                              'flex items-center gap-1 text-xs font-medium',
                              gainRate >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            )}>
                              {gainRate >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {formatPercent(gainRate)}
                            </div>
                          )}
                          <div className="text-right space-y-0.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-xs text-zinc-500">評価額</span>
                              <span className="text-sm font-medium text-white">{formatJpy(Math.round(value))}</span>
                            </div>
                            {(asset.category === 'japan_stock' || asset.category === 'us_stock' || asset.category === 'mutual_fund') && (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-xs text-zinc-500">取得額</span>
                                <span className="text-xs text-zinc-400">
                                  {cost !== null ? formatJpy(Math.round(cost)) : '―'}
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => startEdit(asset)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-opacity"
                            title="数量を編集"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setEditingAsset(asset)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-emerald-400 transition-opacity"
                            title="詳細を編集"
                          >
                            <Settings2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(asset.id)}
                            disabled={isPending}
                            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-500 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>}
          </div>
        )
      })}

      {initialAssets.length === 0 && !showForm && (
        <div className="text-center py-16 text-zinc-500">
          <p className="mb-2">まだ資産が登録されていません</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-emerald-400 hover:text-emerald-300 text-sm"
          >
            最初の資産を追加する →
          </button>
        </div>
      )}

      {/* 編集モーダル */}
      {editingAsset && (
        <AssetEditModal
          asset={editingAsset}
          open={!!editingAsset}
          onClose={() => setEditingAsset(null)}
        />
      )}
    </div>
  )
}

function formatQuantityLabel(asset: DbAsset, prices: Record<string, number | null>): string {
  if (asset.category === 'japan_stock') {
    const price = prices[asset.ticker!]
    return `${(asset.shares ?? 0).toLocaleString()}株 × ${price ? formatJpy(price) : '取得中...'}`
  }
  if (asset.category === 'us_stock') {
    const price = prices[asset.ticker!]
    return `${asset.shares ?? 0}株 × ${price ? `$${price.toFixed(2)}` : '取得中...'}`
  }
  if (asset.category === 'mutual_fund') {
    const nav = (asset.fund_code && prices[asset.fund_code] != null)
      ? prices[asset.fund_code]!
      : asset.current_nav
    const navLabel = nav != null ? `${nav.toLocaleString()}円` : '―'
    const autoTag = (asset.fund_code && prices[asset.fund_code] != null) ? ' (自動取得)' : ''
    return `${(asset.units ?? 0).toLocaleString()}口 / 基準価額 ${navLabel}${autoTag}`
  }
  if (asset.category === 'bank') {
    return '残高（手動更新）'
  }
  return ''
}

// ---- 追加フォーム ----
interface AssetFormProps {
  category: AssetCategory
  onClose: () => void
  onDone: () => void
  isPending: boolean
  startTransition: (fn: () => void) => void
}

function AssetForm({ category, onClose, onDone, isPending, startTransition }: AssetFormProps) {
  const inputClass = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-600 w-full'
  const labelClass = 'block text-xs text-zinc-400 mb-1'
  const [ticker, setTicker] = useState('')
  const [fundCode, setFundCode] = useState('')
  const [name, setName] = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  async function fetchStockInfo() {
    if (!ticker.trim()) return
    setFetching(true)
    setFetchError('')
    try {
      const market = category === 'japan_stock' ? 'japan' : 'us'
      const res = await fetch(`/api/stock-info?ticker=${encodeURIComponent(ticker.trim())}&market=${market}`)
      if (!res.ok) { setFetchError('銘柄が見つかりません'); return }
      const data = await res.json()
      if (data.name) setName(data.name)
      else setFetchError('銘柄名を取得できませんでした')
    } catch {
      setFetchError('取得に失敗しました')
    } finally {
      setFetching(false)
    }
  }

  async function fetchFundInfo() {
    if (!fundCode.trim()) return
    setFetching(true)
    setFetchError('')
    try {
      const res = await fetch(`/api/stock-info?ticker=${encodeURIComponent(fundCode.trim())}&market=fund`)
      if (!res.ok) { setFetchError('ファンドが見つかりません'); return }
      const data = await res.json()
      if (data.name) setName(data.name)
      else setFetchError('ファンド名を取得できませんでした')
    } catch {
      setFetchError('取得に失敗しました')
    } finally {
      setFetching(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('category', category)
    startTransition(() => {
      addAsset(formData).then(() => onDone())
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div>
        <label className={labelClass}>銘柄名・口座名</label>
        <input
          name="name"
          className={inputClass}
          required
          placeholder="例: トヨタ自動車"
          value={name}
          onChange={(e) => setName(e.target.value)}
          ref={nameRef}
        />
      </div>

      {(category === 'japan_stock' || category === 'us_stock') && (
        <>
          <div>
            <label className={labelClass}>{category === 'japan_stock' ? '銘柄コード' : 'ティッカー'}</label>
            <div className="flex gap-1">
              <input
                name="ticker"
                className={inputClass}
                placeholder={category === 'japan_stock' ? '7203' : 'AAPL'}
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchStockInfo() } }}
              />
              <button
                type="button"
                onClick={fetchStockInfo}
                disabled={fetching || !ticker.trim()}
                title="銘柄名を自動取得"
                className="shrink-0 px-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded-lg text-zinc-300 transition-colors"
              >
                {fetching ? <span className="text-xs">...</span> : <Search size={14} />}
              </button>
            </div>
            {fetchError && <p className="text-xs text-rose-400 mt-1">{fetchError}</p>}
          </div>
          <div>
            <label className={labelClass}>保有数（株）</label>
            <input name="shares" className={inputClass} type="number" required min="0" step="0.0001" />
          </div>
          <div>
            <label className={labelClass}>取得単価{category === 'us_stock' ? '（USD）' : '（円）'}</label>
            <input name="purchase_price" className={inputClass} type="number" required min="0" step="0.01" />
          </div>
          <div>
            <label className={labelClass}>証券会社</label>
            <input name="broker" className={inputClass} placeholder="例: SBI証券" />
          </div>
          <div className="col-span-2 sm:col-span-2">
            <label className={labelClass}>口座種別</label>
            <div className="flex gap-4 mt-2">
              {([['nisa', 'NISA'], ['tokutei', '特定口座'], ['general', '一般口座']] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="account_type" value={val} className="accent-emerald-500" />
                  <span className="text-sm text-zinc-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className={labelClass}>月別配当金（1株あたり・円）※受取がない月は空欄か0</label>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 mt-1">
              {['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'].map((label, i) => (
                <div key={i}>
                  <span className="block text-xs text-zinc-500 mb-0.5 text-center">{label}</span>
                  <input
                    name={`dividend_m${i + 1}`}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1.5 text-xs text-white text-right focus:outline-none focus:border-emerald-600"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
          {category === 'us_stock' && (
            <div>
              <label className={labelClass}>配当権利確定月（カンマ区切り）</label>
              <input name="settlement_months" className={inputClass} placeholder="例: 3,6,9,12" />
            </div>
          )}
          {category === 'japan_stock' && (
            <>
              <div>
                <label className={labelClass}>優待確定月（カンマ区切り）</label>
                <input name="settlement_months" className={inputClass} placeholder="3,9" />
              </div>
              <div>
                <label className={labelClass}>優待内容</label>
                <input name="benefit_description" className={inputClass} placeholder="QUOカード等" />
              </div>
              <div>
                <label className={labelClass}>優待換算額（円）</label>
                <input name="benefit_value" className={inputClass} type="number" min="0" />
              </div>
            </>
          )}
        </>
      )}

      {category === 'mutual_fund' && (
        <>
          <div className="col-span-2 sm:col-span-3">
            <label className={labelClass}>ファンドコード（8桁）</label>
            <div className="flex gap-1">
              <input
                name="fund_code"
                className={inputClass}
                placeholder="例: 0131312B"
                maxLength={8}
                value={fundCode}
                onChange={(e) => setFundCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchFundInfo() } }}
              />
              <button
                type="button"
                onClick={fetchFundInfo}
                disabled={fetching || !fundCode.trim()}
                title="ファンド名を自動取得"
                className="shrink-0 px-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded-lg text-zinc-300 transition-colors"
              >
                {fetching ? <span className="text-xs">...</span> : <Search size={14} />}
              </button>
            </div>
            {fetchError && <p className="text-xs text-rose-400 mt-1">{fetchError}</p>}
            <p className="text-xs text-zinc-500 mt-1">コードを入力して検索するとファンド名・基準価額を自動取得します</p>
          </div>
          <div>
            <label className={labelClass}>保有口数</label>
            <input name="units" className={inputClass} type="number" required min="0" />
          </div>
          <div>
            <label className={labelClass}>取得時基準価額</label>
            <input name="nav_at_purchase" className={inputClass} type="number" required min="0" />
          </div>
          <div>
            <label className={labelClass}>現在基準価額（手動・ファンドコード未設定時）</label>
            <input name="current_nav" className={inputClass} type="number" min="0" />
          </div>
          <div>
            <label className={labelClass}>証券会社</label>
            <input name="broker" className={inputClass} placeholder="例: SBI証券" />
          </div>
          <div className="col-span-2 sm:col-span-2">
            <label className={labelClass}>口座種別</label>
            <div className="flex gap-4 mt-2">
              {([['nisa', 'NISA'], ['tokutei', '特定口座'], ['general', '一般口座']] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="account_type" value={val} className="accent-emerald-500" />
                  <span className="text-sm text-zinc-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {category === 'bank' && (
        <div>
          <label className={labelClass}>残高（円）</label>
          <input name="balance" className={inputClass} type="number" required min="0" />
        </div>
      )}

      <div className="col-span-2 sm:col-span-3 flex gap-2 justify-end mt-1">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {isPending ? '保存中...' : '追加する'}
        </button>
      </div>
    </form>
  )
}
