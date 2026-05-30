import { useMemo, useState } from 'react'
import { TxRow } from '../components/rows/TxRow'
import { TelemetryBar } from '../components/primitives/TelemetryBar'
import { useAccountTransactions } from '../hooks/useTransactions'
import { fmt } from '../lib/format'
import type { Account } from '../types/db'

interface Props {
  account: Account
  cycleFrom: Date
  accounts: Account[]
  onBack: () => void
  onTransfer: (account: Account) => void
}

type TxFilter = 'ALL' | 'IN' | 'OUT'

function Sparkline({ values, color = 'var(--grn)', dimColor = 'var(--grn-dim)' }: {
  values: number[]
  color?: string
  dimColor?: string
}) {
  if (values.length < 2) return null
  const w = 320
  const h = 56
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const stepX = w / (values.length - 1)
  const pts = values.map((v, i) => {
    const x = i * stepX
    const y = h - ((v - min) / range) * (h - 8) - 4
    return `${x},${y}`
  })
  const polyline = pts.join(' ')
  const area = `${pts[0]} ${pts.join(' ')} ${w},${h} 0,${h}`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: 56, display: 'block' }}
    >
      <polygon points={area} fill={dimColor} opacity={0.15} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={1.5} />
      {/* current value dot */}
      <circle
        cx={w}
        cy={parseFloat(pts[pts.length - 1].split(',')[1])}
        r={3}
        fill={color}
      />
    </svg>
  )
}

export function AccountDetail({ account, cycleFrom, accounts, onBack, onTransfer }: Props) {
  const [filter, setFilter] = useState<TxFilter>('ALL')
  const { data: txs = [], isLoading } = useAccountTransactions(account.id)

  const isPositive = account.currency === 'ARS'
    ? true
    : true // USD is always positive color-wise for balance
  const balColor = (account.balance ?? 0) >= 0 ? 'var(--grn)' : 'var(--red)'

  // Cycle stats (from cycleFrom)
  const cycleTxs = useMemo(() =>
    txs.filter(t => new Date(t.occurred_at) >= cycleFrom),
    [txs, cycleFrom]
  )
  const cycleIn  = cycleTxs.filter(t => t.kind === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const cycleOut = cycleTxs.filter(t => t.kind === 'EXPENSE' || t.kind === 'CARD_PAYMENT').reduce((s, t) => s + t.amount, 0)
  const cycleNet = cycleIn - cycleOut

  // 30-day sparkline — reverse-engineer daily balances from current balance + transactions
  const sparkValues = useMemo(() => {
    const now = new Date()
    const days: number[] = []
    // Walk back 30 days: start from current balance and subtract/add txs
    let runningBalance = account.balance ?? 0
    const txsSorted = [...txs].sort((a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    )
    let txIdx = 0
    for (let d = 0; d < 30; d++) {
      const dayEnd = new Date(now)
      dayEnd.setDate(dayEnd.getDate() - d)
      dayEnd.setHours(23, 59, 59, 999)
      const dayStart = new Date(dayEnd)
      dayStart.setHours(0, 0, 0, 0)

      // Push transactions that happened after this day's end (they haven't "happened" yet going backwards)
      while (txIdx < txsSorted.length && new Date(txsSorted[txIdx].occurred_at) > dayEnd) {
        const t = txsSorted[txIdx]
        // Reverse the effect: if it was income, subtract it; if expense, add it back
        if (t.kind === 'INCOME') runningBalance -= t.amount
        else if (t.kind === 'EXPENSE' || t.kind === 'CARD_PAYMENT') runningBalance += t.amount
        txIdx++
      }

      days.unshift(runningBalance)
    }
    return days
  }, [txs, account.balance])

  // Category breakdown (expenses only)
  const catBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    txs.filter(t => t.kind === 'EXPENSE' || t.kind === 'CARD_PAYMENT').forEach(t => {
      map[t.category] = (map[t.category] ?? 0) + t.amount
    })
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, val]) => ({ cat, val, pct: Math.round((val / total) * 100) }))
  }, [txs])

  // Filtered tx list
  const filteredTxs = useMemo(() => {
    if (filter === 'IN')  return txs.filter(t => t.kind === 'INCOME')
    if (filter === 'OUT') return txs.filter(t => t.kind === 'EXPENSE' || t.kind === 'CARD_PAYMENT')
    return txs
  }, [txs, filter])

  const { intStr, centStr } = fmt(account.balance ?? 0)
  const now = new Date()
  const syncTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const acctColor = (account.balance ?? 0) >= 0 ? 'var(--grn)' : 'var(--red)'
  void isPositive // suppress unused warning

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
          <span
            onClick={onBack}
            style={{ color: 'var(--amb)', cursor: 'pointer', userSelect: 'none' }}
          >
            ← BACK
          </span>
          <span style={{ color: 'var(--ink-4)' }}>DASH</span>
          <span style={{ color: 'var(--ink-4)' }}>›</span>
          <span style={{ color: 'var(--grn)' }}>ACCT · {account.code}</span>
        </div>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.16em',
          color: 'var(--ink-3)',
        }}>
          SYNC · {syncTime}
        </span>
      </div>

      {/* Identity strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 14px 12px',
        borderBottom: '1px solid var(--line-2)',
        background: 'linear-gradient(180deg, rgba(0,255,65,0.03), transparent)',
      }}>
        <div style={{
          width: 44, height: 44, flexShrink: 0,
          border: `1px solid ${acctColor}`, background: '#001a08',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: 14, color: acctColor,
          boxShadow: `0 0 10px rgba(0,255,65,0.12)`,
        }}>
          {account.code}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 15, color: 'var(--ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {account.name}
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em',
            color: 'var(--ink-3)', marginTop: 3,
          }}>
            {account.type} · {account.currency} · <span style={{ color: 'var(--grn)' }}>ACTIVE</span>
          </div>
        </div>
        {account.alias && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-4)' }}>ALIAS</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.08em', color: 'var(--ink-2)', marginTop: 2, maxWidth: 120, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {account.alias}
            </div>
          </div>
        )}
      </div>

      {/* Balance readout */}
      <div style={{ padding: '16px 14px 12px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 6 }}>
          DISPONIBLE
        </div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 44, letterSpacing: '-0.02em',
          color: balColor, fontVariantNumeric: 'tabular-nums',
          display: 'flex', alignItems: 'baseline', gap: 4,
        }}>
          <span style={{ fontSize: 20, color: 'var(--ink-4)' }}>{account.currency === 'USD' ? 'U$S' : '$'}</span>
          <span>{intStr}</span>
          <span style={{ fontSize: 22, color: 'var(--ink-4)' }}>.{centStr}</span>
        </div>

        {/* Cycle tiles */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          marginTop: 14, border: '1px solid var(--line-2)',
        }}>
          {[
            { l: 'IN', v: fmt(cycleIn).intStr, c: 'var(--grn)', pre: '+' },
            { l: 'OUT', v: fmt(cycleOut).intStr, c: 'var(--amb)', pre: '−' },
            { l: 'NET', v: fmt(Math.abs(cycleNet)).intStr, c: cycleNet >= 0 ? 'var(--grn)' : 'var(--red)', pre: cycleNet >= 0 ? '+' : '−' },
          ].map((tile, i) => (
            <div key={i} style={{
              padding: '10px 12px',
              borderRight: i < 2 ? '1px solid var(--line-2)' : 0,
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 4 }}>
                {tile.l}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: tile.c, fontVariantNumeric: 'tabular-nums' }}>
                {tile.pre}{tile.v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sparkline */}
      {sparkValues.length >= 2 && (
        <div style={{ padding: '0 14px 4px', borderBottom: '1px solid var(--line-2)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 6 }}>
            BALANCE · 30D
          </div>
          <Sparkline values={sparkValues} color={acctColor} dimColor={acctColor === 'var(--grn)' ? 'var(--grn-dim)' : 'rgba(255,48,48,0.3)'} />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-4)',
            marginTop: 4,
          }}>
            <span>−30D</span>
            <span>HOY</span>
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

      {/* Tx filter + list */}
      <div style={{ padding: '12px 14px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)' }}>
            ◆ MOVIMIENTOS
          </div>
          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--line-2)' }}>
            {(['ALL', 'IN', 'OUT'] as TxFilter[]).map((f, i) => (
              <div
                key={f}
                className={`chip ${filter === f ? 'on' : ''}`}
                onClick={() => setFilter(f)}
                style={{
                  borderWidth: 0,
                  borderRight: i < 2 ? '1px solid var(--line-2)' : 0,
                  padding: '4px 10px',
                }}
              >
                {f}
              </div>
            ))}
          </div>
        </div>

        {isLoading && <TelemetryBar />}

        {!isLoading && filteredTxs.length === 0 && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
            NO TRANSACTIONS
          </div>
        )}

        {filteredTxs.length > 0 && (
          <div className="panel tight" style={{ marginBottom: 14 }}>
            <span className="brackets"><i /></span>
            {filteredTxs.map((t, i) => (
              <TxRow
                key={t.id}
                tx={t}
                acctCode={t.accounts?.code ?? t.credit_cards?.code}
                isCard={!!t.credit_cards?.code}
                last={i === filteredTxs.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* DATOS DE CUENTA */}
      <div style={{ padding: '0 14px', borderTop: '1px solid var(--line-2)', marginTop: 4 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', padding: '12px 0 8px' }}>
          ◆ DATOS DE CUENTA
        </div>
        {[
          ['ALIAS', account.alias || '—'],
          ['TIPO',  `${account.type} · ${account.currency}`],
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

      {/* Transfer CTA */}
      {accounts.filter(a => a.id !== account.id).length > 0 && (
        <div style={{ padding: '14px 14px 4px' }}>
          <button
            className="btn-trigger"
            onClick={() => onTransfer(account)}
            style={{ padding: '18px' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{
                width: 26, height: 26, border: '1px solid var(--grn)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontSize: 14,
              }}>⇄</span>
              <span style={{ fontSize: 13, letterSpacing: '0.22em' }}>TRANSFER ›</span>
            </span>
            <span className="num" style={{ fontSize: 9, color: 'var(--ink-3)' }}>F1</span>
          </button>
        </div>
      )}
    </div>
  )
}
