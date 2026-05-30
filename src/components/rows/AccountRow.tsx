import { fmt } from '../../lib/format'
import type { Account } from '../../types/db'

type AccountRowProps = Pick<Account, 'code' | 'name' | 'type' | 'balance' | 'currency' | 'alias'> & {
  onClick?: () => void
}

export function AccountRow({ code, name, type, balance, currency = 'ARS', alias, onClick }: AccountRowProps) {
  const { intStr, centStr, neg } = fmt(balance)
  return (
    <div
      className="row"
      style={{ gridTemplateColumns: 'auto 1fr auto', cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
    >
      <div style={{
        width: 36, height: 36, border: `1px solid ${onClick ? 'var(--line-2)' : 'var(--line-2)'}`, background: '#080808',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.04em', color: 'var(--ink-2)',
      }}>{code}</div>
      <div>
        <div className="name">{name}</div>
        <div className="sub">{type} · {currency}{alias ? <span style={{ color: 'var(--ink-4)' }}> · {alias}</span> : null}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className={`val ${neg ? 'amb' : ''}`}>
          {neg ? '−' : ''}{intStr}<span style={{ color: 'var(--ink-4)' }}>.{centStr}</span>
        </div>
        <div className="sub" style={{ color: 'var(--ink-4)' }}>{currency}</div>
      </div>
    </div>
  )
}
