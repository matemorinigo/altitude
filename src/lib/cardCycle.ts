import { isoDate } from './time'
import type { CreditCard } from '../types/db'

export function needsStatementClose(card: CreditCard, today: Date): boolean {
  if ((card.current_debt_ars ?? 0) <= 0 && (card.current_debt_usd ?? 0) <= 0) return false
  const closeThisMonth = new Date(today.getFullYear(), today.getMonth(), card.close_day)
  if (today < closeThisMonth) return false
  if (!card.last_closed_at) return true
  const [y, m, d] = card.last_closed_at.split('-').map(Number)
  const lastClosed = new Date(y, m - 1, d)
  return lastClosed < closeThisMonth
}

// Fecha de cierre de ESTE mes si ya pasó y el usuario aún no la confirmó; si no, null.
// A diferencia de needsStatementClose NO exige deuda > 0: con deuda 0 el prompt de
// cierre todavía no existe, pero postear una cuota con due >= cierre lo dispararía
// y la cuota quedaría barrida al resumen equivocado.
export function pendingCloseDate(card: CreditCard, today: Date): string | null {
  const closeThisMonth = new Date(today.getFullYear(), today.getMonth(), card.close_day)
  if (today < closeThisMonth) return null
  const c = isoDate(closeThisMonth)
  if (card.last_closed_at && card.last_closed_at >= c) return null
  return c
}
