import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { login } from '@/lib/actions/auth'

interface Props {
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, message: rawMessage } = await searchParams
  const message = rawMessage === 'registered' ? '登録が完了しました。ログインしてください。' : rawMessage

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <TrendingUp className="text-emerald-500" size={28} />
          <span className="text-xl font-bold text-white tracking-tight">AssetMaster JP</span>
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <h1 className="text-lg font-semibold text-white mb-1">ログイン</h1>
          <p className="text-sm text-zinc-400 mb-6">アカウントにサインインしてください</p>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-2.5 mb-4">
              <p className="text-sm text-rose-400">メールアドレスまたはパスワードが正しくありません</p>
            </div>
          )}
          {message && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5 mb-4">
              <p className="text-sm text-emerald-400">{decodeURIComponent(message)}</p>
            </div>
          )}

          <form action={login} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">メールアドレス</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-600"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">パスワード</label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-600"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-lg py-2.5 transition-colors"
            >
              ログイン
            </button>
          </form>

          <p className="text-center text-sm text-zinc-500 mt-4">
            アカウントをお持ちでない方は{' '}
            <Link href="/auth/register" className="text-emerald-400 hover:text-emerald-300">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
