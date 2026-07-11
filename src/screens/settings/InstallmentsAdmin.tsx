import { useState } from 'react'
import { SectionLabel } from '../../components/shell/SectionLabel'
import { useInstallmentPlans, useCancelInstallmentPlan, type InstallmentPlanWithCard } from '../../hooks/useInstallments'
import { installmentDueDate } from '../../lib/installments'
import { fmt } from '../../lib/format'

interface Props { onBack: () => void }

const BAR_LEN = 12

function progressBar(posted: number, total: number): string {
  const filled = Math.round((posted / total) * BAR_LEN)
  return '▮'.repeat(filled) + '▯'.repeat(BAR_LEN - filled)
}

export function InstallmentsAdmin({ onBack }: Props) {
  const { data: plans = [], isLoading } = useInstallmentPlans()
  const cancelPlan = useCancelInstallmentPlan()

  const active   = plans.filter(p => p.status === 'ACTIVE')
  const finished = plans.filter(p => p.status !== 'ACTIVE')

  return (
    <div className="scroll" style={{ padding: '0 14px 20px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
      }}>
        <span onClick={onBack} style={{ color: 'var(--amb)', cursor: 'pointer' }}>← BACK</span>
        <span style={{ color: 'var(--ink-3)' }}>INSTALLMENTS · ADMIN</span>
      </div>

      <SectionLabel right={`${active.length} ACTIVE`}>PLANES EN CURSO</SectionLabel>

      {isLoading && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          LOADING...
        </div>
      )}

      {active.map(p => (
        <PlanRow key={p.id} p={p} onCancel={() => cancelPlan.mutate(p.id)} />
      ))}

      {active.length === 0 && !isLoading && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          NO ACTIVE PLANS
        </div>
      )}

      {finished.length > 0 && (
        <>
          <SectionLabel right={`${finished.length}`}>FINALIZADOS</SectionLabel>
          {finished.map(p => (
            <PlanRow key={p.id} p={p} />
          ))}
        </>
      )}

      <div style={{
        marginTop: 16, fontFamily: 'var(--mono)', fontSize: 9,
        color: 'var(--ink-4)', letterSpacing: '0.14em',
      }}>
        ◆ ALTA VIA LOG · GASTO + TARJETA + CUOTAS
      </div>

      <div style={{ height: 24 }} />
    </div>
  )
}

function PlanRow({ p, onCancel }: { p: InstallmentPlanWithCard; onCancel?: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const isActive = p.status === 'ACTIVE'
  const { intStr, centStr } = fmt(p.installment_amount)
  const nextDue = isActive && p.posted_count < p.n_installments
    ? installmentDueDate(p.first_due_date, p.posted_count + 1)
    : null

  const handleCancel = () => {
    if (!onCancel) return
    if (!confirming) { setConfirming(true); return }
    onCancel()
    setConfirming(false)
  }

  return (
    <div className="row" style={{ gridTemplateColumns: '1fr auto auto', alignItems: 'center' }}>
      <div>
        <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: isActive ? 'var(--ink)' : 'var(--ink-4)' }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.1em' }}>
            {p.credit_cards?.code ?? '—'}
          </span>
          {p.status === 'CANCELED' && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--red)', letterSpacing: '0.1em' }}>CANCELED</span>
          )}
        </div>
        <div className="sub" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {p.currency} · <span style={{ color: isActive ? 'var(--amb)' : 'var(--ink-4)' }}>−{intStr}.{centStr}</span> / MES
          {nextDue && <> · PRÓX {nextDue}</>}
        </div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em',
          color: isActive ? 'var(--amb)' : 'var(--ink-4)', marginTop: 2,
        }}>
          {progressBar(p.posted_count, p.n_installments)}
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 11, fontVariantNumeric: 'tabular-nums',
        color: isActive ? 'var(--amb)' : 'var(--ink-4)', padding: '4px 8px',
      }}>
        {p.posted_count}/{p.n_installments}
      </div>
      {isActive && onCancel ? (
        <div
          style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', cursor: 'pointer', padding: '4px 8px', letterSpacing: '0.08em' }}
          onClick={handleCancel}
        >
          {confirming ? 'CONFIRM?' : 'CANCEL'}
        </div>
      ) : <div />}
    </div>
  )
}
