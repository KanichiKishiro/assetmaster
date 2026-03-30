/**
 * 株価・投資信託基準価額を取得する
 * 株式: Yahoo Finance API (15分キャッシュ)
 * 投資信託: itf.minkabu.jp スクレイピング (15分キャッシュ)
 */

export type PriceMap = Record<string, number | null>

/**
 * @param japanTickers  日本株ティッカー（例: ["7203", "6758"]）
 * @param usTickers     米国株ティッカー（例: ["AAPL", "MSFT"]）
 * @param fundCodes     投資信託ファンドコード（例: ["03311187"]）
 */
export async function fetchStockPrices(
  japanTickers: string[],
  usTickers: string[],
  fundCodes: string[] = []
): Promise<PriceMap> {
  const priceMap: PriceMap = {}

  // 株式: Yahoo Finance
  const symbols: { key: string; yahoo: string }[] = [
    ...japanTickers.map((t) => ({ key: t, yahoo: `${t}.T` })),
    ...usTickers.map((t) => ({ key: t, yahoo: t })),
  ]

  if (symbols.length > 0) {
    const results = await Promise.allSettled(
      symbols.map(({ key, yahoo }) => fetchSinglePrice(key, yahoo))
    )
    results.forEach((result, i) => {
      priceMap[symbols[i].key] = result.status === 'fulfilled' ? result.value : null
    })
  }

  // 投資信託: minkabu
  if (fundCodes.length > 0) {
    const fundResults = await Promise.allSettled(
      fundCodes.map((c) => fetchFundNav(c))
    )
    fundResults.forEach((result, i) => {
      priceMap[fundCodes[i]] = result.status === 'fulfilled' ? result.value : null
    })
  }

  return priceMap
}

async function fetchSinglePrice(_key: string, yahooSymbol: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`

  const res = await fetch(url, {
    next: { revalidate: 900 }, // 15分キャッシュ
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })

  if (!res.ok) return null

  const data = await res.json()
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice

  return typeof price === 'number' ? price : null
}

async function fetchFundNav(fundCode: string): Promise<number | null> {
  const res = await fetch(
    `https://itf.minkabu.jp/fund/${encodeURIComponent(fundCode)}`,
    {
      next: { revalidate: 900 }, // 15分キャッシュ
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }
  )

  if (!res.ok) return null

  const html = await res.text()
  const descMatch = html.match(/<meta name="description" content="([\s\S]*?)"/)
  const navMatch = descMatch ? descMatch[1].match(/基準価額([0-9.]+)円/) : null

  return navMatch ? parseFloat(navMatch[1]) : null
}
