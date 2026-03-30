'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type TransactionType = 'deposit' | 'withdrawal' | 'deduction'

export async function recordTransaction(
  assetId: string,
  type: TransactionType,
  amount: number,
  memo: string,
  date: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: asset, error: fetchError } = await supabase
    .from('assets')
    .select('balance, name')
    .eq('id', assetId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !asset) throw new Error('口座が見つかりません')

  const prev = asset.balance ?? 0
  const delta = type === 'deposit' ? amount : -amount
  const newBalance = prev + delta

  const { error: updateError } = await supabase
    .from('assets')
    .update({ balance: newBalance })
    .eq('id', assetId)
    .eq('user_id', user.id)
  if (updateError) throw new Error(`残高更新エラー: ${updateError.message}`)

  // schema_v2 カラム（transaction_type, memo, transaction_date）が存在する前提で挿入
  // 存在しない場合は基本カラムのみでフォールバック
  const { error: logError } = await supabase.from('balance_logs').insert({
    asset_id:         assetId,
    user_id:          user.id,
    previous_balance: prev,
    new_balance:      newBalance,
    diff:             delta,
    transaction_type: type,
    memo:             memo || null,
    transaction_date: date,
  })

  if (logError) {
    // フォールバック: 拡張カラムなしで記録
    const { error: fallbackError } = await supabase.from('balance_logs').insert({
      asset_id:         assetId,
      user_id:          user.id,
      previous_balance: prev,
      new_balance:      newBalance,
      diff:             delta,
      note:             memo || null,
    })
    if (fallbackError) throw new Error(`ログ記録エラー: ${fallbackError.message}`)
  }

  revalidatePath('/assets')
  revalidatePath('/dashboard')
}

export async function getTransactionHistory(assetId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // recorded_at は常に存在するカラム、transaction_date は schema_v2 以降
  const { data, error } = await supabase
    .from('balance_logs')
    .select('*')
    .eq('asset_id', assetId)
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: false })
    .limit(30)

  if (error) return []
  return data ?? []
}
