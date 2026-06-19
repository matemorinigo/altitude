import { fmt } from '../../lib/format'
import type { CreditCard } from '../../types/db'

type CardRowProps = Pick<CreditCard, 'code' | 'name' | 'close_day' | 'due_day' | 'current_debt_ars' | 'statement_debt_ars' | 'current_debt_usd' | 'statement_debt_usd'> & {
  onClick?: () => void
}

export function CardRow({ code, name, close_day, due_day, current_debt_ars, statement_debt_ars, current_debt_usd, statement_debt_usd, onClick }: CardRowProps) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const hasUsd = (current_debt_usd ?? 0) > 0 || (statement_debt_usd ?? 0) > 0

  const DebtBlock = ({ stmtAmt, currAmt, label }: { stmtAmt: number; currAmt: number; label: string }) => (
    <div style={{ marginBottom: hasUsd ? 4 : 0 }}>
      {stmtAmt > 0 && (
        <div className="val amb">
          RESUMEN −{fmt(stmtAmt).intStr}<span style={{ color: 'var(--ink-4)' }}>.{fmt(stmtAmt).centStr}</span>
          <span style={{ fontSize: 9, color: 'var(--ink-4)', marginLeft: 4 }}>{label}</span>
        </div>
      )}
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 11, fontVariantNumeric: 'tabular-nums',
        color: currAmt > 0 ? 'var(--ink-2)' : 'var(--ink-4)',
      }}>
        CORRIENTE −{fmt(currAmt).intStr}<span style={{ color: 'var(--ink-4)' }}>.{fmt(currAmt).centStr}</span>
        <span style={{ fontSize: 9, color: 'var(--ink-4)', marginLeft: 4 }}>{label}</span>
      </div>
    </div>
  )

  return (
    <div
      className="row"
      style={{ gridTemplateColumns: 'auto 1fr auto', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
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
        <DebtBlock stmtAmt={statement_debt_ars ?? 0} currAmt={current_debt_ars ?? 0} label="ARS" />
        {hasUsd && (
          <DebtBlock stmtAmt={statement_debt_usd ?? 0} currAmt={current_debt_usd ?? 0} label="USD" />
        )}
      </div>
    </div>
  )
}
