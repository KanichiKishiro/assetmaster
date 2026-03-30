import { redirect } from 'next/navigation'
import { RefreshCw, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { saveSettings } from '@/lib/actions/settings'
import { SettingsForm } from './settings-form'
import { CsvImport } from './csv-import'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('usd_jpy, updated_at')
    .eq('user_id', user.id)
    .single()

  const usdJpy = settings?.usd_jpy ?? 149.5
  const updatedAt = settings?.updated_at
    ? new Date(settings.updated_at).toLocaleString('ja-JP')
    : '未設定'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">設定</h1>

      <div className="space-y-4">
        {/* 為替レート */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <RefreshCw size={15} />
            為替レート設定
          </h2>
          <SettingsForm
            defaultUsdJpy={String(usdJpy)}
            updatedAt={updatedAt}
            saveSettings={saveSettings}
          />
        </div>

        {/* データ管理 */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <Upload size={15} />
            CSVインポート
          </h2>
          <CsvImport />
        </div>

        {/* アカウント情報 */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">アカウント</h2>
          <p className="text-sm text-zinc-400">{user!.email}</p>
        </div>

        {/* セキュリティポリシー */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">セキュリティポリシー</h2>
          <ul className="space-y-1.5 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              銀行のログインID/パスワードは一切保持しません
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              証券口座の認証情報は保存せず、銘柄コードと数量のみ管理します
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              全データは Supabase の RLS (Row Level Security) でユーザーごとに分離されます
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
