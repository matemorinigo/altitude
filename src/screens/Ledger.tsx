import { useState } from 'react'
import { SectionLabel } from '../components/shell/SectionLabel'
import { TxRow } from '../components/rows/TxRow'
import { TelemetryBar } from '../components/primitives/TelemetryBar'
import { useAllTransactions, type LedgerFilters } from '../hooks/useTransactions'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { useCategories } from '../hooks/useCategories'
import { fmt } from '../lib/format'
import { isSpendTx, isIncomeTx } from '../lib/transactions'

type KindFilter = 'ALL' | 'EXPENSE' | 'INCOME' | 'CARD_PAYMENT' | 'RECTIFICATION'
type CurrencyFilter = 'ARS' | 'USD'

const KIND_LABELS: Record<KindFilter, string> = {
  ALL:            'ALL',
  EXPENSE:        'EXPENSE',
  INCOME:         'INCOME',
  CARD_PAYMENT:   'CARD PMT',
  RECTIFICATION:  'RECTIF',
}

export function Ledger() {
  const [kindFilter, setKindFilter]         = useState<KindFilter>('ALL')
  const [catFilter,  setCatFilter]          = useState<string>('ALL')
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('ARS')
  const isDesktop                           = useIsDesktop()
  const { data: allCategories = [] }        = useCategories()

  const filters: LedgerFilters = {
    kind:                  kindFilter === 'ALL' ? 'ALL' : kindFilter,
    category:              catFilter,
    currency:              currencyFilter,
    includeRectifications: kindFilter === 'RECTIFICATION',
  }

  const { data: txs = [], isLoading, isError, refetch } = useAllTransactions(filters)

  const totalExpense = txs
    .filter(isSpendTx)
    .reduce((s, t) => s + t.amount, 0)

  const totalIncome = txs
    .filter(isIncomeTx)
    .reduce((s, t) => s + t.amount, 0)

  const net = totalIncome - totalExpense

  const currencyChips = (
    <div style={{ display: 'flex', gap: 0, border: '1px solid var(--line-2)' }}>
      {(['ARS', 'USD'] as CurrencyFilter[]).map((c, i) => (
        <div
          key={c}
          className={`chip ${currencyFilter === c ? 'on' : ''}`}
          onClick={() => setCurrencyFilter(c)}
          style={{
            borderWidth: 0,
            borderRight: i === 0 ? '1px solid var(--line-2)' : 0,
            flex: 1, justifyContent: 'center',
          }}
        >
          {c}
        </div>
      ))}
    </div>
  )

  const filterPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="panel" style={{ padding: '12px 14px' }}>
        <span className="brackets"><i /></span>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 8 }}>MONEDA</div>
        {currencyChips}
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--ink-4)', margin: '14px 0 8px' }}>DIRECTION</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(KIND_LABELS) as KindFilter[]).map(k => (
            <div key={k} className={`chip ${kindFilter === k ? 'on' : ''}`} onClick={() => setKindFilter(k)}>
              {KIND_LABELS[k]}
            </div>
          ))}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--ink-4)', margin: '14px 0 8px' }}>CATEGORY</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <div className={`chip ${catFilter === 'ALL' ? 'on' : ''}`} onClick={() => setCatFilter('ALL')}>ALL</div>
          {allCategories.filter(c => !c.is_system).map(c => (
            <div key={c.code} className={`chip ${catFilter === c.code ? 'on' : ''}`} onClick={() => setCatFilter(c.code)}>
              {c.label}
            </div>
          ))}
        </div>
      </div>

      {txs.length > 0 && (
        <div className="panel" style={{ padding: '12px 14px' }}>
          <span className="brackets"><i /></span>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 10 }}>
            ◆ STATS · {currencyFilter}
          </div>
          {[
            { l: 'TOTAL IN',  v: `+${fmt(totalIncome).intStr}`,  c: 'var(--grn)' },
            { l: 'TOTAL OUT', v: `−${fmt(totalExpense).intStr}`, c: 'var(--amb)' },
            { l: 'NET',       v: `${net >= 0 ? '+' : '−'}${fmt(Math.abs(net)).intStr}`, c: net >= 0 ? 'var(--grn)' : 'var(--red)' },
            { l: 'COUNT',     v: `${txs.length} TX`, c: 'var(--ink)' },
          ].map((s, i, arr) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 0,
              fontFamily: 'var(--mono)', fontSize: 11.5,
            }}>
              <span style={{ color: 'var(--ink-4)', letterSpacing: '0.16em' }}>{s.l}</span>
              <span style={{ color: s.c, fontVariantNumeric: 'tabular-nums' }}>{s.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const txList = (
    <>
      {isLoading && <TelemetryBar />}
      {isError && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            padding: '8px 12px', border: '1px solid var(--red)',
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--red)',
          }}
          onClick={() => refetch()}
        >
          ✕ FETCH ERROR · RETRY ›
        </div>
      )}
      {!isLoading && !isError && txs.length === 0 && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          NO TRANSACTIONS
        </div>
      )}
      {txs.length > 0 && (
        <div className="panel tight">
          <span className="brackets"><i /></span>
          {txs.map((t, i) => (
            <TxRow
              key={t.id}
              tx={t}
              acctCode={t.accounts?.code ?? t.credit_cards?.code}
              isCard={!!t.credit_cards?.code}
              last={i === txs.length - 1}
            />
          ))}
        </div>
      )}
    </>
  )

  if (isDesktop) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, padding: 14, alignItems: 'start' }}>
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0 8px', fontFamily: 'var(--mono)', fontSize: 10,
            letterSpacing: '0.18em', color: 'var(--ink-3)', borderBottom: '1px solid var(--line)', marginBottom: 10,
          }}>
            <span>◆ LEDGER · {currencyFilter} · ENTRADAS</span>
            <span>{txs.length} ENTRIES</span>
          </div>
          {txList}
        </div>
        {filterPanel}
      </div>
    )
  }

  // Mobile layout
  return (
    <div className="scroll" style={{ padding: '0 14px 20px' }}>
      <SectionLabel right="FX">MONEDA</SectionLabel>
      {currencyChips}

      <SectionLabel right={`${txs.length} REG`}>FILTRO · TIPO</SectionLabel>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(Object.keys(KIND_LABELS) as KindFilter[]).map(k => (
          <div key={k} className={`chip ${kindFilter === k ? 'on' : ''}`} onClick={() => setKindFilter(k)}>
            {KIND_LABELS[k]}
          </div>
        ))}
      </div>

      <SectionLabel right="CAT">FILTRO · CATEGORÍA</SectionLabel>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <div className={`chip ${catFilter === 'ALL' ? 'on' : ''}`} onClick={() => setCatFilter('ALL')}>ALL</div>
        {allCategories.filter(c => !c.is_system).map(c => (
          <div key={c.code} className={`chip ${catFilter === c.code ? 'on' : ''}`} onClick={() => setCatFilter(c.code)}>
            {c.label}
          </div>
        ))}
      </div>

      {txs.length > 0 && (
        <div style={{ display: 'flex', gap: 20, marginTop: 14, fontFamily: 'var(--mono)', fontSize: 11 }}>
          <span>
            <span style={{ color: 'var(--ink-4)', fontSize: 9, letterSpacing: '0.18em', display: 'block', marginBottom: 2 }}>TOTAL IN</span>
            <span style={{ color: 'var(--grn)' }}>+{fmt(totalIncome).intStr}</span>
          </span>
          <span>
            <span style={{ color: 'var(--ink-4)', fontSize: 9, letterSpacing: '0.18em', display: 'block', marginBottom: 2 }}>TOTAL OUT</span>
            <span style={{ color: 'var(--amb)' }}>−{fmt(totalExpense).intStr}</span>
          </span>
          <span>
            <span style={{ color: 'var(--ink-4)', fontSize: 9, letterSpacing: '0.18em', display: 'block', marginBottom: 2 }}>NET · {currencyFilter}</span>
            <span style={{ color: net >= 0 ? 'var(--grn)' : 'var(--red)' }}>
              {net >= 0 ? '+' : '−'}{fmt(Math.abs(net)).intStr}
            </span>
          </span>
        </div>
      )}

      <SectionLabel right={currencyFilter}>LEDGER · REGISTRO</SectionLabel>
      {txList}
      <div style={{ height: 24 }} />
    </div>
  )
}
