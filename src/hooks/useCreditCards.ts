import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { isoDate } from '../lib/time'
import type { CreditCard } from '../types/db'

const QK = ['credit_cards'] as const

export function useCreditCards() {
  return useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('is_archived', false)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as CreditCard[]
    },
  })
}

export function useAddCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Pick<CreditCard, 'code' | 'name' | 'close_day' | 'due_day' | 'currency'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('credit_cards').insert({
        ...payload,
        user_id: user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useArchiveCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('credit_cards')
        .update({ is_archived: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useCloseStatement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (card: CreditCard) => {
      const { error } = await supabase
        .from('credit_cards')
        .update({
          statement_debt: card.statement_debt + card.current_debt,
          current_debt: 0,
          last_closed_at: isoDate(new Date()),
        })
        .eq('id', card.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
