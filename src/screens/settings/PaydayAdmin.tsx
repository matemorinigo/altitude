import { useState, useEffect } from 'react'
import { SectionLabel } from '../../components/shell/SectionLabel'
import { useProfile, useUpdateProfile } from '../../hooks/useProfile'
import { useUpsertPaydayTemplate } from '../../hooks/useRecurring'
import { nextPaydayDate } from '../../lib/payday'
import type { PaydayKind } from '../../types/db'

interface Props { onBack: () => void }

const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']

const inputStyle: React.CSSProperties = {
  background: '#050505', border: '1px solid var(--line-2)',
  color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 13,
  letterSpacing: '0.04em', padding: '10px 12px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

export function PaydayAdmin({ onBack }: Props) {
  const { data: profile, isLoading } = useProfile()
  const updateProfile        = useUpdateProfile()
  const upsertPaydayTemplate = useUpsertPaydayTemplate()

  const [kind,     setKind]     = useState<PaydayKind>('NTH_BUSINESS_DAY')
  const [nth,      setNth]      = useState('1')
  const [dom,      setDom]      = useState('1')
  const [expected, setExpected] = useState('')
  const [err,      setErr]      = useState('')
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    if (!profile) return
    setKind(profile.payday_kind as PaydayKind)
    setNth(String(profile.payday_nth_business_day ?? 1))
    setDom(String(profile.payday_day_of_month ?? 1))
    setExpected(profile.payday_expected_amount ? String(profile.payday_expected_amount) : '')
  }, [profile])

  const handleSave = async () => {
    const nthNum = parseInt(nth)
    const domNum = parseInt(dom)
    if (kind === 'NTH_BUSINESS_DAY' && (!nthNum || nthNum < 1 || nthNum > 25)) {
      setErr('N debe ser entre 1 y 25'); return
    }
    if (kind === 'DAY_OF_MONTH' && (!domNum || domNum < 1 || domNum > 31)) {
      setErr('Día debe ser entre 1 y 31'); return
    }
    setErr('')
    try {
      await updateProfile.mutateAsync({
        payday_kind:             kind,
        payday_nth_business_day: kind === 'NTH_BUSINESS_DAY' ? nthNum : null,
        payday_day_of_month:     kind === 'DAY_OF_MONTH' ? domNum : null,
        payday_expected_amount:  expected ? parseFloat(expected) : null,
      })
      await upsertPaydayTemplate.mutateAsync({
        schedule_kind:    kind,
        day_of_month:     kind === 'DAY_OF_MONTH' ? domNum : null,
        nth_business_day: kind === 'NTH_BUSINESS_DAY' ? nthNum : null,
        amount:           expected ? parseFloat(expected) : null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'ERROR')
    }
  }

  // Mostrar preview del próximo payday
  let previewLabel = '—'
  if (profile) {
    try {
      const next = nextPaydayDate(
        {
          ...profile,
          payday_kind:             kind,
          payday_nth_business_day: parseInt(nth) || null,
          payday_day_of_month:     parseInt(dom) || null,
        },
        new Date(),
      )
      previewLabel = `${String(next.getDate()).padStart(2,'0')} ${MONTHS[next.getMonth()]} ${next.getFullYear()}`
    } catch { /* invalid config */ }
  }

  return (
    <div className="scroll" style={{ padding: '0 14px 20px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
      }}>
        <span onClick={onBack} style={{ color: 'var(--amb)', cursor: 'pointer' }}>← BACK</span>
        <span style={{ color: 'var(--ink-3)' }}>PAYDAY · CONFIG</span>
      </div>

      {isLoading ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '12px 0' }}>
          LOADING...
        </div>
      ) : (
        <>
          <SectionLabel right="TIPO">SCHEDULE</SectionLabel>
          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--line-2)' }}>
            {([
              { id: 'NTH_BUSINESS_DAY' as PaydayKind, label: 'N° DÍA HÁBIL' },
              { id: 'DAY_OF_MONTH'     as PaydayKind, label: 'DÍA DEL MES' },
            ]).map(o => (
              <div
                key={o.id}
                onClick={() => setKind(o.id)}
                style={{
                  flex: 1, padding: '12px 0', textAlign: 'center',
                  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em',
                  cursor: 'pointer',
                  background: kind === o.id ? 'rgba(0,255,65,0.08)' : 'transparent',
                  color: kind === o.id ? 'var(--grn)' : 'var(--ink-3)',
                  borderRight: o.id === 'NTH_BUSINESS_DAY' ? '1px solid var(--line-2)' : 0,
                }}
              >{o.label}</div>
            ))}
          </div>

          {kind === 'NTH_BUSINESS_DAY' ? (
            <>
              <SectionLabel right="N">DÍA HÁBIL N°</SectionLabel>
              <input
                value={nth}
                onChange={e => setNth(e.target.value)}
                type="number" min={1} max={25}
                placeholder="1"
                style={inputStyle}
              />
            </>
          ) : (
            <>
              <SectionLabel right="DAY">DÍA DEL MES</SectionLabel>
              <input
                value={dom}
                onChange={e => setDom(e.target.value)}
                type="number" min={1} max={31}
                placeholder="1"
                style={inputStyle}
              />
            </>
          )}

          <SectionLabel right="OPT">MONTO ESPERADO (ARS)</SectionLabel>
          <input
            value={expected}
            onChange={e => setExpected(e.target.value)}
            type="number" min={0}
            placeholder="Dejar vacío para ingresar al confirmar"
            style={inputStyle}
          />

          {/* Preview */}
          <div style={{
            marginTop: 14, padding: '10px 14px',
            border: '1px solid var(--line-2)', background: '#050505',
            fontFamily: 'var(--mono)',
          }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 6 }}>
              PRÓXIMO PAYDAY · PREVIEW
            </div>
            <div style={{ fontSize: 16, color: 'var(--grn)', letterSpacing: '0.08em' }}>
              {previewLabel}
            </div>
          </div>

          {err && (
            <div style={{
              marginTop: 10, padding: '8px 12px',
              border: '1px solid var(--red)', color: 'var(--red)',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
            }}>✕ {err}</div>
          )}

          <div style={{ marginTop: 14 }}>
            <button
              className="btn-trigger"
              onClick={handleSave}
              disabled={updateProfile.isPending}
              style={{ padding: '16px 18px', opacity: updateProfile.isPending ? 0.6 : 1 }}
            >
              <span style={{ fontSize: 12, letterSpacing: '0.22em' }}>
                {saved ? '✓ SAVED' : (updateProfile.isPending || upsertPaydayTemplate.isPending) ? 'SAVING...' : '▶ GUARDAR CONFIG'}
              </span>
            </button>
          </div>
        </>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}
