import { useState } from 'react'
import { SectionLabel } from '../../components/shell/SectionLabel'
import { useRecurringTemplates, useAddRecurring, useToggleRecurring, useDeleteRecurring } from '../../hooks/useRecurring'
import { useAccounts } from '../../hooks/useAccounts'
import { useCreditCards } from '../../hooks/useCreditCards'
import { useCategories } from '../../hooks/useCategories'
import type { RecurringTemplate, ScheduleKind } from '../../types/db'

interface Props { onBack: () => void }

const inputStyle: React.CSSProperties = {
  background: '#050505', border: '1px solid var(--line-2)',
  color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12,
  letterSpacing: '0.04em', padding: '10px 12px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

export function RecurringAdmin({ onBack }: Props) {
  const { data: templates = [], isLoading } = useRecurringTemplates()
  const { data: accounts  = [] }            = useAccounts()
  const { data: cards     = [] }            = useCreditCards()
  const addRecurring    = useAddRecurring()
  const toggleRecurring = useToggleRecurring()
  const deleteRecurring = useDeleteRecurring()

  const [showForm,      setShowForm]     = useState(false)
  const [kind,          setKind]         = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [name,          setName]         = useState('')
  const [amount,        setAmount]       = useState('')
  const [promptAmount,  setPromptAmount] = useState(false)
  const [schedKind,     setSchedKind]    = useState<ScheduleKind>('DAY_OF_MONTH')
  const [dayVal,        setDayVal]       = useState('')
  const [category,      setCategory]     = useState('OTHER')
  const [acctId,        setAcctId]       = useState<string>('')
  const [cardId,        setCardId]       = useState<string>('')
  const [isPayday,      setIsPayday]     = useState(false)
  const [err,           setErr]          = useState('')

  const { data: allCategories = [] } = useCategories()
  const expenseCats = allCategories.filter(c => c.kind === 'EXPENSE' && !c.is_system).map(c => c.code)
  const incomeCats  = allCategories.filter(c => c.kind === 'INCOME' && !c.is_system).map(c => c.code)
  const cats        = kind === 'EXPENSE' ? expenseCats : incomeCats

  const resetForm = () => {
    setName(''); setAmount(''); setPromptAmount(false)
    setSchedKind('DAY_OF_MONTH'); setDayVal('')
    setKind('EXPENSE'); setCategory('OTHER')
    setAcctId(''); setCardId(''); setIsPayday(false); setErr('')
    setShowForm(false)
  }

  const handleAdd = async () => {
    if (!name.trim()) { setErr('NOMBRE REQUERIDO'); return }
    const dayNum = parseInt(dayVal)
    if (!dayNum || dayNum < 1) { setErr('INGRESÁ EL DÍA'); return }
    if (schedKind === 'DAY_OF_MONTH' && dayNum > 31) { setErr('DÍA INVÁLIDO (1-31)'); return }
    if (schedKind === 'NTH_BUSINESS_DAY' && dayNum > 25) { setErr('N INVÁLIDO (1-25)'); return }
    setErr('')
    try {
      await addRecurring.mutateAsync({
        kind,
        name: name.trim(),
        amount: amount ? parseFloat(amount) : null,
        prompt_for_amount: promptAmount,
        schedule_kind: schedKind,
        day_of_month:     schedKind === 'DAY_OF_MONTH'     ? dayNum : null,
        nth_business_day: schedKind === 'NTH_BUSINESS_DAY' ? dayNum : null,
        category,
        description: null,
        account_id:     acctId || null,
        credit_card_id: kind === 'EXPENSE' && cardId ? cardId : null,
        is_payday: isPayday,
      })
      resetForm()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'ERROR')
    }
  }

  const active   = templates.filter(t => t.is_active)
  const inactive = templates.filter(t => !t.is_active)

  return (
    <div className="scroll" style={{ padding: '0 14px 20px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
      }}>
        <span onClick={onBack} style={{ color: 'var(--amb)', cursor: 'pointer' }}>← BACK</span>
        <span style={{ color: 'var(--ink-3)' }}>RECURRING · ADMIN</span>
      </div>

      <SectionLabel right={`${active.length} ACTIVE`}>TEMPLATES</SectionLabel>

      {isLoading && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          LOADING...
        </div>
      )}

      {[...active, ...inactive].map(t => (
        <TemplateRow
          key={t.id}
          t={t}
          onToggle={() => toggleRecurring.mutate({ id: t.id, is_active: !t.is_active })}
          onDelete={() => deleteRecurring.mutate(t.id)}
        />
      ))}

      {templates.length === 0 && !isLoading && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          NO TEMPLATES
        </div>
      )}

      <SectionLabel right="NEW">AGREGAR TEMPLATE</SectionLabel>

      {!showForm ? (
        <button className="btn-trigger" onClick={() => setShowForm(true)} style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: 11, letterSpacing: '0.22em' }}>+ ADD RECURRING</span>
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Kind */}
          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--line-2)' }}>
            {(['EXPENSE', 'INCOME'] as const).map(k => (
              <div
                key={k}
                onClick={() => { setKind(k); setCategory(k === 'EXPENSE' ? 'OTHER' : 'SALARY') }}
                style={{
                  flex: 1, padding: '10px 0', textAlign: 'center',
                  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', cursor: 'pointer',
                  background: kind === k ? (k === 'EXPENSE' ? 'rgba(255,176,0,0.08)' : 'rgba(0,255,65,0.08)') : 'transparent',
                  color: kind === k ? (k === 'EXPENSE' ? 'var(--amb)' : 'var(--grn)') : 'var(--ink-3)',
                  borderRight: k === 'EXPENSE' ? '1px solid var(--line-2)' : 0,
                }}
              >{k}</div>
            ))}
          </div>

          <input value={name} onChange={e => setName(e.target.value)} placeholder="NOMBRE (Spotify, Sueldo...)" style={inputStyle} />
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="MONTO (vacío = preguntar siempre)" type="number" min={0} style={inputStyle} />

          {/* Prompt toggle */}
          <div
            className={`chip ${promptAmount ? 'on' : ''}`}
            onClick={() => setPromptAmount(p => !p)}
            style={{ width: 'fit-content' }}
          >
            PREGUNTAR MONTO AL CONFIRMAR
          </div>

          {/* Schedule kind */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['DAY_OF_MONTH', 'NTH_BUSINESS_DAY'] as ScheduleKind[]).map(s => (
              <div key={s} className={`chip ${schedKind === s ? 'on' : ''}`} onClick={() => setSchedKind(s)}>
                {s === 'DAY_OF_MONTH' ? 'DÍA DEL MES' : 'N° HÁBIL'}
              </div>
            ))}
          </div>

          <input
            value={dayVal} onChange={e => setDayVal(e.target.value)}
            placeholder={schedKind === 'DAY_OF_MONTH' ? 'DÍA (1-31)' : 'N° DÍA HÁBIL (1-25)'}
            type="number" min={1} max={schedKind === 'DAY_OF_MONTH' ? 31 : 25}
            style={inputStyle}
          />

          {/* Category */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {cats.map(c => (
              <div key={c} className={`chip ${category === c ? 'on' : ''}`} onClick={() => setCategory(c)}>{c}</div>
            ))}
          </div>

          {/* Account */}
          {accounts.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <div className={`chip ${!acctId ? 'on' : ''}`} onClick={() => setAcctId('')}>NINGUNA</div>
              {accounts.map(a => (
                <div key={a.id} className={`chip ${acctId === a.id ? 'on' : ''}`} onClick={() => { setAcctId(a.id); setCardId('') }}>
                  {a.code}
                </div>
              ))}
            </div>
          )}

          {/* Card (expenses only) */}
          {kind === 'EXPENSE' && cards.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <div className={`chip ${!cardId ? 'on' : ''}`} onClick={() => setCardId('')}>NO TARJETA</div>
              {cards.map(c => (
                <div key={c.id} className={`chip amb ${cardId === c.id ? 'on' : ''}`} onClick={() => { setCardId(c.id); setAcctId('') }}>
                  {c.code}
                </div>
              ))}
            </div>
          )}

          {/* Payday flag (income only) */}
          {kind === 'INCOME' && (
            <div
              className={`chip ${isPayday ? 'on' : ''}`}
              onClick={() => setIsPayday(p => !p)}
              style={{ width: 'fit-content' }}
            >
              ● MARCAR COMO PAYDAY (SUELDO PRINCIPAL)
            </div>
          )}

          {err && (
            <div style={{ border: '1px solid var(--red)', color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 10, padding: '8px 12px', letterSpacing: '0.14em' }}>
              ✕ {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-trigger" onClick={handleAdd} disabled={addRecurring.isPending} style={{ padding: '12px 18px' }}>
              <span style={{ fontSize: 11, letterSpacing: '0.22em' }}>{addRecurring.isPending ? 'SAVING...' : '▶ CONFIRM'}</span>
            </button>
            <button
              onClick={resetForm}
              style={{
                background: 'transparent', border: '1px solid var(--line-2)',
                color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11,
                letterSpacing: '0.18em', padding: '12px 18px', cursor: 'pointer',
              }}
            >ESC</button>
          </div>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}

function TemplateRow({ t, onToggle, onDelete }: { t: RecurringTemplate; onToggle: () => void; onDelete: () => void }) {
  const isExpense = t.kind === 'EXPENSE'
  const color     = isExpense ? 'var(--amb)' : 'var(--grn)'
  const schedLabel = t.schedule_kind === 'DAY_OF_MONTH'
    ? `DÍA ${t.day_of_month}`
    : `${t.nth_business_day}° HÁBIL`

  return (
    <div className="row" style={{ gridTemplateColumns: '1fr auto auto', alignItems: 'center' }}>
      <div>
        <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {t.is_payday && <span style={{ color: 'var(--grn)', fontSize: 10 }}>●</span>}
          <span style={{ color: t.is_active ? 'var(--ink)' : 'var(--ink-4)' }}>{t.name}</span>
        </div>
        <div className="sub">
          <span style={{ color }}>{t.kind}</span>
          {' · '}{t.category}{' · '}{schedLabel}
          {t.amount && <span style={{ color }}> · {t.amount.toLocaleString('es-AR')}</span>}
        </div>
      </div>
      <div
        style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer',
          color: t.is_active ? 'var(--ink-3)' : 'var(--grn)', padding: '4px 8px' }}
        onClick={onToggle}
      >
        {t.is_active ? 'OFF' : 'ON'}
      </div>
      <div
        style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', cursor: 'pointer', padding: '4px 8px' }}
        onClick={onDelete}
      >
        DEL
      </div>
    </div>
  )
}
