import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')?.trim()
  const market = req.nextUrl.searchParams.get('market') // 'japan' | 'us' | 'fund'
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

  // 投資信託: minkabu から取得
  if (market === 'fund') {
    try {
      const res = await fetch(
        `https://itf.minkabu.jp/fund/${encodeURIComponent(ticker)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 0 } }
      )
      if (!res.ok) return NextResponse.json({ error: 'not found' }, { status: 404 })

      const html = await res.text()

      // ファンド名: <h1> タグ
      const nameMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
      const name = nameMatch ? nameMatch[1].trim() : ''

      // 基準価額: meta description から抽出
      const descMatch = html.match(/<meta name="description" content="([\s\S]*?)"/)
      const navMatch = descMatch ? descMatch[1].match(/基準価額([0-9.]+)円/) : null
      const price = navMatch ? parseFloat(navMatch[1]) : null

      if (!name && price === null) {
        return NextResponse.json({ error: 'no data' }, { status: 404 })
      }

      return NextResponse.json({ name, price })
    } catch {
      return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
    }
  }

  // 株式: Yahoo Finance から取得
  const symbol = market === 'japan' ? `${ticker}.T` : ticker

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 0 } }
    )
    if (!res.ok) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta) return NextResponse.json({ error: 'no data' }, { status: 404 })

    return NextResponse.json({
      name: meta.longName ?? meta.shortName ?? '',
      price: meta.regularMarketPrice ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }
}
