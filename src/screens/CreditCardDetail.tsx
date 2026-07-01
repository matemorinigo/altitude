import { useMemo, useState } from 'react'
import { TxRow } from '../components/rows/TxRow'
import { TelemetryBar } from '../components/primitives/TelemetryBar'
import { RectifyModal } from '../components/modals/RectifyModal'
import { useCreditCardTransactions } from '../hooks/useCreditCards'
import { useProfile } from '../hooks/useProfile'
import { fmt } from '../lib/format'
import type { CreditCard } from '../types/db'

interface Props {
  card: CreditCard
  onBack: () => void
}

export function CreditCardDetail({ card, onBack }: Props) {
  const { data: txs = [], isLoading } = useCreditCardTransactions(card.id)
  const { data: profile } = useProfile()
  const [showRectify, setShowRectify] = useState(false)

  const usdRate    = profile?.usd_rate ?? 1000
  const totalArs   = (card.current_debt_ars ?? 0) + (card.statement_debt_ars ?? 0)
  const totalUsd   = (card.current_debt_usd ?? 0) + (card.statement_debt_usd ?? 0)
  const hasUsdDebt = totalUsd > 0
  const estimatedArs = hasUsdDebt ? totalArs + totalUsd * usdRate : null

  const catBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    txs.filter(t => t.kind === 'EXPENSE').forEach(t => {
      map[t.category] = (map[t.category] ?? 0) + t.amount
    })
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, val]) => ({ cat, val, pct: Math.round((val / total) * 100) }))
  }, [txs])

  const now = new Date()
  const syncTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="scroll" style={{ padding: '0 0 20px' }}>
      {/* Sub-header strip */}
      <div style={{
        padding: '8px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--line)',
        background: '#050505',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
        }}>
          <span onClick={onBack} style={{ color: 'var(--amb)', cursor: 'pointer', userSelect: 'none' }}>
            ← BACK
          </span>
          <span style={{ color: 'var(--ink-4)' }}>DASH</span>
          <span style={{ color: 'var(--ink-4)' }}>›</span>
          <span style={{ color: 'var(--amb)' }}>CARD · {card.code}</span>
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.16em', color: 'var(--ink-3)' }}>
          SYNC · {syncTime}
        </span>
      </div>

      {/* Identity strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 14px 12px',
        borderBottom: '1px solid var(--line-2)',
      }}>
        <div style={{
          width: 44, height: 44, flexShrink: 0,
          border: '1px solid var(--amb-dim)', background: '#0a0500',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--amb)',
        }}>
          {card.code}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.name}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--ink-3)', marginTop: 3 }}>
            CIERRE {pad(card.close_day)} · VENCE {pad(card.due_day)}
          </div>
        </div>
      </div>

      {/* Debt readout — per currency */}
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--line-2)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 10 }}>
          DEUDA TOTAL
        </div>

        {/* ARS block */}
        <div style={{ marginBottom: hasUsdDebt ? 14 : 0 }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-4)', marginBottom: 4,
          }}>ARS</div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 36, letterSpacing: '-0.02em',
            color: totalArs > 0 ? 'var(--amb)' : 'var(--ink-4)', fontVariantNumeric: 'tabular-nums',
            display: 'flex', alignItems: 'baseline', gap: 4,
          }}>
            <span style={{ fontSize: 18, color: 'var(--ink-4)' }}>$</span>
            <span>{fmt(totalArs).intStr}</span>
            <span style={{ fontSize: 18, color: 'var(--ink-4)' }}>.{fmt(totalArs).centStr}</span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            marginTop: 10, border: '1px solid var(--line-2)',
          }}>
            {[
              { l: 'CORRIENTE', v: fmt(card.current_debt_ars ?? 0), c: (card.current_debt_ars ?? 0) > 0 ? 'var(--ink-2)' : 'var(--ink-4)' },
              { l: 'VENCIDA',   v: fmt(card.statement_debt_ars ?? 0), c: (card.statement_debt_ars ?? 0) > 0 ? 'var(--amb)' : 'var(--ink-4)' },
            ].map((tile, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRight: i === 0 ? '1px solid var(--line-2)' : 0 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 4 }}>{tile.l}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: tile.c, fontVariantNumeric: 'tabular-nums' }}>
                  −{tile.v.intStr}<span style={{ color: 'var(--ink-4)' }}>.{tile.v.centStr}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* USD block — only shown when there's USD debt */}
        {hasUsdDebt && (
          <div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-4)', marginBottom: 4,
            }}>USD</div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 36, letterSpacing: '-0.02em',
              color: 'var(--amb)', fontVariantNumeric: 'tabular-nums',
              display: 'flex', alignItems: 'baseline', gap: 4,
            }}>
              <span style={{ fontSize: 18, color: 'var(--ink-4)' }}>U$S</span>
              <span>{fmt(totalUsd).intStr}</span>
              <span style={{ fontSize: 18, color: 'var(--ink-4)' }}>.{fmt(totalUsd).centStr}</span>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              marginTop: 10, border: '1px solid var(--line-2)',
            }}>
              {[
                { l: 'CORRIENTE', v: fmt(card.current_debt_usd ?? 0), c: (card.current_debt_usd ?? 0) > 0 ? 'var(--ink-2)' : 'var(--ink-4)' },
                { l: 'VENCIDA',   v: fmt(card.statement_debt_usd ?? 0), c: (card.statement_debt_usd ?? 0) > 0 ? 'var(--amb)' : 'var(--ink-4)' },
              ].map((tile, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRight: i === 0 ? '1px solid var(--line-2)' : 0 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 4 }}>{tile.l}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: tile.c, fontVariantNumeric: 'tabular-nums' }}>
                    −{tile.v.intStr}<span style={{ color: 'var(--ink-4)' }}>.{tile.v.centStr}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Estimated in ARS — shown when there's any USD debt */}
      {estimatedArs !== null && (
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--line-2)',
          background: 'rgba(255,160,0,0.03)',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 8 }}>
            ◆ ESTIMADO TOTAL EN ARS
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.12em' }}>
              {fmt(totalArs).intStr} ARS +
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.12em' }}>
              {fmt(totalUsd).intStr}.{fmt(totalUsd).centStr} USD × {fmt(usdRate).intStr}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.10em' }}>=</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 20, color: 'var(--amb)', fontVariantNumeric: 'tabular-nums' }}>
              $ {fmt(estimatedArs).intStr}
              <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>.{fmt(estimatedArs).centStr}</span>
            </span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.12em', marginTop: 4 }}>
            TC: 1 USD = $ {fmt(usdRate).intStr} · MANUAL · CONFIGURAR EN SYSTEM
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {catBreakdown.length > 0 && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-2)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 10 }}>
            ◆ BREAKDOWN · EGRESOS
          </div>
          {catBreakdown.map(({ cat, val, pct }) => (
            <div key={cat} style={{ marginBottom: 8 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em',
                marginBottom: 4,
              }}>
                <span style={{ color: 'var(--ink-2)' }}>{cat}</span>
                <span style={{ color: 'var(--amb)', fontVariantNumeric: 'tabular-nums' }}>
                  −{fmt(val).intStr} <span style={{ color: 'var(--ink-4)', fontSize: 9 }}>{pct}%</span>
                </span>
              </div>
              <div style={{ height: 2, background: 'var(--line)', position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: `${pct}%`, background: 'var(--amb)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction list */}
      <div style={{ padding: '12px 14px 0' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em',
          color: 'var(--ink-4)', marginBottom: 10,
        }}>
          ◆ MOVIMIENTOS
        </div>

        {isLoading && <TelemetryBar />}

        {!isLoading && txs.length === 0 && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
            NO TRANSACTIONS
          </div>
        )}

        {txs.length > 0 && (
          <div className="panel tight" style={{ marginBottom: 14 }}>
            <span className="brackets"><i /></span>
            {txs.map((t, i) => (
              <TxRow
                key={t.id}
                tx={t}
                acctCode={t.accounts?.code ?? t.credit_cards?.code}
                isCard={!!t.credit_cards?.code}
                last={i === txs.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rectify CTA */}
      <div style={{ padding: '14px 14px 0' }}>
        <button
          className="btn-trigger"
          onClick={() => setShowRectify(true)}
          style={{ padding: '14px 18px', borderColor: 'var(--amb)' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              width: 22, height: 22, border: '1px solid var(--amb)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontSize: 11,
            }}>◆</span>
            <span style={{ fontSize: 13, letterSpacing: '0.22em', color: 'var(--amb)' }}>RECTIFICAR ›</span>
          </span>
        </button>
      </div>

      {/* Card data */}
      <div style={{ padding: '0 14px', borderTop: '1px solid var(--line-2)', marginTop: 14 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', padding: '12px 0 8px' }}>
          ◆ DATOS DE TARJETA
        </div>
        {[
          ['CIERRE',    `DÍA ${pad(card.close_day)}`],
          ['VENCE',     `DÍA ${pad(card.due_day)}`],
        ].map(([k, v]) => (
          <div key={k} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0', borderBottom: '1px solid var(--line)',
            fontFamily: 'var(--mono)', fontSize: 11,
          }}>
            <span style={{ color: 'var(--ink-4)', letterSpacing: '0.14em' }}>{k}</span>
            <span style={{ color: 'var(--ink-2)', letterSpacing: '0.06em' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Rectify modal */}
      {showRectify && (
        <RectifyModal target="card" card={card} onClose={() => setShowRectify(false)} />
      )}
    </div>
  )
}
