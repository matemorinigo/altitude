import { addMonths } from 'date-fns'
import { supabase } from './supabase'
import { isoDate } from './time'
import { pendingCloseDate } from './cardCycle'
import type { CreditCard, InstallmentPlan } from '../types/db'

// Cuota base redondeada a 2 decimales; la última absorbe la diferencia
// para que la suma del ledger sea exactamente el total.
export function splitInstallments(total: number, n: number) {
  const base = Math.round((total / n) * 100) / 100
  const last = Math.round((total - base * (n - 1)) * 100) / 100
  return { base, last }
}

export function installmentAmount(
  plan: Pick<InstallmentPlan, 'total_amount' | 'n_installments'>,
  k: number,
): number {
  const { base, last } = splitInstallments(plan.total_amount, plan.n_installments)
  return k === plan.n_installments ? last : base
}

// Siempre desde first_due_date, nunca iterativo: addMonths clampea fin de mes
// (31-ene + 1m = 28-feb) sin arrastrar el clamp a los meses siguientes.
export function installmentDueDate(firstDueDate: string, k: number): string {
  const [y, m, d] = firstDueDate.split('-').map(Number)
  return isoDate(addMonths(new Date(y, m - 1, d), k - 1))
}

export function installmentDescription(name: string, k: number, n: number): string {
  return `${name.toUpperCase()} · CUOTA ${k}/${n}`
}

export interface EnsureInstallmentsResult { posted: number; retained: number }

// Postea las cuotas vencidas de planes ACTIVE, estilo ensureScheduledEvents.
// Retención: si la tarjeta tiene un cierre pendiente sin confirmar, las cuotas
// con due >= ese cierre pertenecen al ciclo nuevo y se retienen hasta el cierre.
// Idempotencia: unique index (installment_plan_id, installment_number) frena
// dobles inserts; posted_count avanza monotónico (.lt) y nunca decrementa,
// así borrar una cuota posteada no la re-postea.
export async function ensureInstallments(today: Date): Promise<EnsureInstallmentsResult> {
  const result: EnsureInstallmentsResult = { posted: 0, retained: 0 }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return result

  const { data: plans, error } = await supabase
    .from('installment_plans')
    .select('*')
    .eq('status', 'ACTIVE')
  if (error || !plans?.length) return result

  const { data: cards } = await supabase.from('credit_cards').select('*')
  const cardById = new Map((cards ?? []).map((c: CreditCard) => [c.id, c]))
  const todayIso = isoDate(today)

  for (const plan of plans as InstallmentPlan[]) {
    const card = cardById.get(plan.credit_card_id)
    if (!card) continue
    const pendingClose = pendingCloseDate(card, today)

    for (let k = plan.posted_count + 1; k <= plan.n_installments; k++) {
      const due = installmentDueDate(plan.first_due_date, k)
      if (due > todayIso) break
      if (pendingClose && due >= pendingClose) { result.retained++; break }

      const { error: insErr } = await supabase.from('transactions').insert({
        user_id:             user.id,
        kind:                'EXPENSE',
        amount:              installmentAmount(plan, k),
        currency:            plan.currency,
        category:            plan.category,
        description:         installmentDescription(plan.name, k, plan.n_installments),
        account_id:          null,
        credit_card_id:      plan.credit_card_id,
        installment_plan_id: plan.id,
        installment_number:  k,
      })
      if (insErr && insErr.code !== '23505') break
      if (!insErr) result.posted++

      await supabase.from('installment_plans')
        .update({
          posted_count: k,
          ...(k === plan.n_installments ? { status: 'COMPLETED' } : {}),
        })
        .eq('id', plan.id)
        .lt('posted_count', k)
    }
  }
  return result
}
