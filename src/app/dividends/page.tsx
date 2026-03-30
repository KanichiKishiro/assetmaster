import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchStockPrices } from '@/lib/stock-prices'
import { DividendClient, type MonthlyData } from './dividend-client'
import type { DbAsset } from '@/lib/types'

export default async function DividendsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { year: yearParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const currentYear = new Date().getFullYear()
  const selectedYear = yearParam ? parseInt(yearParam) : currentYear

  const [assetsRes, settingsRes, recordsRes] = await Promise.all([
    supabase.from('assets').select('*').eq('user_id', user.id),
    supabase.from('user_settings').select('usd_jpy').eq('user_id', user.id).single(),
    supabase
      .from('dividend_records')
      .select('*')
      .eq('user_id', user.id)
      .gte('payment_date', `${selectedYear}-01-01`)
      .lte('payment_date', `${selectedYear}-12-31`)
      .order('payment_date', { ascending: false }),
  ])

  const assets: DbAsset[] = assetsRes.data ?? []
  const usdJpy: number = settingsRes.data?.usd_jpy ?? 149.5
  const records = recordsRes.data ?? []

  // 株価取得（総資産計算用）
  const japanTickers = assets.filter((a) => a.category === 'japan_stock' && a.ticker).map((a) => a.ticker!)
  const usTickers = assets.filter((a) => a.category === 'us_stock' && a.ticker).map((a) => a.ticker!)
  const prices = await fetchStockPrices(japanTickers, usTickers)

  // 総資産
  let totalAssets = 0
  for (const a of assets) {
    if (a.category === 'japan_stock') totalAssets += (a.shares ?? 0) * (prices[a.ticker!] ?? 0)
    else if (a.category === 'us_stock') totalAssets += (a.shares ?? 0) * (prices[a.ticker!] ?? 0) * usdJpy
    else if (a.category === 'mutual_fund') totalAssets += ((a.units ?? 0) * (a.current_nav ?? 0)) / 10000
    else if (a.category === 'bank') totalAssets += a.balance ?? 0
  }

  // 株式・投信の取得金額合計
  let totalStockCost = 0
  for (const a of assets) {
    if (a.category === 'japan_stock') totalStockCost += (a.shares ?? 0) * (a.purchase_price ?? 0)
    else if (a.category === 'us_stock') totalStockCost += (a.shares ?? 0) * (a.purchase_price ?? 0) * usdJpy
    else if (a.category === 'mutual_fund') totalStockCost += ((a.units ?? 0) * (a.nav_at_purchase ?? 0)) / 10000
  }

  // ---- 配当合計（資産設定の月別配当 × 保有株数 をベースに計算） ----
  // 月別期待配当（資産設定から）
  const monthlyExpected: number[] = Array.from({ length: 12 }, (_, i) =>
    assets
      .filter((a) => a.category === 'japan_stock' || a.category === 'us_stock')
      .reduce((s, a) => {
        const perShare = (a.dividend_per_month ?? [])[i] ?? 0
        return s + (a.shares ?? 0) * perShare
      }, 0)
  )
  const annualDividend = Math.round(monthlyExpected.reduce((s, v) => s + v, 0))

  // 税引後配当（NISA=0%、特定・一般=20.315%）
  const TAX_RATE = 0.20315
  const afterTaxAnnualDividend = Math.round(
    assets
      .filter((a) => a.category === 'japan_stock' || a.category === 'us_stock')
      .reduce((s, a) => {
        const monthly = a.dividend_per_month ?? []
        const gross = (a.shares ?? 0) * monthly.reduce((m, v) => m + (v ?? 0), 0)
        const tax = a.account_type === 'nisa' ? 0 : TAX_RATE
        return s + gross * (1 - tax)
      }, 0)
  )

  // 優待合計（dividend_records の benefit + 資産の benefit_value）
  const annualBenefitRecords = records.filter((r) => r.dividend_type === 'benefit').reduce((s, r) => s + r.amount, 0)
  const assetBenefitTotal = assets.reduce((s, a) => s + (a.benefit_value ?? 0), 0)
  const annualBenefit = annualBenefitRecords + assetBenefitTotal
  const annualTotal   = annualDividend + annualBenefit

  // 月別優待（benefit_value を settlement_months に均等分散 + dividend_records の実績）
  const monthlyBenefit: number[] = Array(12).fill(0)
  for (const a of assets) {
    if (a.benefit_value && a.benefit_value > 0 && a.settlement_months?.length) {
      const perMonth = a.benefit_value / a.settlement_months.length
      for (const m of a.settlement_months) {
        monthlyBenefit[m - 1] += perMonth  // settlement_months は 1始まり
      }
    }
  }
  for (const r of records) {
    if (r.dividend_type === 'benefit') {
      const m = new Date(r.payment_date).getMonth()
      monthlyBenefit[m] += r.amount
    }
  }

  // 月別データ（期待配当 + 優待）
  const monthlyData: MonthlyData[] = Array.from({ length: 12 }, (_, i) => ({
    month: `${i + 1}月`,
    dividend: Math.round(monthlyExpected[i]),
    benefit: Math.round(monthlyBenefit[i]),
  }))

  // 銘柄別年間配当（円グラフ用）— 同一ティッカーは口座違いでも合算
  const dividendMap = new Map<string, { name: string; value: number }>()
  for (const a of assets) {
    if ((a.category !== 'japan_stock' && a.category !== 'us_stock') || !a.dividend_per_month?.some((v) => v > 0)) continue
    const key = a.ticker || a.name  // ティッカーがあればそれで同一銘柄判定
    const annual = Math.round((a.shares ?? 0) * (a.dividend_per_month ?? []).reduce((s, v) => s + (v ?? 0), 0))
    if (annual <= 0) continue
    const existing = dividendMap.get(key)
    if (existing) {
      existing.value += annual
    } else {
      dividendMap.set(key, { name: a.name, value: annual })
    }
  }
  const dividendByAsset = Array.from(dividendMap.values()).sort((a, b) => b.value - a.value)

  // 年の選択肢（現在年 ± 3年）
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i)

  // 銘柄オプション（株式のみ）
  const assetOptions = assets
    .filter((a) => a.category === 'japan_stock' || a.category === 'us_stock')
    .map((a) => ({ id: a.id, name: a.name }))

  return (
    <DividendClient
      records={records}
      assetOptions={assetOptions}
      monthlyData={monthlyData}
      dividendByAsset={dividendByAsset}
      annualDividend={annualDividend}
      afterTaxAnnualDividend={afterTaxAnnualDividend}
      annualBenefit={annualBenefit}
      annualTotal={annualTotal}
      totalAssets={totalAssets}
      totalStockCost={totalStockCost}
      selectedYear={selectedYear}
      years={years}
    />
  )
}
