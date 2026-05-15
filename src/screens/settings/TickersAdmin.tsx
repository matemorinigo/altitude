import { useState } from 'react'
import { SectionLabel } from '../../components/shell/SectionLabel'
import { useTickers, useAddTicker, useArchiveTicker, useUpdateTickerQty } from '../../hooks/useTickers'
import type { InstrumentKind } from '../../types/db'

interface Props {
  onBack: () => void
}

const INSTRUMENT_KINDS: InstrumentKind[] = ['CEDEAR', 'STOCK_AR', 'BOND_AR', 'NOTE_AR', 'CORP_AR', 'STOCK_USA', 'ADR_USA']

const inputStyle: React.CSSProperties = {
  background: '#050505', border: '1px solid var(--line-2)',
  color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12,
  letterSpacing: '0.04em', padding: '10px 12px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

export function TickersAdmin({ onBack }: Props) {
  const { data: tickers = [], isLoading } = useTickers()
  const addTicker     = useAddTicker()
  const archiveTicker = useArchiveTicker()
  const updateQty     = useUpdateTickerQty()

  const [showForm, setShowForm]     = useState(false)
  const [symbol, setSymbol]         = useState('')
  const [quantity, setQuantity]     = useState('')
  const [kind, setKind]             = useState<InstrumentKind>('CEDEAR')
  const [assetClass, setAssetClass] = useState('')
  const [avgCostStr, setAvgCostStr] = useState('')
  const [editId, setEditId]         = useState<string | null>(null)
  const [editQty, setEditQty]       = useState('')
  const [err, setErr]               = useState('')

  const handleAdd = async () => {
    if (!symbol.trim()) { setErr('SYMBOL REQUIRED'); return }
    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty < 0) { setErr('INVALID QUANTITY'); return }
    const avgCost = avgCostStr !== '' ? parseFloat(avgCostStr) : null
    if (avgCost !== null && (isNaN(avgCost) || avgCost < 0)) { setErr('INVALID AVG COST'); return }
    setErr('')
    try {
      await addTicker.mutateAsync({ symbol, quantity: qty, instrument_kind: kind, asset_class: assetClass, avg_cost: avgCost })
      setSymbol(''); setQuantity(''); setAssetClass(''); setAvgCostStr(''); setShowForm(false)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'ERROR')
    }
  }

  const handleUpdateQty = async (id: string) => {
    const qty = parseFloat(editQty)
    if (isNaN(qty) || qty < 0) return
    await updateQty.mutateAsync({ id, quantity: qty })
    setEditId(null)
    setEditQty('')
  }

  return (
    <div className="scroll" style={{ padding: '0 14px 20px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
      }}>
        <span onClick={onBack} style={{ color: 'var(--amb)', cursor: 'pointer' }}>← BACK</span>
        <span style={{ color: 'var(--ink-3)' }}>TICKERS · ADMIN</span>
      </div>

      <SectionLabel right={`${tickers.length} HELD`}>PORTFOLIO</SectionLabel>

      {isLoading && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          LOADING...
        </div>
      )}

      {tickers.map(t => (
        <div key={t.id} className="row" style={{ gridTemplateColumns: '50px 1fr auto auto', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--grn)', letterSpacing: '0.04em' }}>
            {t.symbol}
          </span>
          <div>
            <div className="name" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
              {t.asset_class ?? t.instrument_kind}
              {t.avg_cost != null && (
                <span style={{ fontSize: 9.5, color: 'var(--ink-4)', marginLeft: 8, letterSpacing: '0.08em' }}>
                  Ø {t.avg_cost.toFixed(2)}
                </span>
              )}
            </div>
            {editId === t.id ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <input
                  value={editQty}
                  onChange={e => setEditQty(e.target.value)}
                  placeholder="QTY"
                  style={{ ...inputStyle, width: 100, padding: '4px 8px', fontSize: 11 }}
                  autoFocus
                />
                <span
                  onClick={() => handleUpdateQty(t.id)}
                  style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--grn)', cursor: 'pointer', letterSpacing: '0.1em' }}
                >
                  OK
                </span>
                <span
                  onClick={() => { setEditId(null); setEditQty('') }}
                  style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', cursor: 'pointer', letterSpacing: '0.1em' }}
                >
                  ESC
                </span>
              </div>
            ) : (
              <div className="sub" style={{ cursor: 'pointer' }} onClick={() => { setEditId(t.id); setEditQty(String(t.quantity)) }}>
                QTY {t.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })} · EDIT
              </div>
            )}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em', textAlign: 'right' }}>
            {t.last_price != null
              ? `${t.last_price_currency} ${t.last_price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
              : '—'
            }
          </div>
          <div
            onClick={() => archiveTicker.mutate(t.id)}
            style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', cursor: 'pointer', letterSpacing: '0.1em', paddingLeft: 12 }}
          >
            ARCH
          </div>
        </div>
      ))}

      {tickers.length === 0 && !isLoading && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          NO TICKERS
        </div>
      )}

      <SectionLabel right="NEW">AGREGAR TICKER</SectionLabel>

      {!showForm ? (
        <button className="btn-trigger" onClick={() => setShowForm(true)} style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: 11, letterSpacing: '0.22em' }}>+ ADD TICKER</span>
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="SYMBOL (GGAL, AL30...)"
            style={inputStyle}
            maxLength={12}
          />
          <input
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="QUANTITY"
            type="number"
            min="0"
            style={inputStyle}
          />
          <input
            value={assetClass}
            onChange={e => setAssetClass(e.target.value.toUpperCase())}
            placeholder="ASSET CLASS (CEDEAR · TECH)"
            style={inputStyle}
          />
          <input
            value={avgCostStr}
            onChange={e => setAvgCostStr(e.target.value)}
            placeholder="COSTO PROMEDIO (opcional)"
            type="number"
            min="0"
            step="any"
            style={inputStyle}
          />

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {INSTRUMENT_KINDS.map(k => (
              <div key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
                {k}
              </div>
            ))}
          </div>

          {err && (
            <div style={{ border: '1px solid var(--red)', color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 10, padding: '8px 12px', letterSpacing: '0.14em' }}>
              ✕ {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-trigger" onClick={handleAdd} disabled={addTicker.isPending} style={{ padding: '12px 18px' }}>
              <span style={{ fontSize: 11, letterSpacing: '0.22em' }}>{addTicker.isPending ? 'SAVING...' : '▶ CONFIRM'}</span>
            </button>
            <button
              onClick={() => { setShowForm(false); setErr('') }}
              style={{
                background: 'transparent', border: '1px solid var(--line-2)',
                color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11,
                letterSpacing: '0.18em', padding: '12px 18px', cursor: 'pointer',
              }}
            >
              ESC
            </button>
          </div>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}
