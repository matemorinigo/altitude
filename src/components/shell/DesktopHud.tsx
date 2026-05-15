import { useEffect, useState } from 'react'
import { toZonedTime, format as tzFormat } from 'date-fns-tz'
import type { TabId } from './TabBar'

const TZ = 'America/Argentina/Buenos_Aires'
const TAB_FLT: Record<TabId, string> = {
  dash: 'DASHBOARD', hangar: 'HANGAR', log: 'LEDGER', sys: 'SYSTEM',
}

export function DesktopHud({ tab }: { tab: TabId }) {
  const [time, setTime] = useState(() => getTime())

  useEffect(() => {
    const id = setInterval(() => setTime(getTime()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 18px',
      borderBottom: '1px solid var(--line-2)',
      background: 'linear-gradient(180deg, #0a0a0a, #050505)',
      fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em',
      color: 'var(--ink-3)', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
        <span style={{ color: 'var(--ink)', letterSpacing: '0.22em', fontWeight: 600 }}>◆ ALTITUDE</span>
        <span style={{ color: 'var(--ink-4)' }}>v0.4.2</span>
        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 6, height: 6, display: 'inline-block', background: 'var(--grn)', boxShadow: '0 0 6px var(--grn)' }} />
          <span><span style={{ color: 'var(--ink-4)' }}>SYS </span>NOMINAL</span>
        </span>
        <span><span style={{ color: 'var(--ink-4)' }}>NET </span>ON</span>
        <span><span style={{ color: 'var(--ink-4)' }}>FLT </span>{TAB_FLT[tab]}-01</span>
      </div>
      <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
        <span><span style={{ color: 'var(--ink-4)' }}>UTC-3 </span><span className="num" style={{ color: 'var(--ink)' }}>{time}</span></span>
        <span style={{ color: 'var(--grn)' }}>● ARMED</span>
      </div>
    </div>
  )
}

function getTime() {
  return tzFormat(toZonedTime(new Date(), TZ), 'HH:mm:ss')
}
