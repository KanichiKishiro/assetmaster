'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const usdJpy = parseFloat(formData.get('usd_jpy') as string)
  if (isNaN(usdJpy) || usdJpy <= 0) return

  await supabase
    .from('user_settings')
    .upsert(
      { user_id: user.id, usd_jpy: usdJpy },
      { onConflict: 'user_id' }
    )

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/analysis')
  revalidatePath('/assets')
}
