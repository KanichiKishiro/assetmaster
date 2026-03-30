'use client'

import { useTransition, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Search } from 'lucide-react'
import { updateAssetFromForm } from '@/lib/actions/assets'
import type { DbAsset } from '@/lib/types'

interface Props {
  asset: DbAsset
  open: boolean
  onClose: () => void
}

const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-600'
const labelCls = 'block text-xs text-zinc-400 mb-1'

function monthsToStr(months: number[] | null | undefined): string {
  return months?.join(',') ?? ''
}

export function AssetEditModal({ asset, open, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [ticker, setTicker] = useState(asset.ticker ?? '')
  const [fundCode, setFundCode] = useState(asset.fund_code ?? '')
  const [name, setName] = useState(asset.name)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')

  async function fetchStockInfo() {
    if (!ticker.trim()) return
    setFetching(true)
    setFetchError('')
    try {
      const market = asset.category === 'japan_stock' ? 'japan' : 'us'
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
    setSaveError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('category', asset.category)
    startTransition(async () => {
      try {
        await updateAssetFromForm(asset.id, fd)
        onClose()
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : '保存に失敗しました')
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-zinc-900 rounded-2xl border border-zinc-800 p-6 z-50 max-h-[90vh] overflow-y-auto shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-white">
              資産を編集
            </Dialog.Title>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* 共通: 名前 */}
            <div>
              <label className={labelCls}>銘柄名・口座名</label>
              <input name="name" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
            </div>

            {/* 株式共通 */}
            {(asset.category === 'japan_stock' || asset.category === 'us_stock') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{asset.category === 'japan_stock' ? '銘柄コード' : 'ティッカー'}</label>
                    <div className="flex gap-1">
                      <input
                        name="ticker"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchStockInfo() } }}
                        className={inputCls}
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
                    <label className={labelCls}>保有株数</label>
                    <input name="shares" type="number" step="0.0001" min="0" defaultValue={asset.shares ?? ''} required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>取得単価{asset.category === 'us_stock' ? '（USD）' : '（円）'}</label>
                    <input name="purchase_price" type="number" step="0.01" min="0" defaultValue={asset.purchase_price ?? ''} required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>証券会社</label>
                    <input name="broker" defaultValue={asset.broker ?? ''} className={inputCls} placeholder="例: SBI証券" />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>口座種別</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {([['nisa', 'NISA'], ['tokutei', '特定口座'], ['general', '一般口座']] as const).map(([val, label]) => (
                        <label key={val} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="account_type"
                            value={val}
                            defaultChecked={asset.account_type === val}
                            className="accent-emerald-500"
                          />
                          <span className="text-sm text-zinc-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>月別配当金（1株あたり・円）※受取がない月は空欄か0</label>
                    <div className="grid grid-cols-6 gap-1.5 mt-1">
                      {['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'].map((label, i) => (
                        <div key={i}>
                          <span className="block text-xs text-zinc-500 mb-0.5 text-center">{label}</span>
                          <input
                            name={`dividend_m${i + 1}`}
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={(asset.dividend_per_month ?? [])[i] || ''}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1.5 text-xs text-white text-right focus:outline-none focus:border-emerald-600"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 米国株: 配当権利確定月 */}
                {asset.category === 'us_stock' && (
                  <div className="border-t border-zinc-800 pt-3">
                    <p className="text-xs text-zinc-500 font-medium mb-2">配当権利確定月</p>
                    <div>
                      <label className={labelCls}>権利確定月（カンマ区切り）</label>
                      <input name="settlement_months" defaultValue={monthsToStr(asset.settlement_months)} className={inputCls} placeholder="例: 3,6,9,12" />
                    </div>
                  </div>
                )}

                {/* 日本株のみ: 優待情報 */}
                {asset.category === 'japan_stock' && (
                  <div className="border-t border-zinc-800 pt-3 space-y-3">
                    <p className="text-xs text-zinc-500 font-medium">株主優待</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>優待確定月（カンマ区切り）</label>
                        <input name="settlement_months" defaultValue={monthsToStr(asset.settlement_months)} className={inputCls} placeholder="例: 3,9" />
                      </div>
                      <div>
                        <label className={labelCls}>優待換算額（年間・円）</label>
                        <input name="benefit_value" type="number" min="0" defaultValue={asset.benefit_value ?? ''} className={inputCls} placeholder="例: 3000" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>優待内容</label>
                      <input name="benefit_description" defaultValue={asset.benefit_description ?? ''} className={inputCls} placeholder="例: QUOカード 3,000円相当" />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 投資信託 */}
            {asset.category === 'mutual_fund' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>ファンドコード（8桁）</label>
                  <div className="flex gap-1">
                    <input
                      name="fund_code"
                      value={fundCode}
                      onChange={(e) => setFundCode(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchFundInfo() } }}
                      maxLength={8}
                      placeholder="例: 0131312B"
                      className={inputCls}
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
                  <label className={labelCls}>保有口数</label>
                  <input name="units" type="number" min="0" defaultValue={asset.units ?? ''} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>取得時基準価額</label>
                  <input name="nav_at_purchase" type="number" step="0.01" min="0" defaultValue={asset.nav_at_purchase ?? ''} required className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>現在基準価額（手動・ファンドコード未設定時）</label>
                  <input name="current_nav" type="number" step="0.01" min="0" defaultValue={asset.current_nav ?? ''} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>証券会社</label>
                  <input name="broker" defaultValue={asset.broker ?? ''} placeholder="例: SBI証券" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>口座種別</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {([['nisa', 'NISA'], ['tokutei', '特定口座'], ['general', '一般口座']] as const).map(([val, label]) => (
                      <label key={val} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="account_type" value={val} defaultChecked={asset.account_type === val} className="accent-emerald-500" />
                        <span className="text-sm text-zinc-300">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 銀行 */}
            {asset.category === 'bank' && (
              <div>
                <label className={labelCls}>残高（円）</label>
                <input name="balance" type="number" min="0" defaultValue={asset.balance ?? ''} required className={inputCls} />
              </div>
            )}

            {saveError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{saveError}</p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
                キャンセル
              </button>
              <button type="submit" disabled={isPending}
                className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors">
                {isPending ? '保存中...' : '保存する'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
