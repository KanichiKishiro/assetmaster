'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return { supabase, user }
}

export async function addAsset(formData: FormData) {
  const { supabase, user } = await getAuthUser()

  const category = formData.get('category') as string
  const name = formData.get('name') as string

  const data: Record<string, unknown> = {
    user_id: user.id,
    category,
    name,
  }

  if (category === 'japan_stock' || category === 'us_stock') {
    data.ticker        = formData.get('ticker') as string
    data.shares        = parseFloat(formData.get('shares') as string)
    data.purchase_price = parseFloat(formData.get('purchase_price') as string)
    data.broker        = formData.get('broker') as string || null
    data.account_type  = formData.get('account_type') as string || null
    const dpm = Array.from({ length: 12 }, (_, i) => {
      const v = formData.get(`dividend_m${i + 1}`) as string
      return v ? parseFloat(v) : 0
    })
    data.dividend_per_month = dpm.some((v) => v > 0) ? dpm : null
    const months = formData.get('settlement_months') as string
    data.settlement_months = months ? months.split(',').map((m) => parseInt(m.trim())).filter((m) => !isNaN(m)) : null
    if (category === 'japan_stock') {
      data.benefit_description = formData.get('benefit_description') as string || null
      const bv = formData.get('benefit_value') as string
      data.benefit_value = bv ? parseInt(bv) : null
    }
  } else if (category === 'mutual_fund') {
    const fc = (formData.get('fund_code') as string)?.trim()
    data.fund_code       = fc || null
    data.units           = parseFloat(formData.get('units') as string)
    data.nav_at_purchase = parseFloat(formData.get('nav_at_purchase') as string)
    const cn = formData.get('current_nav') as string
    data.current_nav     = cn ? parseFloat(cn) : null
    data.broker          = formData.get('broker') as string || null
    data.account_type    = formData.get('account_type') as string || null
  } else if (category === 'bank') {
    data.balance = parseFloat(formData.get('balance') as string)
  }

  const { error } = await supabase.from('assets').insert(data)
  if (error) throw new Error(error.message)

  revalidatePath('/assets')
  revalidatePath('/dashboard')
  revalidatePath('/analysis')
}

export async function updateAssetField(id: string, field: string, value: number) {
  const { supabase, user } = await getAuthUser()

  // 銀行残高の場合は変更ログを記録
  if (field === 'balance') {
    const { data: current } = await supabase
      .from('assets')
      .select('balance')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (current) {
      await supabase.from('balance_logs').insert({
        asset_id:         id,
        user_id:          user.id,
        previous_balance: current.balance,
        new_balance:      value,
        diff:             value - (current.balance ?? 0),
      })
    }
  }

  await supabase
    .from('assets')
    .update({ [field]: value })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/assets')
  revalidatePath('/dashboard')
  revalidatePath('/analysis')
}

export async function updateAsset(id: string, updates: Record<string, unknown>) {
  const { supabase, user } = await getAuthUser()

  await supabase
    .from('assets')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/assets')
  revalidatePath('/dashboard')
  revalidatePath('/analysis')
  revalidatePath('/dividends')
}

export async function updateAssetFromForm(id: string, formData: FormData) {
  const { supabase, user } = await getAuthUser()

  const category = formData.get('category') as string
  const updates: Record<string, unknown> = {
    name: formData.get('name') as string,
  }

  if (category === 'japan_stock' || category === 'us_stock') {
    updates.ticker        = formData.get('ticker') as string || null
    updates.shares        = parseFloat(formData.get('shares') as string)
    updates.purchase_price = parseFloat(formData.get('purchase_price') as string)

    updates.broker       = formData.get('broker') as string || null
    updates.account_type = formData.get('account_type') as string || null
    // 月別配当（1株あたり円） — 12ヶ月分
    const dpm = Array.from({ length: 12 }, (_, i) => {
      const v = formData.get(`dividend_m${i + 1}`) as string
      return v ? parseFloat(v) : 0
    })
    updates.dividend_per_month = dpm.some((v) => v > 0) ? dpm : null

    if (category === 'japan_stock' || category === 'us_stock') {
      const sm = formData.get('settlement_months') as string
      updates.settlement_months = sm ? sm.split(',').map((m) => parseInt(m.trim())).filter((m) => !isNaN(m)) : null
    }
    if (category === 'japan_stock') {
      updates.benefit_description = formData.get('benefit_description') as string || null
      const bv = formData.get('benefit_value') as string
      updates.benefit_value       = bv ? parseInt(bv) : null
    }
  } else if (category === 'mutual_fund') {
    const fc = (formData.get('fund_code') as string)?.trim()
    updates.fund_code       = fc || null
    updates.units           = parseFloat(formData.get('units') as string)
    updates.nav_at_purchase = parseFloat(formData.get('nav_at_purchase') as string)
    const cn = formData.get('current_nav') as string
    updates.current_nav     = cn ? parseFloat(cn) : null
    updates.broker          = formData.get('broker') as string || null
    updates.account_type    = formData.get('account_type') as string || null
  } else if (category === 'bank') {
    const newBalance = parseFloat(formData.get('balance') as string)
    // 残高が変わった場合はログ記録
    const { data: current } = await supabase
      .from('assets').select('balance').eq('id', id).eq('user_id', user.id).single()
    if (current && current.balance !== newBalance) {
      await supabase.from('balance_logs').insert({
        asset_id: id, user_id: user.id,
        previous_balance: current.balance,
        new_balance: newBalance,
        diff: newBalance - (current.balance ?? 0),
        transaction_type: 'adjustment',
      })
    }
    updates.balance = newBalance
  }

  const { error } = await supabase.from('assets').update(updates).eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)

  revalidatePath('/assets')
  revalidatePath('/dashboard')
  revalidatePath('/analysis')
  revalidatePath('/dividends')
}

export async function deleteAsset(id: string) {
  const { supabase, user } = await getAuthUser()

  await supabase
    .from('assets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/assets')
  revalidatePath('/dashboard')
  revalidatePath('/analysis')
}

export async function saveSnapshot(totalJpy: number) {
  const { supabase, user } = await getAuthUser()

  const today = new Date().toISOString().split('T')[0]

  await supabase
    .from('asset_snapshots')
    .upsert({
      user_id:       user.id,
      total_jpy:     totalJpy,
      snapshot_date: today,
    }, { onConflict: 'user_id,snapshot_date' })
}
