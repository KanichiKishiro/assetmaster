export const CATEGORY_LABELS: Record<string, string> = {
  japan_stock: '日本株',
  us_stock: '米国株',
  mutual_fund: '投資信託',
  bank: '銀行・現金',
}

export const CATEGORY_COLORS: Record<string, string> = {
  japan_stock: '#3b82f6',
  us_stock: '#8b5cf6',
  mutual_fund: '#f59e0b',
  bank: '#10b981',
}

export const CATEGORIES = ['japan_stock', 'us_stock', 'mutual_fund', 'bank'] as const
