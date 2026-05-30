import { useState } from 'react'
import { SectionLabel } from '../shell/SectionLabel'
import { useAddTransaction } from '../../hooks/useTransactions'
import { useConfirmEvent, useSkipEvent } from '../../hooks/useScheduledEvents'
import { useToast } from '../../context/ToastContext'
import type { Account, CreditCard, ScheduledEvent, RecurringTemplate } from '../../types/db'

interface Props {
  event: ScheduledEvent & { recurring_templates: RecurringTemplate }
  accounts: Account[]
  cards: CreditCard[]
  onClose: () => void
}

export function RecurringPromptModal({ event, accounts, cards, onClose }: Props) {
  const t = event.recurring_templates
  const isExpense = t.kind === 'EXPENSE'
  const color     = isExpense ? 'var(--amb)' : 'var(--grn)'

  const [amount,      setAmount]  = useState(t.amount ? String(t.amount) : '')
  const [err,         setErr]     = useState('')

  const addTx        = useAddTransaction()
  const confirmEvent = useConfirmEvent()
  const skipEvent    = useSkipEvent()
  const toast        = useToast()

  // Preselect account/card from template
  const acctId = t.account_id ?? accounts[0]?.id ?? ''
  const cardId = t.credit_card_id ?? null

  const handleConfirm = async () => {
    const num = parseFloat(amount)
    if (!num || num <= 0) { setErr('INGRESÁ EL MONTO'); return }
    setErr('')
    try {
      const tx = await addTx.mutateAsync({
        kind:           t.kind as import('../../types/db').TransactionKind,
        amount:         num,
        category:       t.category,
        description:    t.description ?? t.name,
        account_id:     isExpense && cardId ? null : acctId,
        credit_card_id: isExpense && cardId ? cardId : null,
      })
      await confirmEvent.mutateAsync({ eventId: event.id, transactionId: tx.id })
      toast(`RECURRENTE · ${t.name.toUpperCase().slice(0, 20)}`, t.kind === 'EXPENSE' ? 'var(--amb)' : 'var(--grn)')
      onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'ERROR')
    }
  }

  const handleSkip = async () => {
    await skipEvent.mutateAsync(event.id)
    onClose()
  }

  const busy = addTx.isPending || confirmEvent.isPending || skipEvent.isPending

  // Resolve account/card display
  const acct = accounts.find(a => a.id === acctId)
  const card = cards.find(c => c.id === cardId)
  const destLabel = cardId && card ? `${card.code} · ${card.name}` : acct ? `${acct.code} · ${acct.name}` : '—'

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
        borderTop: `1px solid ${color}`, borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
        color, background: isExpense ? 'rgba(255,176,0,0.04)' : 'rgba(0,255,65,0.04)',
        flexShrink: 0,
      }}>
        <span>◆ RECURRENTE · CONFIRMAR <span className="blink">_</span></span>
        <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--ink-3)' }}>ESC</span>
      </div>

      <div className="scroll" style={{ padding: '0 14px 14px' }}>
        {/* Info strip */}
        <div style={{
          marginTop: 14, padding: '12px 14px',
          border: `1px solid ${color}`,
          background: isExpense ? 'rgba(255,176,0,0.04)' : 'rgba(0,255,65,0.04)',
          fontFamily: 'var(--mono)',
        }}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 6 }}>
            {t.kind} · {t.category}
          </div>
          <div style={{ fontSize: 16, color, letterSpacing: '0.08em' }}>{t.name}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
            <span>DUE {event.due_date}</span>
            <span>→ {destLabel}</span>
          </div>
        </div>

        {/* Amount — editable if prompt_for_amount or no fixed amount */}
        <SectionLabel right="MONTO">IMPORTE</SectionLabel>
        {(t.prompt_for_amount || !t.amount) ? (
          <input
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            type="number"
            min="0"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#050505', border: `1px solid ${color}`,
              color, fontFamily: 'var(--mono)', fontSize: 28,
              letterSpacing: '0.04em', padding: '14px 16px', outline: 'none',
              fontVariantNumeric: 'tabular-nums',
            }}
          />
        ) : (
          <div style={{
            padding: '14px 16px', border: '1px solid var(--line-2)', background: '#050505',
            fontFamily: 'var(--mono)', fontSize: 28, color,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em',
          }}>
            {isExpense ? '−' : '+'}{amount}
          </div>
        )}

        {err && (
          <div style={{
            marginTop: 10, padding: '8px 12px',
            border: '1px solid var(--red)', color: 'var(--red)',
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
          }}>✕ {err}</div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className={`btn-trigger ${isExpense ? 'amber' : ''}`}
            onClick={handleConfirm}
            disabled={busy}
            style={{ padding: '18px', opacity: busy ? 0.6 : 1 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 24, height: 24, border: `1px solid ${color}`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              }}>▶</span>
              <span style={{ fontSize: 12, letterSpacing: '0.22em' }}>
                {busy ? 'GUARDANDO...' : 'CONFIRM · REGISTRAR'}
              </span>
            </span>
          </button>

          <button
            onClick={handleSkip}
            disabled={busy}
            style={{
              background: 'transparent', border: '1px solid var(--line-2)',
              color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11,
              letterSpacing: '0.18em', padding: '14px 18px', cursor: 'pointer',
              width: '100%', opacity: busy ? 0.6 : 1,
            }}
          >
            SKIP · OMITIR
          </button>
        </div>

        <div style={{ height: 12 }} />
      </div>
    </div>
  )
}
