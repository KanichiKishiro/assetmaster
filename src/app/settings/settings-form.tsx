'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'

interface Props {
  defaultUsdJpy: string
  updatedAt: string
  saveSettings: (formData: FormData) => Promise<void>
}

export function SettingsForm({ defaultUsdJpy, updatedAt, saveSettings }: Props) {
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await saveSettings(formData)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">USD/JPY レート</label>
          <input
            name="usd_jpy"
            type="number"
            defaultValue={defaultUsdJpy}
            step="0.01"
            min="1"
            max="999"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-600"
          />
          <p className="text-xs text-zinc-500 mt-1">米国株の円換算に使用されます</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">最終更新</label>
          <div className="bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-400">{updatedAt}</div>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            saved ? 'bg-emerald-700 text-emerald-200' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          <Save size={14} />
          {saved ? '保存しました' : '保存する'}
        </button>
      </div>
    </form>
  )
}
