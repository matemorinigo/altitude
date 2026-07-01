import { useState, useMemo } from 'react'
import { SectionLabel } from '../components/shell/SectionLabel'
import { TxRow } from '../components/rows/TxRow'
import { TelemetryBar } from '../components/primitives/TelemetryBar'
import { useMonthlyTransactions } from '../hooks/useAnalytics'
import { useCategories } from '../hooks/useCategories'
import { fmt } from '../lib/format'

type Currency = 'ARS' | 'USD'

const MONTH_LABELS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

export function Analytics() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [currency, setCurrency] = useState<Currency>('ARS')

  const { data: txs = [], isLoading } = useMonthlyTransactions(year, month)
  const { data: categories = [] } = useCategories()

  const filtered = useMemo(() => txs.filter(t => t.currency === currency), [txs, currency])

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Summary
  const totalExpense = useMemo(() =>
    filtered.filter(t => t.kind === 'EXPENSE' || t.kind === 'CARD_PAYMENT').reduce((s, t) => s + t.amount, 0),
    [filtered])
  const totalIncome = useMemo(() =>
    filtered.filter(t => t.kind === 'INCOME').reduce((s, t) => s + t.amount, 0),
    [filtered])
  const net = totalIncome - totalExpense

  // Category breakdown
  const catBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.filter(t => t.kind === 'EXPENSE' || t.kind === 'CARD_PAYMENT').forEach(t => {
      map[t.category] = (map[t.category] ?? 0) + t.amount
    })
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => {
        const catObj = categories.find(c => c.code === cat)
        return { cat, label: catObj?.label ?? cat, val, pct: Math.round((val / total) * 100) }
      })
  }, [filtered, categories])

  // Origin breakdown (account/card)
  const originBreakdown = useMemo(() => {
    const map: Record<string, { name: string; val: number; isCard: boolean }> = {}
    filtered.filter(t => t.kind === 'EXPENSE' || t.kind === 'CARD_PAYMENT').forEach(t => {
      if (t.credit_cards) {
        const key = `card:${t.credit_card_id}`
        if (!map[key]) map[key] = { name: t.credit_cards.code, val: 0, isCard: true }
        map[key].val += t.amount
      } else if (t.accounts) {
        const key = `acct:${t.account_id}`
        if (!map[key]) map[key] = { name: t.accounts.code, val: 0, isCard: false }
        map[key].val += t.amount
      }
    })
    const total = Object.values(map).reduce((s, e) => s + e.val, 0) || 1
    return Object.values(map)
      .sort((a, b) => b.val - a.val)
      .map(e => ({ ...e, pct: Math.round((e.val / total) * 100) }))
  }, [filtered])

  // Daily bars
  const dailyData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = Array.from({ length: daysInMonth }, () => ({ expense: 0, income: 0 }))
    filtered.forEach(t => {
      const d = new Date(t.occurred_at).getDate() - 1
      if (d < 0 || d >= daysInMonth) return
      if (t.kind === 'EXPENSE' || t.kind === 'CARD_PAYMENT') days[d].expense += t.amount
      else if (t.kind === 'INCOME') days[d].income += t.amount
    })
    const maxVal = Math.max(...days.map(d => Math.max(d.expense, d.income)), 1)
    return days.map((d, i) => ({ day: i + 1, ...d, maxVal }))
  }, [filtered, year, month])

  // Top transactions
  const topTxs = useMemo(() =>
    [...filtered]
      .filter(t => t.kind === 'EXPENSE' || t.kind === 'CARD_PAYMENT')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    [filtered])

  const currSymbol = currency === 'USD' ? 'U$S' : '$'

  return (
    <div className="scroll" style={{ padding: '0 0 20px' }}>
      {/* Month + currency selector */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            onClick={prevMonth}
            style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--grn)', cursor: 'pointer', userSelect: 'none' }}
          >◂</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '0.18em', color: 'var(--ink)', minWidth: 90, textAlign: 'center' }}>
            {MONTH_LABELS[month]} {year}
          </span>
          <span
            onClick={nextMonth}
            style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--grn)', cursor: 'pointer', userSelect: 'none' }}
          >▸</span>
        </div>
        <div style={{ display: 'flex', border: '1px solid var(--line-2)' }}>
          {(['ARS', 'USD'] as Currency[]).map((c, i) => (
            <div
              key={c}
              onClick={() => setCurrency(c)}
              style={{
                padding: '6px 14px',
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
                cursor: 'pointer', userSelect: 'none',
                background: currency === c ? 'rgba(0,255,65,0.08)' : 'transparent',
                color: currency === c ? 'var(--grn)' : 'var(--ink-4)',
                borderRight: i === 0 ? '1px solid var(--line-2)' : 0,
              }}
            >{c}</div>
          ))}
        </div>
      </div>

      {isLoading && <div style={{ padding: '14px' }}><TelemetryBar /></div>}

      {/* Summary tiles */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        border: '1px solid var(--line-2)', margin: '14px 14px 0',
      }}>
        {[
          { l: 'INGRESOS', v: totalIncome, c: 'var(--grn)', sign: '+' },
          { l: 'GASTOS',   v: totalExpense, c: 'var(--amb)', sign: '−' },
          { l: 'NETO',     v: Math.abs(net), c: net >= 0 ? 'var(--grn)' : 'var(--red)', sign: net >= 0 ? '+' : '−' },
        ].map((tile, i) => (
          <div key={i} style={{
            padding: '12px 10px', textAlign: 'center',
            borderRight: i < 2 ? '1px solid var(--line-2)' : 0,
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 6 }}>
              {tile.l}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 15, color: tile.c, fontVariantNumeric: 'tabular-nums' }}>
              {tile.sign}{currSymbol}{fmt(tile.v).intStr}
            </div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {catBreakdown.length > 0 && (
        <div style={{ padding: '14px 14px 0' }}>
          <SectionLabel right={`${catBreakdown.length}`}>GASTOS POR CATEGORÍA</SectionLabel>
          {catBreakdown.map(({ cat, label, val, pct }) => (
            <div key={cat} style={{ marginBottom: 10 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em',
                marginBottom: 4,
              }}>
                <span style={{ color: 'var(--ink-2)' }}>{label}</span>
                <span style={{ color: 'var(--amb)', fontVariantNumeric: 'tabular-nums' }}>
                  −{currSymbol}{fmt(val).intStr} <span style={{ color: 'var(--ink-4)', fontSize: 9 }}>{pct}%</span>
                </span>
              </div>
              <div style={{ height: 2, background: 'var(--line)', position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: `${pct}%`, background: 'var(--amb)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Origin breakdown */}
      {originBreakdown.length > 0 && (
        <div style={{ padding: '6px 14px 0' }}>
          <SectionLabel right={`${originBreakdown.length}`}>GASTOS POR ORIGEN</SectionLabel>
          {originBreakdown.map((entry, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em',
                marginBottom: 4,
              }}>
                <span style={{ color: entry.isCard ? 'var(--amb)' : 'var(--ink-2)' }}>
                  {entry.isCard ? '◆ ' : '● '}{entry.name}
                </span>
                <span style={{ color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
                  −{currSymbol}{fmt(entry.val).intStr} <span style={{ color: 'var(--ink-4)', fontSize: 9 }}>{entry.pct}%</span>
                </span>
              </div>
              <div style={{ height: 2, background: 'var(--line)', position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: `${entry.pct}%`, background: entry.isCard ? 'var(--amb)' : 'var(--grn)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Daily chart */}
      {dailyData.length > 0 && totalExpense > 0 && (
        <div style={{ padding: '6px 14px 0' }}>
          <SectionLabel>GASTO DIARIO</SectionLabel>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 1,
            height: 80, border: '1px solid var(--line-2)',
            padding: '8px 4px 4px',
          }}>
            {dailyData.map(d => {
              const hExp = d.maxVal > 0 ? (d.expense / d.maxVal) * 100 : 0
              return (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{
                    height: `${hExp}%`, minHeight: d.expense > 0 ? 1 : 0,
                    background: 'var(--amb)',
                    transition: 'height 0.3s ease',
                  }} />
                </div>
              )
            })}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--ink-4)', letterSpacing: '0.1em',
            marginTop: 4,
          }}>
            <span>01</span>
            <span>{dailyData.length}</span>
          </div>
        </div>
      )}

      {/* Top transactions */}
      {topTxs.length > 0 && (
        <div style={{ padding: '6px 14px 0' }}>
          <SectionLabel right="TOP">MAYORES GASTOS</SectionLabel>
          <div className="panel tight">
            <span className="brackets"><i /></span>
            {topTxs.map((t, i) => (
              <TxRow
                key={t.id}
                tx={t}
                acctCode={t.accounts?.code ?? t.credit_cards?.code}
                isCard={!!t.credit_cards?.code}
                last={i === topTxs.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div style={{
          padding: '40px 14px', textAlign: 'center',
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', letterSpacing: '0.14em',
        }}>
          NO HAY DATOS PARA {MONTH_LABELS[month]} {year} · {currency}
        </div>
      )}
    </div>
  )
}
