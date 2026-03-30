export type AssetCategory = 'japan_stock' | 'us_stock' | 'mutual_fund' | 'bank'

/** Supabase の assets テーブルの行 */
export interface DbAsset {
  id: string
  user_id: string
  category: AssetCategory
  name: string
  ticker?: string | null
  shares?: number | null
  purchase_price?: number | null
  units?: number | null
  nav_at_purchase?: number | null
  current_nav?: number | null
  balance?: number | null
  settlement_months?: number[] | null
  benefit_description?: string | null
  benefit_value?: number | null
  annual_dividend_per_share?: number | null
  dividend_months?: number[] | null
  dividend_per_month?: number[] | null
  fund_code?: string | null
  broker?: string | null
  account_type?: 'nisa' | 'tokutei' | 'general' | null
  sort_order?: number
  created_at?: string
  updated_at?: string
}

export interface TrendPoint {
  date: string
  total: number
}

export interface UserSettings {
  usd_jpy: number
  updated_at?: string
}
