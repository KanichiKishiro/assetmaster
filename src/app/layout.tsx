import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
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
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  )
}
