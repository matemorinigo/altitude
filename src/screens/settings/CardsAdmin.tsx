import { useState } from 'react'
import { SectionLabel } from '../../components/shell/SectionLabel'
import { useCreditCards, useAddCard, useUpdateCard, useArchiveCard } from '../../hooks/useCreditCards'
import type { CreditCard } from '../../types/db'

interface Props {
  onBack: () => void
}

const inputStyle: React.CSSProperties = {
  background: '#050505', border: '1px solid var(--line-2)',
  color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12,
  letterSpacing: '0.04em', padding: '10px 12px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

function EditRow({ card, onDone }: { card: CreditCard; onDone: () => void }) {
  const [closeDay, setClose] = useState(String(card.close_day))
  const [dueDay, setDue]     = useState(String(card.due_day))
  const [err, setErr]        = useState('')
  const update = useUpdateCard()

  const handleSave = async () => {
    const cd = parseInt(closeDay)
    const dd = parseInt(dueDay)
    if (!cd || cd < 1 || cd > 31) { setErr('INVALID CLOSE DAY (1-31)'); return }
    if (!dd || dd < 1 || dd > 31) { setErr('INVALID DUE DAY (1-31)'); return }
    setErr('')
    try {
      await update.mutateAsync({ id: card.id, close_day: cd, due_day: dd })
      onDone()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'ERROR')
    }
  }

  return (
    <div style={{ padding: '10px 0 6px', borderBottom: '1px solid var(--line-2)' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 8 }}>
        EDITANDO · {card.code} · {card.name.toUpperCase()}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: err ? 8 : 0 }}>
        <input
          value={closeDay} onChange={e => setClose(e.target.value)}
          placeholder="CLOSE DAY" style={{ ...inputStyle, flex: 1 }}
          type="number" min={1} max={31}
        />
        <input
          value={dueDay} onChange={e => setDue(e.target.value)}
          placeholder="DUE DAY" style={{ ...inputStyle, flex: 1 }}
          type="number" min={1} max={31}
        />
      </div>
      {err && (
        <div style={{ border: '1px solid var(--red)', color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 10, padding: '6px 10px', letterSpacing: '0.14em', marginBottom: 8 }}>
          ✕ {err}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-trigger" onClick={handleSave} disabled={update.isPending} style={{ padding: '10px 16px' }}>
          <span style={{ fontSize: 11, letterSpacing: '0.22em' }}>{update.isPending ? 'SAVING...' : '▶ GUARDAR'}</span>
        </button>
        <button
          onClick={onDone}
          style={{
            background: 'transparent', border: '1px solid var(--line-2)',
            color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11,
            letterSpacing: '0.18em', padding: '10px 16px', cursor: 'pointer',
          }}
        >
          ESC
        </button>
      </div>
    </div>
  )
}

export function CardsAdmin({ onBack }: Props) {
  const { data: cards = [], isLoading } = useCreditCards()
  const addCard     = useAddCard()
  const archiveCard = useArchiveCard()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [code, setCode]           = useState('')
  const [name, setName]           = useState('')
  const [closeDay, setClose]      = useState('')
  const [dueDay, setDue]          = useState('')
  const [err, setErr]             = useState('')

  const handleAdd = async () => {
    const cd = parseInt(closeDay)
    const dd = parseInt(dueDay)
    if (!code.trim() || !name.trim()) { setErr('CODE AND NAME REQUIRED'); return }
    if (!cd || cd < 1 || cd > 31)    { setErr('INVALID CLOSE DAY (1-31)'); return }
    if (!dd || dd < 1 || dd > 31)    { setErr('INVALID DUE DAY (1-31)'); return }
    setErr('')
    try {
      await addCard.mutateAsync({ code: code.toUpperCase().trim(), name: name.trim(), close_day: cd, due_day: dd })
      setCode(''); setName(''); setClose(''); setDue(''); setShowForm(false)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'ERROR')
    }
  }

  return (
    <div className="scroll" style={{ padding: '0 14px 20px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
      }}>
        <span onClick={onBack} style={{ color: 'var(--amb)', cursor: 'pointer' }}>← BACK</span>
        <span style={{ color: 'var(--ink-3)' }}>CREDIT CARDS · ADMIN</span>
      </div>

      <SectionLabel right={`${cards.length} OBJ`}>TARJETAS</SectionLabel>

      {isLoading && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          LOADING...
        </div>
      )}

      {cards.map(c => (
        <div key={c.id}>
          <div className="row" style={{ gridTemplateColumns: 'auto 1fr auto auto' }}>
            <div style={{
              width: 36, height: 36, border: '1px solid var(--amb-dim)', background: '#0a0500',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--amb)',
            }}>{c.code}</div>
            <div>
              <div className="name">{c.name}</div>
              <div className="sub">CLOSE {String(c.close_day).padStart(2,'0')} · DUE {String(c.due_day).padStart(2,'0')}</div>
            </div>
            <div
              style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--grn)', cursor: 'pointer', letterSpacing: '0.1em' }}
              onClick={() => setEditingId(editingId === c.id ? null : c.id)}
            >
              {editingId === c.id ? 'ESC' : 'EDIT'}
            </div>
            <div
              style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', cursor: 'pointer', letterSpacing: '0.1em' }}
              onClick={() => archiveCard.mutate(c.id)}
            >
              ARCH
            </div>
          </div>
          {editingId === c.id && (
            <EditRow card={c} onDone={() => setEditingId(null)} />
          )}
        </div>
      ))}

      {cards.length === 0 && !isLoading && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          NO CARDS
        </div>
      )}

      <SectionLabel right="NEW">AGREGAR TARJETA</SectionLabel>

      {!showForm ? (
        <button className="btn-trigger" onClick={() => setShowForm(true)} style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: 11, letterSpacing: '0.22em' }}>+ ADD CARD</span>
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="CODE (VIS, MC...)" style={inputStyle} maxLength={5} />
          <input value={name} onChange={e => setName(e.target.value)} placeholder="NAME (Visa Signature · GAL)" style={inputStyle} />

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={closeDay} onChange={e => setClose(e.target.value)}
              placeholder="CLOSE DAY (1-31)" style={{ ...inputStyle, flex: 1 }}
              type="number" min={1} max={31}
            />
            <input
              value={dueDay} onChange={e => setDue(e.target.value)}
              placeholder="DUE DAY (1-31)" style={{ ...inputStyle, flex: 1 }}
              type="number" min={1} max={31}
            />
          </div>

          {err && (
            <div style={{ border: '1px solid var(--red)', color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 10, padding: '8px 12px', letterSpacing: '0.14em' }}>
              ✕ {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-trigger" onClick={handleAdd} disabled={addCard.isPending} style={{ padding: '12px 18px' }}>
              <span style={{ fontSize: 11, letterSpacing: '0.22em' }}>{addCard.isPending ? 'SAVING...' : '▶ CONFIRM'}</span>
            </button>
            <button
              onClick={() => { setShowForm(false); setErr('') }}
              style={{
                background: 'transparent', border: '1px solid var(--line-2)',
                color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11,
                letterSpacing: '0.18em', padding: '12px 18px', cursor: 'pointer',
              }}
            >
              ESC
            </button>
          </div>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}
