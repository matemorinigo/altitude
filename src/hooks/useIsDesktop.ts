import { useState, useEffect } from 'react'

const BREAKPOINT = 1025

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= BREAKPOINT)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${BREAKPOINT}px)`)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDesktop
}
