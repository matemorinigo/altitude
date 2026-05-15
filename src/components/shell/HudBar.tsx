import { useEffect, useState } from 'react'
import { toZonedTime, format as tzFormat } from 'date-fns-tz'

const TZ = 'America/Argentina/Buenos_Aires'

export function HudBar({ net = true }: { net?: boolean }) {
  const [time, setTime] = useState(() => getTime())

  useEffect(() => {
    const id = setInterval(() => setTime(getTime()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="hud-bar">
      <div className="left">
        <span><span className="dot" /></span>
        <span><span className="lbl">SYS</span><span className="seg">NOMINAL</span></span>
        <span><span className="lbl">NET</span><span className="seg">{net ? 'ON' : 'OFF'}</span></span>
      </div>
      <div className="right">
        <span><span className="lbl">UTC-3</span><span className="seg num">{time}</span></span>
      </div>
    </div>
  )
}

function getTime() {
  return tzFormat(toZonedTime(new Date(), TZ), 'HH:mm:ss')
}
