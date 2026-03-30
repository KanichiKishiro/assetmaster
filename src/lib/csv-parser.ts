import type { AssetCategory } from './types'

export interface CsvRow {
  category: AssetCategory
  name: string
  ticker?: string
  shares?: number
  purchase_price?: number
  units?: number
  nav_at_purchase?: number
  current_nav?: number
  balance?: number
  settlement_months?: number[]
  benefit_description?: string
  benefit_value?: number
}

export interface ParseResult {
  valid: CsvRow[]
  errors: { line: number; message: string; raw: string }[]
}

// ============================================================
// フォーマット自動判定
// ============================================================
export function parseCsv(text: string): ParseResult {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.trim().length > 0)

  if (lines.length === 0) {
    return { valid: [], errors: [{ line: 0, message: 'ファイルが空です', raw: '' }] }
  }

  // 証券会社エクスポート形式の判定: 最初の非空行が「株式」「投資信託」「保有証券」を含む
  const firstLine = lines[0]
  const isBrokerFormat =
    firstLine.includes('株式') ||
    firstLine.includes('投資信託') ||
    firstLine.includes('保有証券') ||
    firstLine.includes('銘柄コード') ||
    firstLine.includes('ファンド名')

  if (isBrokerFormat) {
    return parseBrokerFormat(lines)
  }

  return parseCustomFormat(lines)
}

// ============================================================
// 証券会社エクスポート形式パーサー
// ============================================================
function parseBrokerFormat(lines: string[]): ParseResult {
  const valid: CsvRow[] = []
  const errors: { line: number; message: string; raw: string }[] = []

  let currentCategory: AssetCategory | null = null
  let columnHeaders: string[] = []
  let isInDataRows = false

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const raw = lines[i]
    const cols = splitLine(raw)
    const first = cols[0].trim()

    // --- セクション判定 ---
    // 「合計」で終わる見出し行はスキップ
    if (first.endsWith('合計') || first === '評価額合計' || first === '評価損益合計') {
      isInDataRows = false
      columnHeaders = []
      continue
    }

    // 株式セクション（特定預り・NISA・一般）
    if ((first.startsWith('株式') || first.includes('株式（')) && !first.includes('投資信託')) {
      currentCategory = 'japan_stock'
      isInDataRows = false
      columnHeaders = []
      continue
    }

    // 投資信託セクション
    if (first.startsWith('投資信託') || first.includes('投資信託（')) {
      currentCategory = 'mutual_fund'
      isInDataRows = false
      columnHeaders = []
      continue
    }

    // --- ヘッダー行判定 ---
    if (first === '銘柄コード' || first === 'ファンド名' || first === '銘柄名称') {
      columnHeaders = cols.map((c) => c.trim())
      isInDataRows = true
      continue
    }

    // --- サマリー行スキップ（数値だけの行や説明行） ---
    if (!isInDataRows || columnHeaders.length === 0 || !currentCategory) continue

    // 列数が少なすぎる行はスキップ
    if (cols.length < 3) {
      isInDataRows = false
      continue
    }

    // --- データ行パース ---
    try {
      const row = parseBrokerRow(cols, columnHeaders, currentCategory)
      valid.push(row)
    } catch (e) {
      errors.push({ line: lineNum, message: (e as Error).message, raw })
    }
  }

  return { valid, errors }
}

function parseBrokerRow(
  cols: string[],
  headers: string[],
  category: AssetCategory
): CsvRow {
  const get = (key: string): string => {
    const idx = headers.indexOf(key)
    return idx >= 0 ? (cols[idx] ?? '').trim() : ''
  }

  if (category === 'japan_stock') {
    const ticker = get('銘柄コード')
    const name = get('銘柄名称') || get('銘柄名')
    const sharesStr = get('保有株数') || get('保有数')
    const purchaseStr = get('取得単価')

    if (!name) throw new Error('銘柄名称が空です')
    if (!sharesStr) throw new Error('保有株数が空です')
    if (!purchaseStr) throw new Error('取得単価が空です')

    return {
      category: 'japan_stock',
      name: normalizeFullWidth(name),
      ticker: ticker || undefined,
      shares: parseNum(sharesStr),
      purchase_price: parseNum(purchaseStr),
    }
  }

  if (category === 'mutual_fund') {
    const name = get('ファンド名') || get('銘柄名称')
    const unitsStr = get('保有口数').replace(/口$/, '')
    const navPurchaseStr = get('取得単価')
    const currentNavStr = get('基準価額')

    if (!name) throw new Error('ファンド名が空です')
    if (!unitsStr) throw new Error('保有口数が空です')

    return {
      category: 'mutual_fund',
      name: normalizeFullWidth(name),
      units: parseNum(unitsStr),
      nav_at_purchase: navPurchaseStr ? parseNum(navPurchaseStr) : 10000,
      current_nav: currentNavStr ? parseNum(currentNavStr) : undefined,
    }
  }

  throw new Error(`未対応のカテゴリ: ${category}`)
}

// ============================================================
// 独自CSVフォーマットパーサー（category列あり）
// ============================================================
const VALID_CATEGORIES: AssetCategory[] = ['japan_stock', 'us_stock', 'mutual_fund', 'bank']

function parseCustomFormat(lines: string[]): ParseResult {
  const valid: CsvRow[] = []
  const errors: { line: number; message: string; raw: string }[] = []

  const startIndex = lines[0].toLowerCase().startsWith('category') ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const lineNum = i + 1
    const raw = lines[i]
    const cols = splitLine(raw)

    try {
      const row = parseCustomRow(cols)
      valid.push(row)
    } catch (e) {
      errors.push({ line: lineNum, message: (e as Error).message, raw })
    }
  }

  return { valid, errors }
}

function parseCustomRow(cols: string[]): CsvRow {
  const [
    category, name, ticker, shares, purchase_price,
    units, nav_at_purchase, current_nav, balance,
    settlement_months_raw, benefit_description, benefit_value_raw,
  ] = cols.map((c) => c.trim())

  if (!category) throw new Error('category が空です')
  if (!VALID_CATEGORIES.includes(category as AssetCategory)) {
    throw new Error(`category が不正: "${category}"`)
  }
  if (!name) throw new Error('name が空です')

  const row: CsvRow = { category: category as AssetCategory, name }

  if (category === 'japan_stock' || category === 'us_stock') {
    if (!shares) throw new Error('shares が空です')
    if (!purchase_price) throw new Error('purchase_price が空です')
    row.ticker = ticker || undefined
    row.shares = parseNum(shares)
    row.purchase_price = parseNum(purchase_price)
    if (settlement_months_raw) {
      row.settlement_months = settlement_months_raw
        .split(';')
        .map((m) => parseInt(m.trim()))
        .filter((m) => !isNaN(m) && m >= 1 && m <= 12)
    }
    if (benefit_description) row.benefit_description = benefit_description
    if (benefit_value_raw) row.benefit_value = parseNum(benefit_value_raw)
  } else if (category === 'mutual_fund') {
    if (!units) throw new Error('units が空です')
    if (!nav_at_purchase) throw new Error('nav_at_purchase が空です')
    row.units = parseNum(units)
    row.nav_at_purchase = parseNum(nav_at_purchase)
    row.current_nav = current_nav ? parseNum(current_nav) : row.nav_at_purchase
  } else if (category === 'bank') {
    if (!balance) throw new Error('balance が空です')
    row.balance = parseNum(balance)
  }

  return row
}

// ============================================================
// ユーティリティ
// ============================================================

/** タブ優先、次にカンマ、次に複数スペースで分割 */
function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t')
  if (line.includes(',')) return splitCsvComma(line)
  // 複数スペース（2個以上）で分割
  return line.split(/\s{2,}/).filter((_, i, arr) => i < arr.length)
}

function splitCsvComma(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result
}

function parseNum(val: string): number {
  const n = parseFloat(val.replace(/,/g, '').replace(/[^\d.-]/g, ''))
  if (isNaN(n)) throw new Error(`数値に変換できません: "${val}"`)
  return n
}

/** 全角英数字を半角に正規化 */
function normalizeFullWidth(str: string): string {
  return str.replace(/[Ａ-Ｚａ-ｚ０-９（）　]/g, (c) => {
    const code = c.charCodeAt(0)
    if (code === 0x3000) return ' '
    if (code >= 0xFF01 && code <= 0xFF5E) return String.fromCharCode(code - 0xFEE0)
    return c
  }).trim()
}

/** サンプルCSVテンプレート（独自形式） */
export const CSV_TEMPLATE = `category,name,ticker,shares,purchase_price,units,nav_at_purchase,current_nav,balance,settlement_months,benefit_description,benefit_value
japan_stock,トヨタ自動車,7203,100,2500,,,,,"3;9",QUOカード,3000
us_stock,Apple Inc.,AAPL,10,150,,,,,,,
mutual_fund,eMAXIS Slim 全世界株式,,,,500000,10000,25000,,,,
bank,楽天銀行,,,,,,,500000,,,`
