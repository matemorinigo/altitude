import { useState } from 'react'
import { SectionLabel } from '../shell/SectionLabel'
import { CATEGORIES } from '../../lib/categories'
import { useAddTransaction } from '../../hooks/useTransactions'
import { useToast } from '../../context/ToastContext'
import type { Account, CreditCard } from '../../types/db'

interface Props {
  accounts: Account[]
  cards: CreditCard[]
  onClose: () => void
  onSuccess?: () => void
}

type Direction = 'OUT' | 'IN' | 'PAY'

export function LogTransactionModal({ accounts, cards, onClose, onSuccess }: Props) {
  const [amount, setAmount]       = useState('0')
  const [cat, setCat]             = useState('FOOD')
  const [direction, setDirection] = useState<Direction>('OUT')
  const [selectedAcct, setAcct]   = useState<string>(accounts[0]?.id ?? '')
  const [selectedCard, setCard]   = useState<string | null>(null)
  const [desc, setDesc]           = useState('')
  const [err, setErr]             = useState('')

  const addTx = useAddTransaction()
  const toast = useToast()

  const expenseCats = CATEGORIES.filter(c => c.kind === 'EXPENSE').map(c => c.code)
  const incomeCats  = CATEGORIES.filter(c => c.kind === 'INCOME').map(c => c.code)
  const cats        = direction === 'OUT' ? expenseCats : direction === 'IN' ? incomeCats : []

  const tap = (k: string) => {
    if (k === 'DEL') { setAmount(a => a.length <= 1 ? '0' : a.slice(0, -1)); return }
    if (k === '.' && amount.includes('.')) return
    if (amount === '0' && k !== '.') { setAmount(k); return }
    if (amount.length >= 9) return
    setAmount(a => a + k)
  }

  const switchDir = (d: Direction) => {
    setDirection(d)
    setCard(null)
    setAcct(accounts[0]?.id ?? '')
    if (d === 'OUT') setCat('FOOD')
    else if (d === 'IN') setCat('SALARY')
  }

  const handleCommit = async () => {
    const num = parseFloat(amount)
    if (!num || num <= 0) { setErr('AMOUNT REQUIRED'); return }

    if (direction === 'OUT') {
      if (!selectedAcct && !selectedCard) { setErr('SELECT ACCOUNT OR CARD'); return }
    } else if (direction === 'IN') {
      if (!selectedAcct) { setErr('SELECT ACCOUNT'); return }
    } else {
      if (!selectedAcct) { setErr('SELECT ACCOUNT'); return }
      if (!selectedCard) { setErr('SELECT CARD'); return }
    }

    setErr('')
    try {
      if (direction === 'PAY') {
        await addTx.mutateAsync({
          kind:           'CARD_PAYMENT',
          amount:         num,
          category:       'CARD_PAYMENT',
          description:    desc.trim() || undefined,
          account_id:     selectedAcct,
          credit_card_id: selectedCard!,
        })
        toast('TX · CARD PAYMENT COMMITTED', 'var(--amb)')
      } else {
        await addTx.mutateAsync({
          kind:           direction === 'OUT' ? 'EXPENSE' : 'INCOME',
          amount:         num,
          category:       cat,
          description:    desc.trim() || undefined,
          account_id:     direction === 'OUT' && selectedCard ? null : (selectedAcct || null),
          credit_card_id: direction === 'OUT' && selectedCard ? selectedCard : null,
        })
        toast(direction === 'OUT' ? 'TX · DEBIT COMMITTED' : 'TX · CREDIT COMMITTED', direction === 'OUT' ? 'var(--amb)' : 'var(--grn)')
      }
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'ERROR')
    }
  }

  const color = direction === 'OUT' ? 'var(--amb)' : direction === 'IN' ? 'var(--grn)' : 'var(--amb)'
  const amtPrefix = direction === 'IN' ? '+' : '−'

  const activeCurrency = (() => {
    if (direction === 'OUT' && selectedCard) {
      return cards.find(c => c.id === selectedCard)?.currency ?? 'ARS'
    }
    if (selectedAcct) {
      return accounts.find(a => a.id === selectedAcct)?.currency ?? 'ARS'
    }
    return 'ARS'
  })()

  const modeOptions: Array<{ id: Direction; label: string; col: string }> = [
    { id: 'OUT', label: 'DEBIT · GASTO',    col: 'var(--amb)' },
    { id: 'IN',  label: 'CREDIT · INGRESO', col: 'var(--grn)' },
    ...(cards.length > 0 ? [{ id: 'PAY' as Direction, label: 'PAGO · TARJETA', col: 'var(--amb)' }] : []),
  ]

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 30,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(4px)',
    }}>
      {/* HUD header — fijo */}
      <div style={{
        padding: '8px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid var(--grn)', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
        color: 'var(--grn)',
        background: 'rgba(0,255,65,0.04)',
        flexShrink: 0,
      }}>
        <span>◆ LOG · NUEVA ENTRADA <span className="blink">_</span></span>
        <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--amb)' }}>ESC ✕</span>
      </div>

      {/* Zona scrollable: dirección / categoría / cuenta / tarjeta / desc */}
      <div className="scroll" style={{ padding: '0 14px', flex: 1 }}>
        {/* Direction toggle */}
        <div style={{ display: 'flex', gap: 0, marginTop: 14, border: '1px solid var(--line-2)' }}>
          {modeOptions.map((o, i) => (
            <div key={o.id} onClick={() => switchDir(o.id)} style={{
              flex: 1, padding: '12px 0', textAlign: 'center',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
              cursor: 'pointer',
              background: direction === o.id
                ? (o.id === 'IN' ? 'rgba(0,255,65,0.08)' : 'rgba(255,176,0,0.08)')
                : 'transparent',
              color: direction === o.id ? o.col : 'var(--ink-3)',
              borderRight: i < modeOptions.length - 1 ? '1px solid var(--line-2)' : 0,
            }}>{o.label}</div>
          ))}
        </div>

        {/* Category chips */}
        {direction !== 'PAY' && (
          <>
            <SectionLabel right="CAT">CATEGORÍA</SectionLabel>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {cats.map(c => (
                <div key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</div>
              ))}
            </div>
          </>
        )}

        {/* Account selector */}
        <SectionLabel right="ACCT">{direction === 'PAY' ? 'DÉBITAR DE' : 'CUENTA'}</SectionLabel>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {accounts.map(a => (
            <div
              key={a.id}
              className={`chip ${selectedAcct === a.id && (direction === 'PAY' || !selectedCard) ? 'on' : ''}`}
              onClick={() => { setAcct(a.id); if (direction !== 'PAY') setCard(null) }}
            >
              {a.code} <span style={{ color: 'var(--ink-4)' }}>· {a.name}</span>
            </div>
          ))}
        </div>

        {/* Card selector */}
        {(direction === 'OUT' || direction === 'PAY') && cards.length > 0 && (
          <>
            <SectionLabel right="CARD">{direction === 'PAY' ? 'TARJETA A PAGAR' : 'TARJETA'}</SectionLabel>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {cards.map(c => (
                <div
                  key={c.id}
                  className={`chip amb ${selectedCard === c.id ? 'on' : ''}`}
                  onClick={() => {
                    setCard(c.id)
                    if (direction === 'OUT') setAcct('')
                    if (direction === 'PAY' && c.statement_debt > 0)
                      setAmount(String(c.statement_debt))
                  }}
                >
                  {c.code} <span style={{ color: 'var(--ink-4)' }}>· {c.name}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Description */}
        <SectionLabel right="OPT">DESCRIPCIÓN</SectionLabel>
        <input
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="—"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#050505', border: '1px solid var(--line-2)',
            color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12,
            letterSpacing: '0.04em', padding: '10px 12px',
            outline: 'none',
          }}
        />
        <div style={{ height: 14 }} />
      </div>

      {/* Zona fija: amount display + keypad + commit */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--line-2)' }}>
        {/* Amount display */}
        <div style={{
          padding: '12px 14px 10px', background: '#050505', position: 'relative',
          borderBottom: '1px solid var(--line)',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-3)', marginBottom: 6 }}>
            AMOUNT · {activeCurrency}
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 40, letterSpacing: '-0.03em',
            color, fontVariantNumeric: 'tabular-nums',
            display: 'flex', alignItems: 'baseline', gap: 6,
          }}>
            <span style={{ color: 'var(--ink-4)', fontSize: 22 }}>{amtPrefix}$</span>
            <span>{amount}</span>
            <span className="blink" style={{ color, fontSize: 30 }}>▮</span>
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
                {addTx.isPending ? 'SAVING...' : 'COMMIT · ENTER'}
              </span>
            </span>
            <span className="num" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--ink-3)' }}>
              CONFIRM
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
