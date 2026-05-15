import { fmt } from '../../lib/format'
import type { Transaction } from '../../types/db'

interface TxRowProps {
  tx: Transaction
  acctCode?: string
  isCard?: boolean
  last?: boolean
}

export function TxRow({ tx, acctCode, isCard, last }: TxRowProps) {
  const isIncome = tx.kind === 'INCOME'
  const { intStr } = fmt(tx.amount)
  const d = new Date(tx.occurred_at)
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '50px 1fr 90px',
      alignItems: 'center', padding: '8px 0',
      borderBottom: last ? 0 : '1px solid var(--line)',
      fontFamily: 'var(--mono)',
    }}>
      <span style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.04em' }}>
        {date}<br /><span style={{ color: 'var(--ink-3)' }}>{time}</span>
      </span>
      <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span style={{ fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.18em' }}>
            {tx.category}
          </span>
          {acctCode && (
            <span style={{
              fontSize: 8,
              fontFamily: 'var(--mono)',
              letterSpacing: '0.14em',
              padding: '1px 4px',
              border: `1px solid ${isCard ? 'var(--amb-dim)' : 'var(--line-3)'}`,
              color: isCard ? 'var(--amb)' : 'var(--ink-3)',
              background: isCard ? 'rgba(255,176,0,0.06)' : 'transparent',
              lineHeight: 1.4,
            }}>
              {acctCode}
            </span>
          )}
        </div>
        {tx.description ?? tx.kind}
      </span>
      <span style={{
        textAlign: 'right', fontSize: 12,
        color: isIncome ? 'var(--grn)' : 'var(--ink)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {isIncome ? '+' : '−'}{intStr}
      </span>
    </div>
  )
}
