import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { RecurringTemplate } from '../types/db'

const QK = ['recurring_templates'] as const

export function useRecurringTemplates() {
  return useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_templates')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as RecurringTemplate[]
    },
  })
}

type AddPayload = Pick<
  RecurringTemplate,
  'kind' | 'name' | 'amount' | 'prompt_for_amount' | 'schedule_kind' |
  'day_of_month' | 'nth_business_day' | 'category' | 'description' |
  'account_id' | 'credit_card_id' | 'is_payday'
>

export function useAddRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AddPayload) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('recurring_templates').insert({
        ...payload,
        user_id: user!.id,
        is_active: true,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useToggleRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('recurring_templates')
        .update({ is_active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_templates')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

// Crea o actualiza el único template is_payday=true del usuario
export function useUpsertPaydayTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      schedule_kind: RecurringTemplate['schedule_kind']
      day_of_month: number | null
      nth_business_day: number | null
      amount: number | null
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: existing } = await supabase
        .from('recurring_templates')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_payday', true)
        .limit(1)
        .single()

      const fields = {
        kind:             'INCOME' as const,
        name:             'Sueldo',
        is_payday:        true,
        is_active:        true,
        category:         'SALARY',
        schedule_kind:    payload.schedule_kind,
        day_of_month:     payload.day_of_month,
        nth_business_day: payload.nth_business_day,
        amount:           payload.amount,
        prompt_for_amount: payload.amount === null,
        account_id:       null,
        credit_card_id:   null,
        description:      null,
      }

      if (existing) {
        const { error } = await supabase
          .from('recurring_templates')
          .update({ ...fields, last_generated_for: null })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('recurring_templates')
          .insert({ ...fields, user_id: user.id })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
