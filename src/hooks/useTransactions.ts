import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Transaction, TransactionKind } from '../types/db'

const QK = ['transactions'] as const

export interface TransactionWithRefs extends Transaction {
  accounts?:     { code: string } | null
  credit_cards?: { code: string } | null
}

export interface LedgerFilters {
  kind?:     TransactionKind | 'ALL'
  category?: string
  currency?: 'ARS' | 'USD'
  includeRectifications?: boolean
}

export function useAllTransactions(filters: LedgerFilters = {}) {
  return useQuery({
    queryKey: [...QK, 'ledger', filters],
    queryFn: async () => {
      let q = supabase
        .from('transactions')
        .select('*, accounts(code), credit_cards(code)')
        .order('occurred_at', { ascending: false })
        .limit(200)

      if (filters.kind && filters.kind !== 'ALL') {
        q = q.eq('kind', filters.kind)
      } else if (!filters.includeRectifications) {
        q = q.neq('kind', 'RECTIFICATION')
      }
      if (filters.category && filters.category !== 'ALL') {
        q = q.eq('category', filters.category)
      }
      if (filters.currency) {
        q = q.eq('currency', filters.currency)
      }

      const { data, error } = await q
      if (error) throw error
      return data as TransactionWithRefs[]
    },
  })
}

export function useAccountTransactions(accountId: string | null) {
  return useQuery({
    queryKey: [...QK, 'account', accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, accounts(code), credit_cards(code)')
        .eq('account_id', accountId!)
        .order('occurred_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return data as TransactionWithRefs[]
    },
  })
}

export function useRecentTransactions(limit = 6) {
  return useQuery({
    queryKey: [...QK, 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, accounts(code), credit_cards(code)')
        .order('occurred_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as TransactionWithRefs[]
    },
  })
}

export function useCycleTransactions(since: Date | null) {
  return useQuery({
    queryKey: [...QK, 'cycle', since?.toISOString() ?? null],
    enabled: since !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('kind, amount')
        .gte('occurred_at', since!.toISOString())
        .in('kind', ['EXPENSE', 'CARD_PAYMENT'])
      if (error) throw error
      return data as { kind: string; amount: number }[]
    },
  })
}

export interface AddTransactionPayload {
  kind: TransactionKind
  amount: number
  category: string
  description?: string
  account_id?: string | null
  credit_card_id?: string | null
  currency?: string
}

export interface RectifyPayload {
  account_id?: string | null
  credit_card_id?: string | null
  amount: number           // signed delta: real − system
  currency: string
  description?: string
}

export function useRectifyAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RectifyPayload): Promise<{ id: string }> => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('transactions').insert({
        user_id:        user!.id,
        kind:           'RECTIFICATION',
        amount:         payload.amount,
        category:       'RECTIFICATION',
        description:    payload.description ?? null,
        account_id:     payload.account_id ?? null,
        credit_card_id: payload.credit_card_id ?? null,
        currency:       payload.currency,
      }).select('id').single()
      if (error) throw error
      return data as { id: string }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['credit_cards'] })
    },
  })
}

export function useAddTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AddTransactionPayload): Promise<{ id: string }> => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('transactions').insert({
        user_id: user!.id,
        kind: payload.kind,
        amount: payload.amount,
        category: payload.category,
        description: payload.description ?? null,
        account_id: payload.account_id ?? null,
        credit_card_id: payload.credit_card_id ?? null,
        currency: payload.currency ?? 'ARS',
      }).select('id').single()
      if (error) throw error
      return data as { id: string }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['credit_cards'] })
    },
  })
}
