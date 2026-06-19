import { useCloseStatement } from '../../hooks/useCreditCards'
import { useToast } from '../../context/ToastContext'
import { fmt } from '../../lib/format'
import { SectionLabel } from '../shell/SectionLabel'
import type { CreditCard } from '../../types/db'

interface Props {
  card: CreditCard
  onClose: () => void
}

const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']

export function CardClosePromptModal({ card, onClose }: Props) {
  const closeStatement = useCloseStatement()
  const toast = useToast()

  const now = new Date()
  const monthName = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`
  const currArs = card.current_debt_ars ?? 0
  const currUsd = card.current_debt_usd ?? 0
  const stmtArs = card.statement_debt_ars ?? 0
  const stmtUsd = card.statement_debt_usd ?? 0

  const handleConfirm = async () => {
    try {
      await closeStatement.mutateAsync(card)
      toast(`${card.code} · RESUMEN CERRADO`)
      onClose()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'ERROR', 'var(--red)')
    }
  }

  const busy = closeStatement.isPending

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(0,0,0,0.94)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        padding: '8px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid var(--amb)', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
        color: 'var(--amb)', background: 'rgba(255,176,0,0.04)', flexShrink: 0,
      }}>
        <span>◆ CIERRE DE RESUMEN <span className="blink">_</span></span>
        <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--ink-3)' }}>ESC</span>
      </div>

      <div className="scroll" style={{ padding: '0 14px 14px' }}>
        <div style={{
          marginTop: 14, padding: '12px 14px',
          border: '1px solid var(--amb)', background: 'rgba(255,176,0,0.04)',
          fontFamily: 'var(--mono)',
        }}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 6 }}>
            EVENTO PENDIENTE
          </div>
          <div style={{ fontSize: 14, color: 'var(--amb)', letterSpacing: '0.1em' }}>
            {card.code} · {card.name.toUpperCase()} · {monthName}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.08em' }}>
            CLOSE DAY {String(card.close_day).padStart(2, '0')} · DUE DAY {String(card.due_day).padStart(2, '0')}
          </div>
        </div>

        <SectionLabel right="PERÍODO">GASTO CORRIENTE</SectionLabel>
        <div style={{
          padding: '14px 16px', border: '1px solid var(--line-2)', background: '#050505',
          fontFamily: 'var(--mono)',
        }}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 10 }}>
            SE VUELCA AL RESUMEN
          </div>
          {currArs > 0 && (
            <div style={{ marginBottom: currUsd > 0 ? 8 : 0 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-4)', marginBottom: 2 }}>ARS</div>
              <div style={{ fontSize: 32, color: 'var(--amb)', fontVariantNumeric: 'tabular-nums' }}>
                −{fmt(currArs).intStr}<span style={{ color: 'var(--ink-4)', fontSize: 20 }}>.{fmt(currArs).centStr}</span>
              </div>
            </div>
          )}
          {currUsd > 0 && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-4)', marginBottom: 2 }}>USD</div>
              <div style={{ fontSize: 32, color: 'var(--amb)', fontVariantNumeric: 'tabular-nums' }}>
                −{fmt(currUsd).intStr}<span style={{ color: 'var(--ink-4)', fontSize: 20 }}>.{fmt(currUsd).centStr}</span>
              </div>
            </div>
          )}
        </div>

        {(stmtArs > 0 || stmtUsd > 0) && (
          <>
            <SectionLabel right="PENDIENTE">RESUMEN ANTERIOR</SectionLabel>
            <div style={{
              padding: '10px 14px', border: '1px solid var(--line-2)', background: '#050505',
              fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {stmtArs > 0 && (
                <div style={{ marginBottom: stmtUsd > 0 ? 4 : 0 }}>
                  −{fmt(stmtArs).intStr}<span style={{ color: 'var(--ink-4)' }}>.{fmt(stmtArs).centStr}</span>
                  <span style={{ fontSize: 9, letterSpacing: '0.14em', marginLeft: 8, color: 'var(--ink-4)' }}>ARS · AÚN SIN PAGAR</span>
                </div>
              )}
              {stmtUsd > 0 && (
                <div>
                  −{fmt(stmtUsd).intStr}<span style={{ color: 'var(--ink-4)' }}>.{fmt(stmtUsd).centStr}</span>
                  <span style={{ fontSize: 9, letterSpacing: '0.14em', marginLeft: 8, color: 'var(--ink-4)' }}>USD · AÚN SIN PAGAR</span>
                </div>
              )}
            </div>
          </>
        )}

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
                {busy ? 'CERRANDO...' : 'CONFIRM · CERRAR RESUMEN'}
              </span>
            </span>
          </button>

          <button
            onClick={onClose}
            disabled={busy}
            style={{
              background: 'transparent', border: '1px solid var(--line-2)',
              color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11,
              letterSpacing: '0.18em', padding: '14px 18px', cursor: 'pointer',
              width: '100%', opacity: busy ? 0.6 : 1,
            }}
          >
            SKIP · RECORDAR DESPUÉS
          </button>
        </div>

        <div style={{ height: 12 }} />
      </div>
    </div>
  )
}
