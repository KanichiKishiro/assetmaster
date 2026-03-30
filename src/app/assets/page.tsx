import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchStockPrices } from '@/lib/stock-prices'
import { AssetsClient } from './assets-client'
import type { DbAsset } from '@/lib/types'

export default async function AssetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [assetsRes, settingsRes] = await Promise.all([
    supabase.from('assets').select('*').eq('user_id', user.id).order('sort_order').order('created_at'),
    supabase.from('user_settings').select('usd_jpy').eq('user_id', user.id).single(),
  ])

  const assets: DbAsset[] = assetsRes.data ?? []
  const usdJpy: number = settingsRes.data?.usd_jpy ?? 149.5

  // 株価・基準価額取得
  const japanTickers = assets.filter((a) => a.category === 'japan_stock' && a.ticker).map((a) => a.ticker!)
  const usTickers = assets.filter((a) => a.category === 'us_stock' && a.ticker).map((a) => a.ticker!)
  const fundCodes = assets.filter((a) => a.category === 'mutual_fund' && a.fund_code).map((a) => a.fund_code!)
  const prices = await fetchStockPrices(japanTickers, usTickers, fundCodes)

  return <AssetsClient initialAssets={assets} prices={prices} usdJpy={usdJpy} />
}
