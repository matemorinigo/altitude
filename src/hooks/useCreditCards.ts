import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { isoDate } from '../lib/time'
import type { CreditCard, Transaction } from '../types/db'

type TxWithRels = Transaction & {
  accounts?: { code: string } | null
  credit_cards?: { code: string } | null
}

export function useCreditCardTransactions(cardId: string | null) {
  return useQuery({
    queryKey: ['transactions', 'card', cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, accounts(code), credit_cards(code)')
        .eq('credit_card_id', cardId!)
        .order('occurred_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as TxWithRels[]
    },
    enabled: !!cardId,
  })
}

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
    mutationFn: async (payload: Pick<CreditCard, 'code' | 'name' | 'close_day' | 'due_day'>) => {
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

export function useUpdateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, close_day, due_day }: { id: string; close_day: number; due_day: number }) => {
      const { error } = await supabase
        .from('credit_cards')
        .update({ close_day, due_day })
        .eq('id', id)
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
          statement_debt_ars: card.statement_debt_ars + card.current_debt_ars,
          current_debt_ars:   0,
          statement_debt_usd: card.statement_debt_usd + card.current_debt_usd,
          current_debt_usd:   0,
          last_closed_at:     isoDate(new Date()),
        })
        .eq('id', card.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
