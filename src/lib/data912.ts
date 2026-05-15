import { supabase } from './supabase'
import type { Ticker } from '../types/db'

const BASE = 'https://data912.com'

type InstrumentKind = Ticker['instrument_kind']

const PANEL_FOR: Record<InstrumentKind, string> = {
  CEDEAR:    'arg_cedears',
  STOCK_AR:  'arg_stocks',
  BOND_AR:   'arg_bonds',
  NOTE_AR:   'arg_notes',
  CORP_AR:   'arg_corp',
  STOCK_USA: 'usa_stocks',
  ADR_USA:   'usa_adrs',
}

const CURRENCY_FOR: Record<string, string> = {
  arg_cedears: 'ARS',
  arg_stocks:  'ARS',
  arg_bonds:   'ARS',
  arg_notes:   'ARS',
  arg_corp:    'ARS',
  usa_stocks:  'USD',
  usa_adrs:    'USD',
}

interface PanelRow {
  symbol: string
  c?: number      // close / last
  px_bid?: number
  px_ask?: number
  pct_change?: number
  v?: number
  [key: string]: unknown
}

const memCache = new Map<string, { data: PanelRow[]; fetchedAt: number }>()
const TTL = 60_000

async function fetchPanel(panel: string): Promise<PanelRow[]> {
  const hit = memCache.get(panel)
  if (hit && Date.now() - hit.fetchedAt < TTL) return hit.data
  const r = await fetch(`${BASE}/live/${panel}`)
  if (!r.ok) throw new Error(`data912 ${panel}: ${r.status}`)
  const data: PanelRow[] = await r.json()
  memCache.set(panel, { data, fetchedAt: Date.now() })
  return data
}

function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, t) => {
    const k = key(t)
    ;(acc[k] ??= []).push(t)
    return acc
  }, {})
}

export async function syncTickerPrices(tickers: Ticker[]): Promise<number> {
  const active = tickers.filter(t => !t.is_archived)
  if (!active.length) return 0

  const byPanel = groupBy(active, t => PANEL_FOR[t.instrument_kind])
  let updated = 0

  for (const [panel, group] of Object.entries(byPanel)) {
    const rows = await fetchPanel(panel)
    const currency = CURRENCY_FOR[panel] ?? 'ARS'
    const now = new Date().toISOString()

    for (const ticker of group) {
      const row = rows.find(r => r.symbol === ticker.symbol)
      if (!row || row.c == null) continue

      const { error } = await supabase
        .from('tickers')
        .update({
          last_price:          row.c,
          last_price_currency: currency,
          last_price_at:       now,
        })
        .eq('id', ticker.id)

      if (!error) updated++
    }
  }

  return updated
}
