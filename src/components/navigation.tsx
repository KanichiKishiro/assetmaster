'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Briefcase, BarChart3, Settings, TrendingUp, LogOut, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/actions/auth'

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/assets', label: '資産管理', icon: Briefcase },
  { href: '/dividends', label: '配当管理', icon: Coins },
  { href: '/analysis', label: '詳細分析', icon: BarChart3 },
  { href: '/settings', label: '設定', icon: Settings },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
        <TrendingUp className="text-emerald-500" size={22} />
        <span className="text-base font-bold text-white tracking-tight">AssetMaster JP</span>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-zinc-800">
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-colors"
          >
            <LogOut size={18} />
            ログアウト
          </button>
        </form>
      </div>
    </aside>
  )
}
