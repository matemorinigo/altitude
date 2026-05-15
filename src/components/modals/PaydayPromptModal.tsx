import { useState } from 'react'
import { SectionLabel } from '../shell/SectionLabel'
import { useAddTransaction } from '../../hooks/useTransactions'
import { useConfirmEvent, useSkipEvent } from '../../hooks/useScheduledEvents'
import { useToast } from '../../context/ToastContext'
import type { Account, ScheduledEvent, Profile } from '../../types/db'

const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']

interface Props {
  event: ScheduledEvent
  profile: Profile
  accounts: Account[]
  onClose: () => void
}

export function PaydayPromptModal({ event, profile, accounts, onClose }: Props) {
  const due       = new Date(event.due_date)
  const monthName = `${MONTHS[due.getMonth()]} ${due.getFullYear()}`

  const [amount,      setAmount]  = useState(
    profile.payday_expected_amount ? String(profile.payday_expected_amount) : ''
  )
  const [selectedAcct, setAcct]   = useState<string>(accounts[0]?.id ?? '')
  const [err,          setErr]    = useState('')

  const addTx        = useAddTransaction()
  const confirmEvent = useConfirmEvent()
  const skipEvent    = useSkipEvent()
  const toast        = useToast()

  const handleConfirm = async () => {
    const num = parseFloat(amount)
    if (!num || num <= 0) { setErr('INGRESÁ EL MONTO'); return }
    if (!selectedAcct)    { setErr('SELECCIONÁ UNA CUENTA'); return }
    setErr('')
    try {
      const tx = await addTx.mutateAsync({
        kind:        'INCOME',
        amount:      num,
        category:    'SALARY',
        description: `Sueldo · ${monthName}`,
        account_id:  selectedAcct,
      })
      await confirmEvent.mutateAsync({ eventId: event.id, transactionId: tx.id })
      toast('PAYDAY · REGISTERED')
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
        <span>◆ PAYDAY · CONFIRMAR COBRO <span className="blink">_</span></span>
        <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--ink-3)' }}>ESC</span>
      </div>

      <div className="scroll" style={{ padding: '0 14px 14px' }}>
        {/* Info strip */}
        <div style={{
          marginTop: 14, padding: '12px 14px',
          border: '1px solid var(--grn)', background: 'rgba(0,255,65,0.04)',
          fontFamily: 'var(--mono)',
        }}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 6 }}>
            EVENTO PENDIENTE
          </div>
          <div style={{ fontSize: 14, color: 'var(--grn)', letterSpacing: '0.1em' }}>
            SUELDO · {monthName.toUpperCase()}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.08em' }}>
            DUE {event.due_date}
          </div>
        </div>

        {/* Amount */}
        <SectionLabel right="MONTO">IMPORTE</SectionLabel>
        <input
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder={profile.payday_expected_amount ? String(profile.payday_expected_amount) : '0.00'}
          type="number"
          min="0"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#050505', border: '1px solid var(--grn)',
            color: 'var(--grn)', fontFamily: 'var(--mono)', fontSize: 28,
            letterSpacing: '0.04em', padding: '14px 16px', outline: 'none',
            fontVariantNumeric: 'tabular-nums',
          }}
        />

        {/* Account */}
        <SectionLabel right="ACCT">ACREDITAR EN</SectionLabel>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {accounts.map(a => (
            <div
              key={a.id}
              className={`chip ${selectedAcct === a.id ? 'on' : ''}`}
              onClick={() => setAcct(a.id)}
            >
              {a.code} <span style={{ color: 'var(--ink-4)' }}>· {a.name}</span>
            </div>
          ))}
        </div>

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
            className="btn-trigger"
            onClick={handleConfirm}
            disabled={busy}
            style={{ padding: '18px', opacity: busy ? 0.6 : 1 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 24, height: 24, border: '1px solid var(--grn)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              }}>▶</span>
              <span style={{ fontSize: 12, letterSpacing: '0.22em' }}>
                {busy ? 'GUARDANDO...' : 'CONFIRM · REGISTRAR COBRO'}
              </span>
            </span>
          </button>

          <button
            onClick={handleSkip}
            disabled={busy}
            style={{
              background: 'transparent', border: '1px solid var(--amb)',
              color: 'var(--amb)', fontFamily: 'var(--mono)', fontSize: 11,
              letterSpacing: '0.18em', padding: '14px 18px', cursor: 'pointer',
              width: '100%', opacity: busy ? 0.6 : 1,
            }}
          >
            SKIP · OMITIR ESTE MES
          </button>
        </div>

        <div style={{ height: 12 }} />
      </div>
    </div>
  )
}
