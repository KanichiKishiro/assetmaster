'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CsvRow } from '@/lib/csv-parser'

export async function importAssets(rows: CsvRow[]): Promise<{ inserted: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  if (rows.length === 0) return { inserted: 0, error: '登録するデータがありません' }

  const records = rows.map((row) => ({
    user_id: user.id,
    ...row,
  }))

  const { error } = await supabase.from('assets').insert(records)

  if (error) {
    return { inserted: 0, error: error.message }
  }

  revalidatePath('/assets')
  revalidatePath('/dashboard')
  revalidatePath('/analysis')

  return { inserted: rows.length }
}
