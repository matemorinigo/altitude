import { differenceInDays } from 'date-fns'
import { getNthBusinessDay } from './holidays'
import { supabase } from './supabase'
import { isoDate } from './time'
import type { Profile, RecurringTemplate } from '../types/db'

const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function nextPaydayDate(profile: Profile, today: Date = new Date()): Date {
  const todayStart = startOfDay(today)

  if (profile.payday_kind === 'NTH_BUSINESS_DAY') {
    const n = profile.payday_nth_business_day ?? 1
    try {
      const candidate = getNthBusinessDay(today.getFullYear(), today.getMonth(), n)
      if (candidate >= todayStart) return candidate
    } catch (_) { /* nth > business days in month, fall through */ }
    const nm = today.getMonth() === 11 ? 0 : today.getMonth() + 1
    const ny = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear()
    return getNthBusinessDay(ny, nm, n)
  }

  // DAY_OF_MONTH
  const day       = profile.payday_day_of_month ?? 1
  const candidate = new Date(today.getFullYear(), today.getMonth(), day)
  if (candidate >= todayStart) return candidate
  const nm = today.getMonth() === 11 ? 0 : today.getMonth() + 1
  const ny = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear()
  return new Date(ny, nm, day)
}

export function cycleProgress(lastPayday: Date, nextPayday: Date, today: Date) {
  const daysTotal = Math.max(1, differenceInDays(nextPayday, lastPayday))
  const daysIn    = Math.max(0, differenceInDays(startOfDay(today), lastPayday))
  const daysLeft  = Math.max(0, daysTotal - daysIn)
  const paydayLabel = `PAY ${String(nextPayday.getDate()).padStart(2, '0')}/${MONTHS[nextPayday.getMonth()]}`
  return { daysTotal, daysIn, daysLeft, paydayLabel }
}

// Genera scheduled_events para el mes actual de templates que aún no lo tienen.
// Idempotente: el upsert con ignoreDuplicates previene duplicados.
export async function ensureScheduledEvents(today: Date): Promise<void> {
  const firstOfMonth = isoDate(new Date(today.getFullYear(), today.getMonth(), 1))

  const { data: templates, error } = await supabase
    .from('recurring_templates')
    .select('*')
    .eq('is_active', true)
  if (error || !templates?.length) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  for (const t of templates as RecurringTemplate[]) {
    if (t.last_generated_for && t.last_generated_for >= firstOfMonth) continue

    let dueDate: string
    try {
      const d = t.schedule_kind === 'NTH_BUSINESS_DAY'
        ? getNthBusinessDay(today.getFullYear(), today.getMonth(), t.nth_business_day ?? 1)
        : new Date(today.getFullYear(), today.getMonth(), t.day_of_month ?? 1)
      dueDate = isoDate(d)
    } catch {
      continue
    }

    await supabase.from('scheduled_events').upsert(
      { user_id: user.id, template_id: t.id, due_date: dueDate, status: 'PENDING' },
      { onConflict: 'template_id,due_date', ignoreDuplicates: true },
    )

    await supabase.from('recurring_templates')
      .update({ last_generated_for: firstOfMonth })
      .eq('id', t.id)
  }
}
