'use client'

import { useState, useTransition } from 'react'
import { Upload, AlertCircle, CheckCircle, Download, X } from 'lucide-react'
import { parseCsv, CSV_TEMPLATE } from '@/lib/csv-parser'
import { importAssets } from '@/lib/actions/import'
import { CATEGORY_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { CsvRow, ParseResult } from '@/lib/csv-parser'

export function CsvImport() {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [result, setResult] = useState<{ inserted: number; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setParseResult(parseCsv(text))
    }
    reader.readAsText(file, 'UTF-8')
    // input をリセットして同じファイルを再選択できるように
    e.target.value = ''
  }

  function handleImport() {
    if (!parseResult || parseResult.valid.length === 0) return
    startTransition(async () => {
      const res = await importAssets(parseResult.valid)
      setResult(res)
      if (!res.error) setParseResult(null)
    })
  }

  function handleReset() {
    setParseResult(null)
    setFileName(null)
    setResult(null)
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'assetmaster_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* テンプレートダウンロード */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">CSVファイルから資産を一括登録します</p>
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <Download size={13} />
          テンプレートをダウンロード
        </button>
      </div>

      {/* ファイル選択 */}
      {!parseResult && (
        <label className="flex flex-col items-center justify-center gap-2 bg-zinc-800 border-2 border-zinc-700 border-dashed rounded-xl px-4 py-8 cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/80 transition-colors">
          <Upload size={24} className="text-zinc-500" />
          <span className="text-sm text-zinc-400">
            {fileName ? fileName : 'CSVファイルをクリックして選択'}
          </span>
          <span className="text-xs text-zinc-600">UTF-8 形式の .csv ファイル</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </label>
      )}

      {/* 成功メッセージ */}
      {result && !result.error && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
          <CheckCircle size={18} className="text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-400">{result.inserted}件のデータを登録しました</p>
            <p className="text-xs text-zinc-400 mt-0.5">資産管理ページで確認できます</p>
          </div>
          <button onClick={handleReset} className="ml-auto text-zinc-500 hover:text-zinc-300">
            <X size={16} />
          </button>
        </div>
      )}

      {/* エラーメッセージ（インポート失敗） */}
      {result?.error && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3">
          <AlertCircle size={18} className="text-rose-500 shrink-0" />
          <p className="text-sm text-rose-400">{result.error}</p>
        </div>
      )}

      {/* パース結果プレビュー */}
      {parseResult && (
        <div className="space-y-3">
          {/* エラー行 */}
          {parseResult.errors.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={15} className="text-rose-400" />
                <p className="text-sm font-medium text-rose-400">
                  {parseResult.errors.length}行にエラーがあります（スキップされます）
                </p>
              </div>
              <ul className="space-y-1">
                {parseResult.errors.map((e) => (
                  <li key={e.line} className="text-xs text-zinc-400">
                    <span className="text-rose-400">行{e.line}:</span> {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 有効行プレビュー */}
          {parseResult.valid.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-300">
                  <span className="text-emerald-400 font-medium">{parseResult.valid.length}件</span>
                  を登録します
                </p>
                <button onClick={handleReset} className="text-xs text-zinc-500 hover:text-zinc-300">
                  キャンセル
                </button>
              </div>

              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-800 text-zinc-400 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">カテゴリ</th>
                        <th className="px-3 py-2 text-left">銘柄名</th>
                        <th className="px-3 py-2 text-left">ティッカー</th>
                        <th className="px-3 py-2 text-right">数量</th>
                        <th className="px-3 py-2 text-right">取得単価 / 残高</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {parseResult.valid.map((row, i) => (
                        <PreviewRow key={i} row={row} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                type="button"
                onClick={handleImport}
                disabled={isPending}
                className={cn(
                  'w-full py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isPending
                    ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                )}
              >
                {isPending ? '登録中...' : `${parseResult.valid.length}件を一括登録する`}
              </button>
            </>
          ) : (
            <div className="text-center py-6 text-zinc-500 text-sm">
              有効なデータが見つかりませんでした
              <button onClick={handleReset} className="block mx-auto mt-2 text-xs text-zinc-400 hover:text-zinc-300">
                別のファイルを選択
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PreviewRow({ row }: { row: CsvRow }) {
  const qty = row.category === 'bank'
    ? '-'
    : row.category === 'mutual_fund'
    ? `${row.units?.toLocaleString()}口`
    : `${row.shares?.toLocaleString()}株`

  const price = row.category === 'bank'
    ? `${row.balance?.toLocaleString()}円`
    : row.category === 'mutual_fund'
    ? `${row.nav_at_purchase?.toLocaleString()}円`
    : row.category === 'us_stock'
    ? `$${row.purchase_price?.toFixed(2)}`
    : `${row.purchase_price?.toLocaleString()}円`

  return (
    <tr className="hover:bg-zinc-800/50 text-zinc-300">
      <td className="px-3 py-2">
        <span className="bg-zinc-700 rounded px-1.5 py-0.5 text-zinc-300">
          {CATEGORY_LABELS[row.category]}
        </span>
      </td>
      <td className="px-3 py-2">{row.name}</td>
      <td className="px-3 py-2 text-zinc-500">{row.ticker ?? '-'}</td>
      <td className="px-3 py-2 text-right">{qty}</td>
      <td className="px-3 py-2 text-right">{price}</td>
    </tr>
  )
}
