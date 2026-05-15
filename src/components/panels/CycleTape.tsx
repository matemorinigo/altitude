interface CycleTapeProps {
  daysIn: number
  daysTotal: number
  paydayLabel: string
  daysLeft: number
}

export function CycleTape({ daysIn, daysTotal, paydayLabel, daysLeft }: CycleTapeProps) {
  const pct  = Math.min(100, Math.max(0, (daysIn / daysTotal) * 100))
  const ticks = Array.from({ length: daysTotal + 1 }, (_, i) => i)

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 6, fontFamily: 'var(--mono)',
      }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--ink-3)' }}>
          PAY CYCLE · DAY <span style={{ color: 'var(--ink)' }}>{daysIn}</span>
          <span style={{ color: 'var(--ink-4)' }}>/{daysTotal}</span>
        </div>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--amb)' }}>
          T-{String(daysLeft).padStart(2, '0')}d · {paydayLabel}
        </div>
      </div>

      <div className="tape">
        <div className="fill" style={{ width: `${pct}%` }} />
        <div className="needle" style={{ left: `calc(${pct}% - 1px)` }} />
        <div className="ticks">
          {ticks.map(i => <i key={i} className={i % 5 === 0 ? 'maj' : ''} />)}
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 4, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.08em',
      }}>
        <span>D00</span>
        <span>D10</span>
        <span>D20</span>
        <span>D{daysTotal}</span>
      </div>
    </div>
  )
}
