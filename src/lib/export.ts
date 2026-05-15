import type { Transaction } from '../types/db'

interface TxWithRefs extends Transaction {
  accounts?:      { code: string } | null
  credit_cards?:  { code: string } | null
}

function escCsv(v: string | number | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function exportLedgerCsv(txs: TxWithRefs[]) {
  const headers = ['DATE', 'TIME', 'KIND', 'CATEGORY', 'DESCRIPTION', 'AMOUNT', 'CURRENCY', 'ACCOUNT', 'CARD']
  const rows = txs.map(t => {
    const d = new Date(t.occurred_at)
    const date = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
    const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    const signed = ['INCOME'].includes(t.kind) ? t.amount : -t.amount
    return [
      date,
      time,
      t.kind,
      t.category,
      t.description ?? '',
      signed.toFixed(2),
      t.currency,
      t.accounts?.code ?? '',
      t.credit_cards?.code ?? '',
    ].map(escCsv).join(',')
  })

  const csv  = [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `altitude-ledger-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
