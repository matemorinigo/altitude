import { fmt } from '../../lib/format'
import type { CreditCard } from '../../types/db'

type CardRowProps = Pick<CreditCard, 'code' | 'name' | 'close_day' | 'due_day' | 'currency' | 'current_debt' | 'statement_debt'>

export function CardRow({ code, name, close_day, due_day, currency, current_debt, statement_debt }: CardRowProps) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const { intStr: stmtI, centStr: stmtC } = fmt(statement_debt)
  const { intStr: currI, centStr: currC } = fmt(current_debt)

  return (
    <div className="row" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
      <div style={{
        width: 36, height: 36, border: '1px solid var(--amb-dim)', background: '#0a0500',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.04em', color: 'var(--amb)',
      }}>{code}</div>
      <div>
        <div className="name">{name}</div>
        <div className="sub">CLOSE {pad(close_day)} · DUE {pad(due_day)}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {statement_debt > 0 && (
          <div className="val amb">
            RESUMEN −{stmtI}<span style={{ color: 'var(--ink-4)' }}>.{stmtC}</span>
          </div>
        )}
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, fontVariantNumeric: 'tabular-nums',
          color: current_debt > 0 ? 'var(--ink-2)' : 'var(--ink-4)',
        }}>
          CORRIENTE −{currI}<span style={{ color: 'var(--ink-4)' }}>.{currC}</span>
        </div>
        <div className="sub" style={{ color: 'var(--ink-4)' }}>{currency}</div>
      </div>
    </div>
  )
}
