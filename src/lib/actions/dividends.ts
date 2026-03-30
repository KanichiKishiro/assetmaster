'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function addDividendRecord(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const assetId   = formData.get('asset_id') as string || null
  const assetName = formData.get('asset_name') as string
  const paymentDate = formData.get('payment_date') as string
  const amount    = parseFloat(formData.get('amount') as string)
  const type      = formData.get('dividend_type') as string
  const note      = formData.get('note') as string || null

  if (!assetName || !paymentDate || isNaN(amount)) return

  await supabase.from('dividend_records').insert({
    user_id:       user.id,
    asset_id:      assetId,
    asset_name:    assetName,
    payment_date:  paymentDate,
    amount,
    dividend_type: type,
    note,
  })

  revalidatePath('/dividends')
}

export async function deleteDividendRecord(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  await supabase
    .from('dividend_records')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/dividends')
}
