import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Transaction } from '../types/db'

export interface AnalyticsTransaction extends Transaction {
  accounts?:     { code: string; name: string } | null
  credit_cards?: { code: string; name: string } | null
}

export function useMonthlyTransactions(year: number, month: number) {
  const start = new Date(year, month, 1).toISOString()
  const end   = new Date(year, month + 1, 1).toISOString()

  return useQuery({
    queryKey: ['analytics', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, accounts(code, name), credit_cards(code, name)')
        .gte('occurred_at', start)
        .lt('occurred_at', end)
        .neq('kind', 'RECTIFICATION')
        .order('occurred_at', { ascending: false })
      if (error) throw error
      return data as AnalyticsTransaction[]
    },
  })
}
