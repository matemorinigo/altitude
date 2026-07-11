import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getToday, isoDate } from '../lib/time'
import { splitInstallments, installmentDescription } from '../lib/installments'
import type { InstallmentPlan } from '../types/db'

const QK = ['installment_plans'] as const

export interface InstallmentPlanWithCard extends InstallmentPlan {
  credit_cards?: { code: string } | null
}

export function useInstallmentPlans() {
  return useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installment_plans')
        .select('*, credit_cards(code)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as InstallmentPlanWithCard[]
    },
  })
}

export interface CreateInstallmentPlanPayload {
  credit_card_id: string
  name: string
  category: string
  total_amount: number
  currency: 'ARS' | 'USD'
  n_installments: number
}

export function useCreateInstallmentPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateInstallmentPlanPayload): Promise<{ id: string }> => {
      const { data: { user } } = await supabase.auth.getUser()
      const { base } = splitInstallments(payload.total_amount, payload.n_installments)

      const { data: plan, error } = await supabase.from('installment_plans').insert({
        user_id:            user!.id,
        credit_card_id:     payload.credit_card_id,
        name:               payload.name,
        category:           payload.category,
        total_amount:       payload.total_amount,
        currency:           payload.currency,
        n_installments:     payload.n_installments,
        installment_amount: base,
        first_due_date:     isoDate(getToday()),
        posted_count:       0,
      }).select().single()
      if (error) throw error

      // Cuota 1 se postea ya mismo, sin chequear retención: es equivalente a un
      // gasto manual de hoy. Si esto falla, ensureInstallments la levanta en el
      // próximo mount (due = hoy).
      const { error: txErr } = await supabase.from('transactions').insert({
        user_id:             user!.id,
        kind:                'EXPENSE',
        amount:              base,
        currency:            payload.currency,
        category:            payload.category,
        description:         installmentDescription(payload.name, 1, payload.n_installments),
        account_id:          null,
        credit_card_id:      payload.credit_card_id,
        installment_plan_id: plan.id,
        installment_number:  1,
      })
      if (!txErr) {
        await supabase.from('installment_plans')
          .update({ posted_count: 1 })
          .eq('id', plan.id)
          .lt('posted_count', 1)
      }

      return { id: plan.id }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['credit_cards'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useCancelInstallmentPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('installment_plans')
        .update({ status: 'CANCELED' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
