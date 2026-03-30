import { NextRequest, NextResponse } from 'next/server'
import { fetchStockPrices } from '@/lib/stock-prices'

/**
 * GET /api/stocks?japan=7203,6758&us=AAPL,MSFT
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const japanParam = searchParams.get('japan') ?? ''
  const usParam = searchParams.get('us') ?? ''

  const japanTickers = japanParam ? japanParam.split(',').filter(Boolean) : []
  const usTickers = usParam ? usParam.split(',').filter(Boolean) : []

  const prices = await fetchStockPrices(japanTickers, usTickers)

  return NextResponse.json(prices, {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
  })
}
