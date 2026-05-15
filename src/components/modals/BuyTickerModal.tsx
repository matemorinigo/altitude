import { useState } from 'react'
import { SectionLabel } from '../shell/SectionLabel'
import { useBuyTicker, useSellTicker } from '../../hooks/useTickers'
import { useToast } from '../../context/ToastContext'
import { fmt } from '../../lib/format'
import type { Ticker, Account } from '../../types/db'

type Mode = 'BUY' | 'SELL'

interface Props {
  ticker: Ticker
  accounts: Account[]
  onClose: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#050505', border: '1px solid var(--line-2)',
  color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 20,
  letterSpacing: '0.04em', padding: '12px 14px', outline: 'none',
}

export function OperateTickerModal({ ticker, accounts, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('BUY')

  // buy state
  const [buyQty,   setBuyQty]   = useState('')
  const [buyPrice, setBuyPrice] = useState(
    ticker.last_price != null ? String(ticker.last_price) : ''
  )
  const [buyAcct,  setBuyAcct]  = useState(accounts[0]?.id ?? '')

  // sell state
  const [sellQty,     setSellQty]     = useState('')
  const [sellPrice,   setSellPrice]   = useState(
    ticker.last_price != null ? String(ticker.last_price) : ''
  )
  const [doCredit,    setDoCredit]    = useState(true)
  const [sellAcct,    setSellAcct]    = useState(accounts[0]?.id ?? '')

  const [err, setErr] = useState('')

  const buy  = useBuyTicker()
  const sell = useSellTicker()
  const toast = useToast()

  const isPending = buy.isPending || sell.isPending

  // buy calcs
  const addQty       = parseFloat(buyQty)   || 0
  const buyPriceNum  = parseFloat(buyPrice) || 0
  const buyTotal     = addQty * buyPriceNum
  const oldAvg       = ticker.avg_cost ?? 0
  const newBuyQty    = ticker.quantity + addQty
  const newAvg       = addQty > 0 && buyPriceNum > 0
    ? (ticker.quantity * oldAvg + addQty * buyPriceNum) / newBuyQty
    : oldAvg

  // sell calcs
  const sellQtyNum   = parseFloat(sellQty)   || 0
  const sellPriceNum = parseFloat(sellPrice) || 0
  const sellTotal    = sellQtyNum * sellPriceNum
  const pnl          = ticker.avg_cost != null && sellPriceNum > 0 && sellQtyNum > 0
    ? (sellPriceNum - ticker.avg_cost) * sellQtyNum
    : null
  const pnlPct       = ticker.avg_cost != null && ticker.avg_cost > 0 && sellPriceNum > 0
    ? ((sellPriceNum - ticker.avg_cost) / ticker.avg_cost) * 100
    : null

  const switchMode = (m: Mode) => { setMode(m); setErr('') }

  const handleConfirm = async () => {
    setErr('')
    if (mode === 'BUY') {
      if (addQty <= 0)       { setErr('CANTIDAD REQUERIDA'); return }
      if (buyPriceNum <= 0)  { setErr('PRECIO REQUERIDO'); return }
      if (!buyAcct)          { setErr('SELECCIONÁ UNA CUENTA'); return }
      try {
        await buy.mutateAsync({ ticker, addQty, pricePerUnit: buyPriceNum, accountId: buyAcct })
        toast(`BUY ${ticker.symbol} × ${addQty} · OK`, 'success')
        onClose()
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : 'ERROR')
      }
    } else {
      if (sellQtyNum <= 0)              { setErr('CANTIDAD REQUERIDA'); return }
      if (sellQtyNum > ticker.quantity) { setErr(`MAX ${ticker.quantity}`); return }
      if (sellPriceNum <= 0)            { setErr('PRECIO REQUERIDO'); return }
      if (doCredit && !sellAcct)        { setErr('SELECCIONÁ UNA CUENTA'); return }
      try {
        await sell.mutateAsync({
          ticker,
          sellQty: sellQtyNum,
          pricePerUnit: sellPriceNum,
          creditAccountId: doCredit ? sellAcct : null,
        })
        toast(`SELL ${ticker.symbol} × ${sellQtyNum} · OK`, 'success')
        onClose()
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : 'ERROR')
      }
    }
  }

  const cur = ticker.last_price_currency ?? 'ARS'

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(0,0,0,0.94)',
      backdropFilter: 'blur(4px)',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: `1px solid ${mode === 'BUY' ? 'var(--grn)' : 'var(--amb)'}`,
        borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
        color: mode === 'BUY' ? 'var(--grn)' : 'var(--amb)',
        background: mode === 'BUY' ? 'rgba(0,255,65,0.04)' : 'rgba(255,176,0,0.04)',
        flexShrink: 0, transition: 'all 0.12s',
      }}>
        <span>◆ OPERAR · {ticker.symbol} <span className="blink">_</span></span>
        <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--ink-3)' }}>ESC</span>
      </div>

      {/* Mode toggle */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--line)', flexShrink: 0,
      }}>
        {(['BUY', 'SELL'] as Mode[]).map(m => (
          <div
            key={m}
            onClick={() => switchMode(m)}
            style={{
              flex: 1, padding: '12px 0', textAlign: 'center',
              fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.22em',
              cursor: 'pointer',
              color: mode === m
                ? (m === 'BUY' ? 'var(--grn)' : 'var(--amb)')
                : 'var(--ink-4)',
              borderBottom: mode === m
                ? `2px solid ${m === 'BUY' ? 'var(--grn)' : 'var(--amb)'}`
                : '2px solid transparent',
              background: mode === m
                ? (m === 'BUY' ? 'rgba(0,255,65,0.03)' : 'rgba(255,176,0,0.03)')
                : 'transparent',
              transition: 'all 0.1s',
            }}
          >
            {m === 'BUY' ? '▶ COMPRA' : '◀ VENTA'}
          </div>
        ))}
      </div>

      <div className="scroll" style={{ padding: '0 14px 14px' }}>
        {/* Ticker info strip */}
        <div style={{
          marginTop: 14, padding: '10px 14px',
          border: `1px solid ${mode === 'BUY' ? 'var(--line)' : 'var(--line)'}`,
          background: '#050505', fontFamily: 'var(--mono)',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0,
        }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 4 }}>TICKER</div>
            <div style={{ fontSize: 16, color: 'var(--grn)', letterSpacing: '0.06em' }}>{ticker.symbol}</div>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 2, letterSpacing: '0.1em' }}>
              {ticker.asset_class ?? ticker.instrument_kind}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 4 }}>POS ACTUAL</div>
            <div style={{ fontSize: 15, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {ticker.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
            </div>
            {ticker.avg_cost != null && (
              <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 2, letterSpacing: '0.08em' }}>
                Ø {ticker.avg_cost.toFixed(2)}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 4 }}>PX MKT</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
              {ticker.last_price != null ? `${ticker.last_price.toFixed(2)}` : '—'}
            </div>
            {ticker.last_price != null && (
              <div style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 2 }}>{cur}</div>
            )}
          </div>
        </div>

        {/* ── BUY MODE ── */}
        {mode === 'BUY' && (
          <>
            <SectionLabel right="COMPRAR">CANTIDAD</SectionLabel>
            <input
              value={buyQty}
              onChange={e => setBuyQty(e.target.value)}
              placeholder="0"
              type="number" min="0" step="any"
              style={inputStyle}
              autoFocus
            />

            <SectionLabel right="POR UNIDAD">PRECIO</SectionLabel>
            <input
              value={buyPrice}
              onChange={e => setBuyPrice(e.target.value)}
              placeholder="0.00"
              type="number" min="0" step="any"
              style={inputStyle}
            />

            {addQty > 0 && buyPriceNum > 0 && (
              <div style={{
                marginTop: 10, padding: '10px 14px',
                border: '1px solid var(--line-2)', background: '#030303',
                fontFamily: 'var(--mono)',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 3 }}>TOTAL</div>
                  <div style={{ fontSize: 18, color: 'var(--amb)', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontSize: 10, color: 'var(--ink-3)', marginRight: 4 }}>{cur}</span>
                    {fmt(buyTotal).intStr}
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>.{fmt(buyTotal).centStr}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 3 }}>NUEVO COSTO PROM</div>
                  <div style={{ fontSize: 14, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
                    {newAvg.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 2 }}>
                    POS {newBuyQty.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                  </div>
                </div>
              </div>
            )}

            <SectionLabel right="DÉBITO">CUENTA</SectionLabel>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {accounts.map(a => (
                <div key={a.id} className={`chip ${buyAcct === a.id ? 'on' : ''}`} onClick={() => setBuyAcct(a.id)}>
                  {a.code}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── SELL MODE ── */}
        {mode === 'SELL' && (
          <>
            <SectionLabel right={`MAX ${ticker.quantity}`}>CANTIDAD A VENDER</SectionLabel>
            <input
              value={sellQty}
              onChange={e => setSellQty(e.target.value)}
              placeholder="0"
              type="number" min="0" step="any"
              style={{ ...inputStyle, borderColor: 'var(--line-2)' }}
              autoFocus
            />

            <SectionLabel right="DE VENTA">PRECIO UNITARIO</SectionLabel>
            <input
              value={sellPrice}
              onChange={e => setSellPrice(e.target.value)}
              placeholder="0.00"
              type="number" min="0" step="any"
              style={inputStyle}
            />

            {sellQtyNum > 0 && sellPriceNum > 0 && (
              <div style={{
                marginTop: 10, padding: '10px 14px',
                border: `1px solid ${pnl != null && pnl >= 0 ? 'var(--grn-dim)' : pnl != null ? 'var(--red)' : 'var(--line-2)'}`,
                background: '#030303', fontFamily: 'var(--mono)',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 3 }}>TOTAL VENTA</div>
                  <div style={{ fontSize: 18, color: 'var(--amb)', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontSize: 10, color: 'var(--ink-3)', marginRight: 4 }}>{cur}</span>
                    {fmt(sellTotal).intStr}
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>.{fmt(sellTotal).centStr}</span>
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 2 }}>
                    POS RESTANTE {Math.max(0, ticker.quantity - sellQtyNum).toLocaleString('en-US', { maximumFractionDigits: 4 })}
                  </div>
                </div>
                {pnl != null && (
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 3 }}>P&L REALIZADO</div>
                    <div style={{
                      fontSize: 18,
                      color: pnl >= 0 ? 'var(--grn)' : 'var(--red)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {pnl >= 0 ? '+' : ''}{fmt(Math.abs(pnl)).intStr}
                      <span style={{ fontSize: 12, color: pnl >= 0 ? 'var(--grn-dim)' : 'var(--red)' }}>
                        .{fmt(Math.abs(pnl)).centStr}
                      </span>
                    </div>
                    {pnlPct != null && (
                      <div style={{
                        fontSize: 9, marginTop: 2, letterSpacing: '0.1em',
                        color: pnlPct >= 0 ? 'var(--grn-dim)' : 'var(--red)',
                      }}>
                        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <SectionLabel right="ACREDITAR">DESTINO</SectionLabel>
            <div style={{ display: 'flex', gap: 6 }}>
              <div
                className={`chip ${doCredit ? 'on' : ''}`}
                onClick={() => setDoCredit(true)}
              >
                EN CUENTA
              </div>
              <div
                className={`chip ${!doCredit ? 'on' : ''}`}
                onClick={() => setDoCredit(false)}
              >
                SIN ACREDITAR
              </div>
            </div>

            {doCredit && (
              <>
                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {accounts.map(a => (
                    <div key={a.id} className={`chip ${sellAcct === a.id ? 'on' : ''}`} onClick={() => setSellAcct(a.id)}>
                      {a.code}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {err && (
          <div style={{
            marginTop: 12, border: '1px solid var(--red)', color: 'var(--red)',
            fontFamily: 'var(--mono)', fontSize: 10, padding: '8px 12px', letterSpacing: '0.14em',
          }}>
            ✕ {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            className={`btn-trigger${mode === 'SELL' ? ' amber' : ''}`}
            onClick={handleConfirm}
            disabled={isPending}
            style={{ padding: '14px 18px' }}
          >
            <span style={{ fontSize: 11, letterSpacing: '0.22em' }}>
              {isPending
                ? 'PROCESANDO...'
                : mode === 'BUY'
                  ? `▶ COMPRAR ${ticker.symbol}`
                  : `◀ VENDER ${ticker.symbol}`
              }
            </span>
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid var(--line-2)',
              color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11,
              letterSpacing: '0.18em', padding: '14px 18px', cursor: 'pointer',
            }}
          >
            ESC
          </button>
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}
