'use client'

import { useState, useTransition } from 'react'
import { Plus, History, ArrowDownCircle, ArrowUpCircle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { recordTransaction, getTransactionHistory } from '@/lib/actions/transactions'
import { formatJpy, cn } from '@/lib/utils'
import type { TransactionType } from '@/lib/actions/transactions'

interface BalanceLog {
  id: string
  transaction_type: string
  diff: number
  new_balance: number
  memo: string | null
  transaction_date: string | null
  recorded_at: string
}

interface Props {
  assetId: string
  assetName: string
  currentBalance: number
}

const TX_TYPES: { value: TransactionType; label: string; color: string }[] = [
  { value: 'deposit',    label: '入金',      color: 'text-emerald-400' },
  { value: 'withdrawal', label: '出金',      color: 'text-rose-400' },
  { value: 'deduction',  label: '引き落とし', color: 'text-amber-400' },
]

export function BankTransaction({ assetId, assetName, currentBalance }: Props) {
  const [open, setOpen] = useState<'form' | 'history' | null>(null)
  const [txType, setTxType] = useState<TransactionType>('deposit')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [history, setHistory] = useState<BalanceLog[]>([])
  const [isPending, startTransition] = useTransition()
  const [txError, setTxError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount.replace(/,/g, ''))
    if (isNaN(num) || num <= 0) return
    setTxError(null)
    startTransition(async () => {
      try {
        await recordTransaction(assetId, txType, num, memo, date)
        setAmount('')
        setMemo('')
        setOpen(null)
      } catch (err) {
        setTxError(err instanceof Error ? err.message : '記録に失敗しました')
      }
    })
  }

  function toggleHistory() {
    if (open === 'history') { setOpen(null); return }
    startTransition(async () => {
      const logs = await getTransactionHistory(assetId)
      setHistory(logs as BalanceLog[])
      setOpen('history')
    })
  }

  return (
    <div className="mt-1">
      {/* ボタン群 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(open === 'form' ? null : 'form')}
          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <Plus size={13} />
          取引を記録
        </button>
        <button
          type="button"
          onClick={toggleHistory}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <History size={13} />
          {open === 'history' ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          履歴
        </button>
      </div>

      {/* 入出金フォーム */}
      {open === 'form' && (
        <form onSubmit={handleSubmit} className="mt-2 bg-zinc-800 rounded-lg p-3 space-y-2">
          {/* 取引種別 */}
          <div className="flex gap-2">
            {TX_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTxType(t.value)}
                className={cn(
                  'flex-1 text-xs py-1.5 rounded border transition-colors',
                  txType === t.value
                    ? 'border-zinc-500 bg-zinc-700 ' + t.color
                    : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* 金額 */}
            <div>
              <label className="text-xs text-zinc-500 mb-0.5 block">金額（円）</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                placeholder="10000"
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600"
              />
            </div>
            {/* 日付 */}
            <div>
              <label className="text-xs text-zinc-500 mb-0.5 block">日付</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="text-xs text-zinc-500 mb-0.5 block">メモ（任意）</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="給与、家賃 など"
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* 反映後残高プレビュー */}
          {amount && !isNaN(parseFloat(amount)) && (
            <p className="text-xs text-zinc-400">
              反映後残高:{' '}
              <span className="text-white font-medium">
                {formatJpy(
                  Math.max(0, currentBalance + (txType === 'deposit' ? 1 : -1) * parseFloat(amount.replace(/,/g, '')))
                )}
              </span>
            </p>
          )}

          {txError && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-2 py-1.5">{txError}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="flex-1 text-xs text-zinc-400 hover:text-white py-1.5 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded py-1.5 transition-colors"
            >
              {isPending ? '記録中...' : '記録する'}
            </button>
          </div>
        </form>
      )}

      {/* 取引履歴 */}
      {open === 'history' && (
        <div className="mt-2 bg-zinc-800 rounded-lg overflow-hidden">
          {history.length === 0 ? (
            <p className="text-xs text-zinc-500 px-3 py-3 text-center">取引履歴がありません</p>
          ) : (
            <div className="divide-y divide-zinc-700">
              {history.map((log) => {
                const isPositive = log.diff >= 0
                const typeLabel = TX_TYPES.find((t) => t.value === log.transaction_type)?.label
                  ?? (isPositive ? '入金' : '出金')
                return (
                  <div key={log.id} className="flex items-center gap-3 px-3 py-2">
                    {isPositive
                      ? <ArrowDownCircle size={14} className="text-emerald-500 shrink-0" />
                      : <ArrowUpCircle size={14} className="text-rose-500 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-300">{typeLabel}</span>
                        {log.memo && <span className="text-xs text-zinc-500 truncate">{log.memo}</span>}
                      </div>
                      <span className="text-xs text-zinc-600">
                        {log.transaction_date ?? log.recorded_at.slice(0, 10)}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('text-xs font-medium', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
                        {isPositive ? '+' : ''}{formatJpy(log.diff)}
                      </p>
                      <p className="text-xs text-zinc-500">{formatJpy(log.new_balance)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
