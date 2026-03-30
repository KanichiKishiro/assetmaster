import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { Navigation } from '@/components/navigation'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AssetMaster JP',
  description: '個人向け資産管理アプリ',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} dark`}>
      <body className="min-h-screen flex bg-zinc-950 text-zinc-100">
        <Navigation />
        <div className="flex-1 flex flex-col overflow-auto">
          <main className="flex-1">{children}</main>
          <footer className="shrink-0 border-t border-zinc-800 px-6 py-4 flex items-center gap-4 text-xs text-zinc-500">
            <span>© {new Date().getFullYear()} AssetMaster JP</span>
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">利用規約</Link>
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">プライバシーポリシー</Link>
          </footer>
        </div>
      </body>
    </html>
  )
}
