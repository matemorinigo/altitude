export type TabId = 'dash' | 'hangar' | 'log' | 'anly' | 'sys'

const TABS: { id: TabId; label: string; ic: string }[] = [
  { id: 'dash',   label: 'DASH',   ic: '⌖' },
  { id: 'hangar', label: 'HANGAR', ic: '▤' },
  { id: 'log',    label: 'LOG',    ic: '≡' },
  { id: 'anly',   label: 'ANLY',   ic: '▦' },
  { id: 'sys',    label: 'SYS',    ic: '⚙' },
]

interface Props {
  active: TabId
  onChange: (id: TabId) => void
}

export function TabBar({ active, onChange }: Props) {
  return (
    <div className="tabbar">
      {TABS.map(t => (
        <div
          key={t.id}
          className={`tab${active === t.id ? ' active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="ic">{t.ic}</span>
          {t.label}
        </div>
      ))}
    </div>
  )
}
