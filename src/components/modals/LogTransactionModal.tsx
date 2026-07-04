import { useState } from 'react'
import { SectionLabel } from '../shell/SectionLabel'
import { useCategories } from '../../hooks/useCategories'
import { useAddTransaction, useUpdateTransaction, useDeleteTransaction, type TransactionWithRefs } from '../../hooks/useTransactions'
import { useToast } from '../../context/ToastContext'
import { fmt } from '../../lib/format'
import type { Account, CreditCard, TransactionKind } from '../../types/db'

interface Props {
  accounts: Account[]
  cards: CreditCard[]
  onClose: () => void
  onSuccess?: () => void
  editTx?: TransactionWithRefs | null
}

type Direction = 'OUT' | 'IN' | 'PAY'
type Currency  = 'ARS' | 'USD'

function toLocalDateInput(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function withDate(original: string, dateStr: string): string {
  const d = new Date(original)
  const [y, m, day] = dateStr.split('-').map(Number)
  d.setFullYear(y, m - 1, day)
  return d.toISOString()
}

export function LogTransactionModal({ accounts, cards, onClose, onSuccess, editTx = null }: Props) {
  const isEditing = !!editTx

  const [amount, setAmount]       = useState(editTx ? String(editTx.amount) : '0')
  const [cat, setCat]             = useState(editTx ? editTx.category : 'FOOD')
  const [direction, setDirection] = useState<Direction>(
    editTx ? (editTx.kind === 'INCOME' ? 'IN' : editTx.kind === 'CARD_PAYMENT' ? 'PAY' : 'OUT') : 'OUT'
  )
  const [selectedAcct, setAcct]   = useState<string>(editTx ? (editTx.account_id ?? '') : (accounts[0]?.id ?? ''))
  const [selectedCard, setCard]   = useState<string | null>(editTx ? (editTx.credit_card_id ?? null) : null)
  const [currency, setCurrency]   = useState<Currency>((editTx?.currency as Currency) ?? 'ARS')
  const [desc, setDesc]           = useState(editTx ? (editTx.description ?? '') : '')
  const [occurredAt, setOccurredAt] = useState(editTx ? toLocalDateInput(editTx.occurred_at) : '')
  const [err, setErr]             = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const addTx    = useAddTransaction()
  const updateTx = useUpdateTransaction()
  const deleteTx = useDeleteTransaction()
  const toast = useToast()
  const { data: allCategories = [] } = useCategories()

  const editCard = editTx?.credit_card_id ? cards.find(c => c.id === editTx.credit_card_id) : null
  const isLockedByClose = !!(
    editTx &&
    editTx.kind === 'EXPENSE' &&
    editCard?.last_closed_at &&
    new Date(editTx.occurred_at) <= new Date(editCard.last_closed_at)
  )

  const expenseCats = allCategories.filter(c => c.kind === 'EXPENSE' && !c.is_system).map(c => c.code)
  const incomeCats  = allCategories.filter(c => c.kind === 'INCOME' && !c.is_system).map(c => c.code)
  const cats        = direction === 'OUT' ? expenseCats : direction === 'IN' ? incomeCats : []

  const tap = (k: string) => {
    if (isLockedByClose) return
    if (k === 'DEL') { setAmount(a => a.length <= 1 ? '0' : a.slice(0, -1)); return }
    if (k === '.' && amount.includes('.')) return
    if (amount === '0' && k !== '.') { setAmount(k); return }
    if (amount.length >= 9) return
    setAmount(a => a + k)
  }

  const switchDir = (d: Direction) => {
    if (isEditing) return
    setDirection(d)
    setCard(null)
    setCurrency('ARS')
    setAcct(accounts[0]?.id ?? '')
    if (d === 'OUT') setCat('FOOD')
    else if (d === 'IN') setCat('SALARY')
  }

  const autoFillFromCard = (cardId: string, cur: Currency) => {
    const c = cards.find(c => c.id === cardId)
    if (!c) return
    const debt = cur === 'USD' ? (c.statement_debt_usd ?? 0) : (c.statement_debt_ars ?? 0)
    if (debt > 0) setAmount(String(debt))
  }

  const handleAcctSelect = (acctId: string) => {
    if (isLockedByClose) return
    setAcct(acctId)
    if (direction !== 'PAY') setCard(null)
  }

  const handleCardSelect = (cardId: string) => {
    if (isLockedByClose) return
    setCard(cardId)
    if (direction === 'OUT') setAcct('')
    if (direction === 'PAY' && !isEditing) autoFillFromCard(cardId, currency)
  }

  const handleCurrencySwitch = (cur: Currency) => {
    if (isLockedByClose) return
    setCurrency(cur)
    if (direction === 'PAY' && selectedCard && !isEditing) autoFillFromCard(selectedCard, cur)
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
      const kind: TransactionKind = direction === 'PAY' ? 'CARD_PAYMENT' : direction === 'OUT' ? 'EXPENSE' : 'INCOME'
      const category = direction === 'PAY' ? 'CARD_PAYMENT' : cat
      const account_id = direction === 'PAY'
        ? selectedAcct
        : (direction === 'OUT' && selectedCard ? null : (selectedAcct || null))
      const credit_card_id = direction === 'PAY'
        ? selectedCard!
        : (direction === 'OUT' && selectedCard ? selectedCard : null)
      const txCurrency = (direction === 'OUT' && selectedCard) || direction === 'PAY' ? currency : 'ARS'

      if (isEditing && editTx) {
        await updateTx.mutateAsync({
          id:             editTx.id,
          kind,
          amount:         num,
          currency:       txCurrency,
          category,
          description:    desc.trim() || null,
          account_id,
          credit_card_id,
          occurred_at:    withDate(editTx.occurred_at, occurredAt),
        })
        toast('TX · ENTRADA ACTUALIZADA', 'var(--grn)')
      } else if (direction === 'PAY') {
        await addTx.mutateAsync({
          kind:           'CARD_PAYMENT',
          amount:         num,
          currency,
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
          currency:       direction === 'OUT' && selectedCard ? currency : undefined,
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

  const handleDelete = async () => {
    if (!editTx) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setErr('')
    try {
      await deleteTx.mutateAsync(editTx.id)
      toast('TX · ENTRADA ELIMINADA', 'var(--red)')
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'ERROR')
    }
  }

  const color = direction === 'OUT' ? 'var(--amb)' : direction === 'IN' ? 'var(--grn)' : 'var(--amb)'
  const amtPrefix = direction === 'IN' ? '+' : '−'

  const activeCurrency: Currency = (() => {
    if ((direction === 'OUT' && selectedCard) || direction === 'PAY') return currency
    if (selectedAcct) return (accounts.find(a => a.id === selectedAcct)?.currency as Currency) ?? 'ARS'
    return 'ARS'
  })()

  const showCurrencyToggle = (direction === 'OUT' && !!selectedCard) || direction === 'PAY'

  const selectedCardData = selectedCard ? cards.find(c => c.id === selectedCard) : null

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
      {/* HUD header */}
      <div style={{
        padding: '8px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid var(--grn)', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
        color: 'var(--grn)',
        background: 'rgba(0,255,65,0.04)',
        flexShrink: 0,
      }}>
        <span>{isEditing ? '◆ EDITAR ENTRADA' : '◆ LOG · NUEVA ENTRADA'} <span className="blink">_</span></span>
        <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--amb)' }}>ESC ✕</span>
      </div>

      {/* Scrollable zone */}
      <div className="scroll" style={{ padding: '0 14px', flex: 1 }}>
        {/* Direction toggle */}
        <div style={{ display: 'flex', gap: 0, marginTop: 14, border: '1px solid var(--line-2)', opacity: isEditing ? 0.6 : 1 }}>
          {modeOptions.map((o, i) => (
            <div key={o.id} onClick={() => switchDir(o.id)} style={{
              flex: 1, padding: '12px 0', textAlign: 'center',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
              cursor: isEditing ? 'default' : 'pointer',
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
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', opacity: isLockedByClose ? 0.5 : 1 }}>
          {accounts.map(a => (
            <div
              key={a.id}
              className={`chip ${selectedAcct === a.id && (direction === 'PAY' || !selectedCard) ? 'on' : ''}`}
              onClick={() => handleAcctSelect(a.id)}
            >
              {a.code} <span style={{ color: 'var(--ink-4)' }}>· {a.name}</span>
            </div>
          ))}
        </div>

        {/* Card selector */}
        {(direction === 'OUT' || direction === 'PAY') && cards.length > 0 && (
          <>
            <SectionLabel right="CARD">{direction === 'PAY' ? 'TARJETA A PAGAR' : 'TARJETA'}</SectionLabel>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', opacity: isLockedByClose ? 0.5 : 1 }}>
              {cards.map(c => (
                <div
                  key={c.id}
                  className={`chip amb ${selectedCard === c.id ? 'on' : ''}`}
                  onClick={() => handleCardSelect(c.id)}
                >
                  {c.code} <span style={{ color: 'var(--ink-4)' }}>· {c.name}</span>
                </div>
              ))}
            </div>

            {isLockedByClose && (
              <div style={{
                marginTop: 8, padding: '6px 10px',
                border: '1px solid var(--amb)', color: 'var(--amb)',
                fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em',
              }}>
                ⚠ RESUMEN YA CERRADO · MONTO/MONEDA/TARJETA BLOQUEADOS
              </div>
            )}

            {/* PAY mode: show per-currency statement debt */}
            {direction === 'PAY' && selectedCardData && (
              <div style={{
                marginTop: 8, padding: '8px 10px',
                border: '1px solid var(--line-2)', background: '#050505',
                fontFamily: 'var(--mono)', fontSize: 10,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
              }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-4)', marginBottom: 2 }}>RESUMEN ARS</div>
                  <div style={{ color: (selectedCardData.statement_debt_ars ?? 0) > 0 ? 'var(--amb)' : 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>
                    −{fmt(selectedCardData.statement_debt_ars ?? 0).intStr}<span style={{ color: 'var(--ink-4)' }}>.{fmt(selectedCardData.statement_debt_ars ?? 0).centStr}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-4)', marginBottom: 2 }}>RESUMEN USD</div>
                  <div style={{ color: (selectedCardData.statement_debt_usd ?? 0) > 0 ? 'var(--amb)' : 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>
                    −{fmt(selectedCardData.statement_debt_usd ?? 0).intStr}<span style={{ color: 'var(--ink-4)' }}>.{fmt(selectedCardData.statement_debt_usd ?? 0).centStr}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Currency toggle — shown when card is selected in OUT or PAY mode */}
        {showCurrencyToggle && (
          <>
            <SectionLabel right="MONEDA">MONEDA DE CARGO</SectionLabel>
            <div style={{ display: 'flex', border: '1px solid var(--line-2)', opacity: isLockedByClose ? 0.5 : 1 }}>
              {(['ARS', 'USD'] as Currency[]).map((cur, i) => (
                <div
                  key={cur}
                  onClick={() => handleCurrencySwitch(cur)}
                  style={{
                    flex: 1, padding: '10px 0', textAlign: 'center',
                    fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
                    cursor: 'pointer',
                    background: currency === cur ? 'rgba(255,176,0,0.08)' : 'transparent',
                    color: currency === cur ? 'var(--amb)' : 'var(--ink-3)',
                    borderRight: i === 0 ? '1px solid var(--line-2)' : 0,
                  }}
                >
                  {cur}
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

        {/* Date — edit mode only */}
        {isEditing && (
          <>
            <SectionLabel right="FECHA">FECHA</SectionLabel>
            <input
              type="date"
              value={occurredAt}
              onChange={e => setOccurredAt(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#050505', border: '1px solid var(--line-2)',
                color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12,
                letterSpacing: '0.04em', padding: '10px 12px',
                outline: 'none',
              }}
            />
          </>
        )}
        <div style={{ height: 14 }} />
      </div>

      {/* Fixed: amount display + keypad + commit */}
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
        <div className="keypad" style={{ opacity: isLockedByClose ? 0.4 : 1, pointerEvents: isLockedByClose ? 'none' : 'auto' }}>
          {['1','2','3','4','5','6','7','8','9','.','0','DEL'].map(k => (
            <div key={k} className={`key ${k === 'DEL' ? 'act' : ''}`} onClick={() => tap(k)}>
              {k === 'DEL' ? '⌫' : k}
            </div>
          ))}
        </div>

        {/* Commit */}
        <div style={{ padding: '10px 14px 10px', display: 'flex', gap: 8 }}>
          {isEditing && (
            <button
              className="btn-trigger"
              onClick={handleDelete}
              disabled={deleteTx.isPending || isLockedByClose}
              style={{
                padding: '16px 14px', flex: confirmDelete ? 1 : '0 0 auto',
                borderColor: 'var(--red)', color: 'var(--red)',
                opacity: (deleteTx.isPending || isLockedByClose) ? 0.4 : 1,
              }}
            >
              <span style={{ fontSize: 13, letterSpacing: '0.2em' }}>
                {deleteTx.isPending ? 'BORRANDO...' : confirmDelete ? 'CONFIRMAR BORRADO' : 'BORRAR'}
              </span>
            </button>
          )}
          <button
            className="btn-trigger"
            onClick={handleCommit}
            disabled={addTx.isPending || updateTx.isPending}
            style={{ padding: '16px 18px', flex: 1, opacity: (addTx.isPending || updateTx.isPending) ? 0.6 : 1 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{
                width: 24, height: 24, border: '1px solid var(--grn)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontSize: 12,
              }}>▶</span>
              <span style={{ fontSize: 13, letterSpacing: '0.24em' }}>
                {(addTx.isPending || updateTx.isPending) ? 'SAVING...' : isEditing ? 'GUARDAR · ENTER' : 'COMMIT · ENTER'}
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
