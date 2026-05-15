import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Ticker, InstrumentKind } from '../types/db'

const QK = ['tickers'] as const

export function useTickers() {
  return useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickers')
        .select('*')
        .eq('is_archived', false)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Ticker[]
    },
  })
}

export interface AddTickerPayload {
  symbol: string
  quantity: number
  instrument_kind: InstrumentKind
  asset_class?: string
  avg_cost?: number | null
  notes?: string
}

export function useAddTicker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AddTickerPayload) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('tickers').upsert({
        user_id:         user!.id,
        symbol:          payload.symbol.toUpperCase().trim(),
        quantity:        payload.quantity,
        instrument_kind: payload.instrument_kind,
        asset_class:     payload.asset_class?.trim() || null,
        avg_cost:        payload.avg_cost ?? null,
        notes:           payload.notes?.trim() || null,
        is_archived:     false,
      }, { onConflict: 'user_id,symbol' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateTickerQty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { error } = await supabase
        .from('tickers')
        .update({ quantity })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export interface BuyTickerPayload {
  ticker: Ticker
  addQty: number
  pricePerUnit: number
  accountId: string
}

export function useBuyTicker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ticker, addQty, pricePerUnit, accountId }: BuyTickerPayload) => {
      const { data: { user } } = await supabase.auth.getUser()
      const total = addQty * pricePerUnit

      const { error: txErr } = await supabase.from('transactions').insert({
        user_id:     user!.id,
        kind:        'EXPENSE',
        amount:      total,
        category:    'INVEST',
        description: `BUY ${ticker.symbol} × ${addQty}`,
        account_id:  accountId,
        currency:    ticker.last_price_currency ?? 'ARS',
      })
      if (txErr) throw txErr

      const oldQty = ticker.quantity
      const oldAvg = ticker.avg_cost ?? 0
      const newQty = oldQty + addQty
      const newAvg = (oldQty * oldAvg + addQty * pricePerUnit) / newQty

      const { error: tkErr } = await supabase
        .from('tickers')
        .update({ quantity: newQty, avg_cost: newAvg })
        .eq('id', ticker.id)
      if (tkErr) throw tkErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export interface SellTickerPayload {
  ticker: Ticker
  sellQty: number
  pricePerUnit: number
  creditAccountId: string | null
}

export function useSellTicker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ticker, sellQty, pricePerUnit, creditAccountId }: SellTickerPayload) => {
      const { data: { user } } = await supabase.auth.getUser()

      if (creditAccountId) {
        const total = sellQty * pricePerUnit
        const { error: txErr } = await supabase.from('transactions').insert({
          user_id:     user!.id,
          kind:        'INCOME',
          amount:      total,
          category:    'INVESTMENT',
          description: `SELL ${ticker.symbol} × ${sellQty}`,
          account_id:  creditAccountId,
          currency:    ticker.last_price_currency ?? 'ARS',
        })
        if (txErr) throw txErr
      }

      const newQty = ticker.quantity - sellQty
      const update: Record<string, unknown> = { quantity: newQty }
      if (newQty <= 0) update.is_archived = true
      const { error: tkErr } = await supabase
        .from('tickers')
        .update(update)
        .eq('id', ticker.id)
      if (tkErr) throw tkErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useArchiveTicker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tickers')
        .update({ is_archived: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
