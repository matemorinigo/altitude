import { useState } from 'react'
import { useRectifyAccount } from '../../hooks/useTransactions'
import { useToast } from '../../context/ToastContext'
import { fmt } from '../../lib/format'
import type { Account, CreditCard } from '../../types/db'

type Props = {
  onClose: () => void
} & (
  | { target: 'account'; account: Account }
  | { target: 'card'; card: CreditCard }
)

type DebtTarget = 'current' | 'statement'
type Currency = 'ARS' | 'USD'

export function RectifyModal(props: Props) {
  const { onClose } = props
  const isCard = props.target === 'card'

  const [realStr, setRealStr] = useState('0')
  const [desc, setDesc]       = useState('')
  const [err, setErr]         = useState('')
  const [currency, setCurrency]     = useState<Currency>('ARS')
  const [debtTarget, setDebtTarget] = useState<DebtTarget>('current')

  const rectify = useRectifyAccount()
  const toast   = useToast()

  const getSystemValue = (): number => {
    if (props.target === 'account') return props.account.balance ?? 0
    const card = props.card
    if (debtTarget === 'current') {
      return currency === 'USD' ? (card.current_debt_usd ?? 0) : (card.current_debt_ars ?? 0)
    }
    return currency === 'USD' ? (card.statement_debt_usd ?? 0) : (card.statement_debt_ars ?? 0)
  }

  const systemValue  = getSystemValue()
  const realBalance  = parseFloat(realStr) || 0
  const delta        = realBalance - systemValue
  const deltaAbs     = Math.abs(delta)
  const deltaColor   = delta > 0 ? 'var(--red)' : delta < 0 ? 'var(--grn)' : 'var(--ink-4)'

  const headerCode   = isCard ? props.card.code : props.account.code
  const headerCurr   = isCard ? currency : (props.account.currency ?? 'ARS')
  const currSymbol   = headerCurr === 'USD' ? 'U$S' : '$'
  const systemLabel  = isCard ? 'DEUDA SISTEMA' : 'SALDO SISTEMA'
  const realLabel    = isCard ? 'DEUDA REAL' : 'SALDO REAL'

  // For accounts: positive delta = green (more money), negative = red
  // For cards: positive delta = red (more debt), negative = green (less debt)
  const accountDeltaColor = delta > 0 ? 'var(--grn)' : delta < 0 ? 'var(--red)' : 'var(--ink-4)'
  const finalDeltaColor = isCard ? deltaColor : accountDeltaColor
  const finalDeltaSign = delta >= 0 ? '+' : '−'

  const tap = (k: string) => {
    if (k === 'DEL') { setRealStr(s => s.length <= 1 ? '0' : s.slice(0, -1)); return }
    if (k === '.' && realStr.includes('.')) return
    if (realStr === '0' && k !== '.') { setRealStr(k); return }
    if (realStr.length >= 11) return
    setRealStr(s => s + k)
  }

  const handleCommit = async () => {
    if (delta === 0) { setErr('SIN DIFERENCIA'); return }
    setErr('')
    try {
      await rectify.mutateAsync({
        account_id:     isCard ? null : props.account.id,
        credit_card_id: isCard ? props.card.id : null,
        amount:         delta,
        currency:       headerCurr,
        debt_target:    isCard ? debtTarget : undefined,
        description:    desc.trim() || undefined,
      })
      toast(`RECTIF · ${headerCode} · ${finalDeltaSign}${fmt(deltaAbs).intStr} APLICADO`, finalDeltaColor)
      onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'ERROR')
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(0,0,0,0.94)',
      backdropFilter: 'blur(4px)',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid var(--amb)', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
        color: 'var(--amb)', background: 'rgba(255,176,0,0.04)', flexShrink: 0,
      }}>
        <span>◆ RECTIFICAR · {headerCode}</span>
        <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--ink-3)' }}>ESC ✕</span>
      </div>

      {/* Top: selectors + system value + description */}
      <div className="scroll" style={{ padding: '0 14px', flex: 1 }}>
        {/* Card-only: currency + debt target selectors */}
        {isCard && (
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            {/* Currency toggle */}
            <div style={{ display: 'flex', flex: 1 }}>
              {(['ARS', 'USD'] as Currency[]).map(c => (
                <div
                  key={c}
                  onClick={() => { setCurrency(c); setRealStr('0') }}
                  style={{
                    flex: 1, padding: '8px 0', textAlign: 'center',
                    fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.16em',
                    cursor: 'pointer', userSelect: 'none',
                    border: '1px solid',
                    borderColor: currency === c ? 'var(--amb)' : 'var(--line-2)',
                    color: currency === c ? 'var(--amb)' : 'var(--ink-4)',
                    background: currency === c ? 'rgba(255,176,0,0.06)' : 'transparent',
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
            {/* Debt target toggle */}
            <div style={{ display: 'flex', flex: 1 }}>
              {([
                { key: 'current' as DebtTarget, label: 'CORRIENTE' },
                { key: 'statement' as DebtTarget, label: 'RESUMEN' },
              ]).map(({ key, label }) => (
                <div
                  key={key}
                  onClick={() => { setDebtTarget(key); setRealStr('0') }}
                  style={{
                    flex: 1, padding: '8px 0', textAlign: 'center',
                    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
                    cursor: 'pointer', userSelect: 'none',
                    border: '1px solid',
                    borderColor: debtTarget === key ? 'var(--amb)' : 'var(--line-2)',
                    color: debtTarget === key ? 'var(--amb)' : 'var(--ink-4)',
                    background: debtTarget === key ? 'rgba(255,176,0,0.06)' : 'transparent',
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System value (read-only) */}
        <div style={{ marginTop: 14, fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 8 }}>
          {systemLabel}
        </div>
        <div style={{
          padding: '10px 12px', border: '1px solid var(--line-2)',
          background: 'rgba(255,255,255,0.02)',
          display: 'flex', alignItems: 'baseline', gap: 6,
          fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums',
        }}>
          <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>{currSymbol}</span>
          <span style={{ fontSize: 22, color: isCard ? (systemValue > 0 ? 'var(--amb)' : 'var(--ink-4)') : (systemValue >= 0 ? 'var(--grn)' : 'var(--red)') }}>
            {fmt(systemValue).intStr}
          </span>
          <span style={{ fontSize: 14, color: 'var(--ink-4)' }}>.{fmt(systemValue).centStr}</span>
        </div>

        {/* Delta preview */}
        {delta !== 0 && (
          <div style={{
            marginTop: 10, padding: '8px 12px', border: `1px solid ${finalDeltaColor}`,
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
            color: finalDeltaColor, display: 'flex', justifyContent: 'space-between',
          }}>
            <span>ΔDIF</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {finalDeltaSign}{fmt(deltaAbs).intStr}.{fmt(deltaAbs).centStr}
            </span>
          </div>
        )}

        {/* Description */}
        <div style={{ marginTop: 14, fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 8 }}>
          NOTA <span style={{ color: 'var(--ink-4)', opacity: 0.5 }}>· OPCIONAL</span>
        </div>
        <input
          type="text"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="ej: ajuste banco, error de carga..."
          maxLength={80}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#050505', border: '1px solid var(--line-2)',
            color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12,
            letterSpacing: '0.04em', padding: '10px 12px', outline: 'none',
          }}
        />

        <div style={{ height: 14 }} />
      </div>

      {/* Fixed bottom: real value input + keypad + confirm */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--line-2)' }}>
        {/* Real value display */}
        <div style={{
          padding: '12px 14px 10px', background: '#050505',
          borderBottom: '1px solid var(--line)',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 6 }}>
            {realLabel} · {headerCurr}
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 40, letterSpacing: '-0.03em',
            color: 'var(--amb)', fontVariantNumeric: 'tabular-nums',
            display: 'flex', alignItems: 'baseline', gap: 6,
          }}>
            <span style={{ color: 'var(--ink-4)', fontSize: 20 }}>{currSymbol}</span>
            <span>{realStr}</span>
            <span className="blink" style={{ color: 'var(--amb)', fontSize: 30 }}>▮</span>
          </div>
          {err && (
            <div style={{
              marginTop: 6, padding: '6px 10px',
              border: '1px solid var(--red)', color: 'var(--red)',
              fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.14em',
            }}>
              ✕ {err}
            </div>
          )}
        </div>

        {/* Keypad */}
        <div className="keypad">
          {['1','2','3','4','5','6','7','8','9','.','0','DEL'].map(k => (
            <div key={k} className={`key ${k === 'DEL' ? 'act' : ''}`} onClick={() => tap(k)}>
              {k === 'DEL' ? '⌫' : k}
            </div>
          ))}
        </div>

        {/* Confirm */}
        <div style={{ padding: '10px 14px 10px' }}>
          <button
            className="btn-trigger"
            onClick={handleCommit}
            disabled={rectify.isPending || delta === 0}
            style={{
              padding: '16px 18px',
              opacity: rectify.isPending || delta === 0 ? 0.5 : 1,
              borderColor: 'var(--amb)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{
                width: 24, height: 24, border: '1px solid var(--amb)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontSize: 12,
              }}>◆</span>
              <span style={{ fontSize: 13, letterSpacing: '0.24em', color: 'var(--amb)' }}>
                {rectify.isPending ? 'APLICANDO...' : 'CONFIRMAR · RECTIF'}
              </span>
            </span>
            <span className="num" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--ink-3)' }}>F1</span>
          </button>
        </div>
      </div>
    </div>
  )
}
