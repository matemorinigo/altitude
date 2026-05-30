import { useState } from 'react'
import { useAddTransaction } from '../../hooks/useTransactions'
import { useToast } from '../../context/ToastContext'
import { fmt } from '../../lib/format'
import type { Account } from '../../types/db'

interface Props {
  fromAccount: Account
  accounts: Account[]
  onClose: () => void
}

export function TransferModal({ fromAccount, accounts, onClose }: Props) {
  const otherAccounts = accounts.filter(a => a.id !== fromAccount.id)
  const [toAccountId, setToAccountId] = useState<string>(otherAccounts[0]?.id ?? '')
  const [amount, setAmount]           = useState('0')
  const [exchangeRate, setExchangeRate] = useState('1')
  const [err, setErr]                 = useState('')

  const addTx = useAddTransaction()
  const toast = useToast()

  const toAccount = accounts.find(a => a.id === toAccountId)
  const isCrossRate = fromAccount.currency !== toAccount?.currency
  const rate = parseFloat(exchangeRate) || 1
  const numAmount = parseFloat(amount) || 0
  const destAmount = isCrossRate ? (
    fromAccount.currency === 'ARS' && toAccount?.currency === 'USD'
      ? numAmount / rate
      : numAmount * rate
  ) : numAmount

  const tap = (k: string) => {
    if (k === 'DEL') { setAmount(a => a.length <= 1 ? '0' : a.slice(0, -1)); return }
    if (k === '.' && amount.includes('.')) return
    if (amount === '0' && k !== '.') { setAmount(k); return }
    if (amount.length >= 9) return
    setAmount(a => a + k)
  }

  const handleCommit = async () => {
    if (!numAmount || numAmount <= 0)  { setErr('AMOUNT REQUIRED'); return }
    if (!toAccountId)                  { setErr('SELECT DESTINATION'); return }
    if (isCrossRate && (!rate || rate <= 0)) { setErr('EXCHANGE RATE REQUIRED'); return }
    setErr('')

    const desc = `TRANSFER · ${fromAccount.code} → ${toAccount?.code ?? '?'}`
    try {
      await addTx.mutateAsync({
        kind:       'EXPENSE',
        amount:     numAmount,
        category:   'TRANSFER',
        description: desc,
        account_id: fromAccount.id,
        currency:   fromAccount.currency,
      })
      await addTx.mutateAsync({
        kind:       'INCOME',
        amount:     destAmount,
        category:   'TRANSFER',
        description: desc,
        account_id: toAccountId,
        currency:   toAccount?.currency ?? fromAccount.currency,
      })
      toast(`TRANSFER · ${fromAccount.code} → ${toAccount?.code} COMMITTED`, 'var(--grn)')
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
        borderTop: '1px solid var(--grn)', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
        color: 'var(--grn)', background: 'rgba(0,255,65,0.04)', flexShrink: 0,
      }}>
        <span>⇄ TRANSFER · {fromAccount.code} <span style={{ color: 'var(--ink-4)' }}>→</span> {toAccount?.code ?? '?'}</span>
        <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--amb)' }}>ESC ✕</span>
      </div>

      {/* Scrollable top: FROM (locked) + TO selector + exchange rate */}
      <div className="scroll" style={{ padding: '0 14px', flex: 1 }}>
        {/* FROM (locked) */}
        <div style={{ marginTop: 14, fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 8 }}>
          FROM · ORIGEN
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', border: '1px solid var(--grn)',
          background: 'rgba(0,255,65,0.04)',
        }}>
          <div style={{
            width: 32, height: 32, border: '1px solid var(--grn)', background: '#001a08',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--grn)',
          }}>{fromAccount.code}</div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink)' }}>{fromAccount.name}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.14em', marginTop: 2 }}>
              {fromAccount.type} · {fromAccount.currency} · {fmt(fromAccount.balance ?? 0).intStr}
            </div>
          </div>
        </div>

        {/* TO selector */}
        <div style={{ marginTop: 14, fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 8 }}>
          TO · DESTINO
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {otherAccounts.map(a => (
            <div
              key={a.id}
              className={`chip ${toAccountId === a.id ? 'on' : ''}`}
              onClick={() => setToAccountId(a.id)}
            >
              {a.code} <span style={{ color: 'var(--ink-4)' }}>· {a.currency}</span>
            </div>
          ))}
        </div>

        {/* Exchange rate (cross-currency only) */}
        {isCrossRate && toAccount && (
          <>
            <div style={{ marginTop: 14, fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 8 }}>
              TIPO DE CAMBIO ·{' '}
              {fromAccount.currency === 'ARS' ? '1 USD =' : '1 ARS ='}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={exchangeRate}
                onChange={e => setExchangeRate(e.target.value)}
                placeholder="ej: 1250"
                style={{
                  flex: 1, background: '#050505', border: '1px solid var(--amb)',
                  color: 'var(--amb)', fontFamily: 'var(--mono)', fontSize: 16,
                  letterSpacing: '0.04em', padding: '10px 12px', outline: 'none',
                }}
              />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.14em' }}>
                {fromAccount.currency === 'ARS' ? 'ARS' : 'USD'}
              </span>
            </div>
            {numAmount > 0 && rate > 0 && (
              <div style={{
                marginTop: 8, padding: '8px 12px', border: '1px solid var(--line-2)',
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)',
              }}>
                {fmt(numAmount).intStr} {fromAccount.currency} → {fmt(destAmount).intStr} {toAccount.currency}
              </div>
            )}
          </>
        )}
        <div style={{ height: 14 }} />
      </div>

      {/* Fixed bottom: amount + keypad + commit */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--line-2)' }}>
        {/* Amount display */}
        <div style={{
          padding: '12px 14px 10px', background: '#050505',
          borderBottom: '1px solid var(--line)',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 6 }}>
            AMOUNT · {fromAccount.currency}
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 40, letterSpacing: '-0.03em',
            color: 'var(--grn)', fontVariantNumeric: 'tabular-nums',
            display: 'flex', alignItems: 'baseline', gap: 6,
          }}>
            <span style={{ color: 'var(--ink-4)', fontSize: 22 }}>⇄$</span>
            <span>{amount}</span>
            <span className="blink" style={{ color: 'var(--grn)', fontSize: 30 }}>▮</span>
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

        {/* Commit */}
        <div style={{ padding: '10px 14px 10px' }}>
          <button
            className="btn-trigger"
            onClick={handleCommit}
            disabled={addTx.isPending}
            style={{ padding: '16px 18px', opacity: addTx.isPending ? 0.6 : 1 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{
                width: 24, height: 24, border: '1px solid var(--grn)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontSize: 12,
              }}>▶</span>
              <span style={{ fontSize: 13, letterSpacing: '0.24em' }}>
                {addTx.isPending ? 'COMMITTING...' : 'COMMIT · TRANSFER'}
              </span>
            </span>
            <span className="num" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--ink-3)' }}>F1</span>
          </button>
        </div>
      </div>
    </div>
  )
}
