import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * 以下を除く全ルートに適用:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico, sitemap.xml 等
     * - /api/stocks (株価APIは認証不要)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/stocks).*)',
  ],
}
