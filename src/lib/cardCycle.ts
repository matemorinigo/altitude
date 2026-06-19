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
