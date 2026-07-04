import type { Transaction } from '../types/db'

export const NON_SPEND_CATEGORIES: readonly string[] = ['TRANSFER', 'INVEST', 'INVESTMENT']

type TxLike = Pick<Transaction, 'kind' | 'category'>

export function isSpendTx(t: TxLike): boolean {
  return t.kind === 'EXPENSE' && !NON_SPEND_CATEGORIES.includes(t.category)
}

export function isCashOutTx(t: TxLike): boolean {
  return (t.kind === 'EXPENSE' || t.kind === 'CARD_PAYMENT') && !NON_SPEND_CATEGORIES.includes(t.category)
}

export function isIncomeTx(t: TxLike): boolean {
  return t.kind === 'INCOME' && !NON_SPEND_CATEGORIES.includes(t.category)
}
