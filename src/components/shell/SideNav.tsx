import type { TabId } from './TabBar'

const ITEMS: { id: TabId; ic: string; label: string; code: string }[] = [
  { id: 'dash',   ic: '⌖', label: 'DASHBOARD', code: '01' },
  { id: 'hangar', ic: '▤', label: 'HANGAR',    code: '02' },
  { id: 'log',    ic: '≡', label: 'LEDGER',    code: '03' },
  { id: 'anly',   ic: '▦', label: 'ANALYTICS', code: '04' },
  { id: 'sys',    ic: '⚙', label: 'SYSTEM',    code: '05' },
]

interface Props {
  active: TabId
  onChange: (id: TabId) => void
}

export function SideNav({ active, onChange }: Props) {
  return (
    <div style={{
      width: 196, flexShrink: 0,
      borderRight: '1px solid var(--line-2)',
      background: '#050505',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 16px 10px',
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em',
        color: 'var(--ink-4)',
      }}>◆ NAVIGATION</div>

      {ITEMS.map(it => {
        const on = it.id === active
        return (
          <div
            key={it.id}
            onClick={() => onChange(it.id)}
            style={{
              display: 'grid', gridTemplateColumns: '28px 1fr auto',
              alignItems: 'center', gap: 10,
              padding: '12px 16px',
              borderLeft: on ? '2px solid var(--grn)' : '2px solid transparent',
              background: on ? 'rgba(0,255,65,0.04)' : 'transparent',
              cursor: 'pointer', fontFamily: 'var(--mono)',
            }}
          >
            <span style={{ fontSize: 16, color: on ? 'var(--grn)' : 'var(--ink-3)' }}>{it.ic}</span>
            <span style={{ fontSize: 11.5, letterSpacing: '0.18em', color: on ? 'var(--grn)' : 'var(--ink-2)' }}>{it.label}</span>
            <span style={{ fontSize: 9, letterSpacing: '0.14em', color: on ? 'var(--grn-dim)' : 'var(--ink-4)' }}>{it.code}</span>
          </div>
        )
      })}

      <div style={{ flex: 1 }} />
      <div style={{
        margin: 12, border: '1px solid var(--line)', padding: '10px 12px',
        fontFamily: 'var(--mono)', position: 'relative',
      }}>
        <span className="brackets"><i /></span>
        <div style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--ink-4)' }}>◆ SESSION</div>
        <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 6, letterSpacing: '0.08em' }}>ALTITUDE · APP</div>
        <div style={{ marginTop: 8, fontSize: 9, letterSpacing: '0.16em', color: 'var(--grn)' }}>● ENCRYPTED</div>
      </div>
    </div>
  )
}
