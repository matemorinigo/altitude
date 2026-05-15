import { fmt } from '../../lib/format'

interface BreakdownItem {
  label: string
  value: string
  color?: string
  op?: string
}

interface AltimeterProps {
  value: number
  breakdown: BreakdownItem[]
  currency?: 'ARS' | 'USD'
  onToggleCurrency?: () => void
}

export function Altimeter({ value, breakdown, currency = 'ARS', onToggleCurrency }: AltimeterProps) {
  const { intStr, centStr, neg } = fmt(value)
  const color    = neg ? 'var(--amb)' : 'var(--grn)'
  const colorDim = neg ? 'var(--amb-dim)' : 'var(--grn-dim)'

  const step = currency === 'USD' ? 1_000 : 100_000
  const tapeVals = [2, 1, 0, -1, -2].map(d => value + d * step)
  const tapeLabel = (v: number) => `${Math.round(v / 1000)}K`

  return (
    <div className="panel" style={{ padding: 0, borderColor: 'var(--line-2)' }}>
      <span className="brackets"><i /></span>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)',
        whiteSpace: 'nowrap',
      }}>
        <span>◆ DISPONIBLE REAL</span>
        {onToggleCurrency ? (
          <button
            onClick={onToggleCurrency}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
              padding: '2px 6px', display: 'flex', gap: 6, alignItems: 'center',
            }}
          >
            <span style={{ color: currency === 'ARS' ? 'var(--grn)' : 'var(--ink-4)' }}>ARS</span>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span style={{ color: currency === 'USD' ? 'var(--grn)' : 'var(--ink-4)' }}>USD</span>
          </button>
        ) : (
          <span style={{ color }}>● PRIMARY</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px', gap: 0 }}>
        <div style={{ padding: '20px 16px 16px' }}>
          <div className="readout-cur" style={{ marginBottom: 8 }}>{currency} · LIQUID</div>
          <div className="readout-big" style={{ color }}>
            {neg && <span style={{ color: 'var(--amb)' }}>−</span>}
            <span>{intStr}</span>
            <span className="cents" style={{ color: colorDim }}>.{centStr}</span>
          </div>
        </div>

        <div style={{
          position: 'relative',
          borderLeft: '1px solid var(--line)',
          background: 'linear-gradient(180deg, #050505, #0a0a0a 50%, #050505)',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-around',
            padding: '8px 0',
            fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.04em',
          }}>
            {tapeVals.map((v, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                gap: 4, paddingRight: 6,
                color: i === 2 ? color : 'var(--ink-4)',
                fontWeight: i === 2 ? 600 : 400,
              }}>
                <span style={{ width: 6, height: 1, background: i === 2 ? color : 'var(--ink-4)' }} />
                <span>{tapeLabel(v)}</span>
              </div>
            ))}
          </div>
          <div style={{
            position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)',
            height: 18, borderTop: `1px solid ${color}`, borderBottom: `1px solid ${color}`,
            background: neg ? 'rgba(255,176,0,0.05)' : 'rgba(0,255,65,0.05)',
            pointerEvents: 'none',
          }} />
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        borderTop: '1px solid var(--line)',
        fontFamily: 'var(--mono)',
      }}>
        {breakdown.map((b, i) => (
          <div key={i} style={{
            padding: '10px 12px',
            borderRight: i < 2 ? '1px solid var(--line)' : 0,
          }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 4 }}>
              {b.label}
            </div>
            <div style={{ fontSize: 13, color: b.color ?? 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {b.op && <span style={{ color: 'var(--ink-4)', marginRight: 4 }}>{b.op}</span>}
              {b.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
