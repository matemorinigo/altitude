import { useState } from 'react'
import { useRectifyAccount } from '../../hooks/useTransactions'
import { useToast } from '../../context/ToastContext'
import { fmt } from '../../lib/format'
import type { Account } from '../../types/db'

interface Props {
  account: Account
  onClose: () => void
}

export function RectifyModal({ account, onClose }: Props) {
  const [realStr, setRealStr] = useState('0')
  const [desc, setDesc]       = useState('')
  const [err, setErr]         = useState('')

  const rectify = useRectifyAccount()
  const toast   = useToast()

  const systemBalance = account.balance ?? 0
  const realBalance   = parseFloat(realStr) || 0
  const delta         = realBalance - systemBalance
  const deltaAbs      = Math.abs(delta)
  const deltaColor    = delta > 0 ? 'var(--grn)' : delta < 0 ? 'var(--red)' : 'var(--ink-4)'
  const deltaSign     = delta >= 0 ? '+' : '−'

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
        account_id:  account.id,
        amount:      delta,
        currency:    account.currency,
        description: desc.trim() || undefined,
      })
      toast(`RECTIF · ${account.code} · ${deltaSign}${fmt(deltaAbs).intStr} APLICADO`, deltaColor)
      onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'ERROR')
    }
  }

  const currSymbol = account.currency === 'USD' ? 'U$S' : '$'

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
        <span>◆ RECTIFICAR · {account.code}</span>
        <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--ink-3)' }}>ESC ✕</span>
      </div>

      {/* Top: system balance + description */}
      <div className="scroll" style={{ padding: '0 14px', flex: 1 }}>
        {/* System balance (read-only) */}
        <div style={{ marginTop: 14, fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 8 }}>
          SALDO SISTEMA
        </div>
        <div style={{
          padding: '10px 12px', border: '1px solid var(--line-2)',
          background: 'rgba(255,255,255,0.02)',
          display: 'flex', alignItems: 'baseline', gap: 6,
          fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums',
        }}>
          <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>{currSymbol}</span>
          <span style={{ fontSize: 22, color: systemBalance >= 0 ? 'var(--grn)' : 'var(--red)' }}>
            {fmt(systemBalance).intStr}
          </span>
          <span style={{ fontSize: 14, color: 'var(--ink-4)' }}>.{fmt(systemBalance).centStr}</span>
        </div>

        {/* Delta preview */}
        {delta !== 0 && (
          <div style={{
            marginTop: 10, padding: '8px 12px', border: `1px solid ${deltaColor}`,
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
            color: deltaColor, display: 'flex', justifyContent: 'space-between',
          }}>
            <span>ΔDIF</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {deltaSign}{fmt(deltaAbs).intStr}.{fmt(deltaAbs).centStr}
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

      {/* Fixed bottom: real balance input + keypad + confirm */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--line-2)' }}>
        {/* Real balance display */}
        <div style={{
          padding: '12px 14px 10px', background: '#050505',
          borderBottom: '1px solid var(--line)',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 6 }}>
            SALDO REAL · {account.currency}
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
