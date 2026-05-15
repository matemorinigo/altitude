import { useState, useRef } from 'react'
import { SectionLabel } from '../components/shell/SectionLabel'
import { TickerRow } from '../components/rows/TickerRow'
import { OperateTickerModal } from '../components/modals/BuyTickerModal'
import { useTickers, useAddTicker } from '../hooks/useTickers'
import { useAccounts } from '../hooks/useAccounts'
import { syncTickerPrices } from '../lib/data912'
import { fmt } from '../lib/format'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { useQueryClient } from '@tanstack/react-query'
import type { Ticker, InstrumentKind } from '../types/db'

type SyncState = 'idle' | 'syncing' | 'done' | 'error'

const INSTRUMENT_KINDS: InstrumentKind[] = ['CEDEAR', 'STOCK_AR', 'BOND_AR', 'NOTE_AR', 'CORP_AR', 'STOCK_USA', 'ADR_USA']

const inputStyle: React.CSSProperties = {
  background: '#050505', border: '1px solid var(--line-2)',
  color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12,
  letterSpacing: '0.04em', padding: '10px 12px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

export function Hangar() {
  const qc                     = useQueryClient()
  const { data: tickers = [] } = useTickers()
  const { data: accounts = [] } = useAccounts()
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [progress, setProgress]   = useState(0)
  const [lastSync, setLastSync]   = useState<string | null>(null)
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null)
  const isDesktop                 = useIsDesktop()

  const [buyTicker, setBuyTicker] = useState<Ticker | null>(null)

  // Add-ticker form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addSymbol, setAddSymbol]     = useState('')
  const [addQty, setAddQty]           = useState('')
  const [addKind, setAddKind]         = useState<InstrumentKind>('CEDEAR')
  const [addClass, setAddClass]       = useState('')
  const [addAvgCost, setAddAvgCost]   = useState('')
  const [addErr, setAddErr]           = useState('')
  const addTicker = useAddTicker()

  const totalUsd = tickers
    .filter(t => t.last_price != null && t.last_price_currency === 'USD')
    .reduce((s, t) => s + t.quantity * t.last_price!, 0)

  const totalArs = tickers
    .filter(t => t.last_price != null && t.last_price_currency === 'ARS')
    .reduce((s, t) => s + t.quantity * t.last_price!, 0)

  const synced = tickers.some(t => t.last_price != null)

  const handleSync = async () => {
    if (syncState === 'syncing') return
    setSyncState('syncing')
    setProgress(0)

    intervalRef.current = setInterval(() => {
      setProgress(p => {
        const next = p + 5 + Math.random() * 9
        return next >= 88 ? 88 : next
      })
    }, 120)

    try {
      await syncTickerPrices(tickers)
      clearInterval(intervalRef.current!)
      setProgress(100)
      const now = new Date()
      setLastSync(
        `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
      )
      await qc.invalidateQueries({ queryKey: ['tickers'] })
      setSyncState('done')
      setTimeout(() => { setSyncState('idle'); setProgress(0) }, 1800)
    } catch {
      clearInterval(intervalRef.current!)
      setSyncState('error')
      setTimeout(() => { setSyncState('idle'); setProgress(0) }, 3000)
    }
  }

  const handleAddTicker = async () => {
    if (!addSymbol.trim()) { setAddErr('SYMBOL REQUIRED'); return }
    const qty = parseFloat(addQty)
    if (isNaN(qty) || qty < 0) { setAddErr('INVALID QUANTITY'); return }
    setAddErr('')
    const avgCost = addAvgCost !== '' ? parseFloat(addAvgCost) : null
    if (avgCost !== null && (isNaN(avgCost) || avgCost < 0)) { setAddErr('COSTO PROMEDIO INVÁLIDO'); return }
    try {
      await addTicker.mutateAsync({ symbol: addSymbol, quantity: qty, instrument_kind: addKind, asset_class: addClass, avg_cost: avgCost })
      setAddSymbol(''); setAddQty(''); setAddClass(''); setAddAvgCost(''); setShowAddForm(false)
    } catch (e: unknown) {
      setAddErr(e instanceof Error ? e.message : 'ERROR')
    }
  }

  const isSyncing = syncState === 'syncing'
  const isError   = syncState === 'error'
  const isDone    = syncState === 'done'

  const triggerColor = isError ? 'var(--red)' : isSyncing ? 'var(--amb)' : 'var(--grn)'

  const syncButton = (
    <button
      className={`btn-trigger${isSyncing || isError ? ' amber' : ''}`}
      onClick={handleSync}
      style={{ padding: '20px 18px', borderColor: triggerColor, color: triggerColor }}
      disabled={isSyncing}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
        <span style={{
          width: 28, height: 28, border: `1px solid ${triggerColor}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: 14, flex: '0 0 auto',
        }}>↺</span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 12, letterSpacing: '0.22em', whiteSpace: 'nowrap' }}>
            {isError ? 'SYNC FAILED' : isSyncing ? 'FETCHING...' : 'SYNC MARKET DATA'}
          </span>
          <span style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
            {isSyncing
              ? `BYMA · NYSE · NASDAQ  ${Math.round(progress)}%`
              : isError
                ? 'NETWORK ERROR · RETRY'
                : 'PULL LATEST QUOTES · MANUAL TRIGGER'
            }
          </span>
        </span>
      </span>
      <span className="num" style={{ fontSize: 10, letterSpacing: '0.16em', flex: '0 0 auto' }}>
        {isSyncing ? '▶▶▶' : isDone ? '✓ OK' : isError ? '✕ ERR' : 'READY'}
      </span>
      {isSyncing && (
        <div style={{
          position: 'absolute', left: 0, bottom: 0, height: 2,
          width: `${progress}%`, background: 'var(--amb)',
          boxShadow: '0 0 6px var(--amb)', transition: 'width 0.12s linear',
        }} />
      )}
    </button>
  )

  const valuationPanel = (
    <div className="panel" style={{ padding: 0 }}>
      <span className="brackets"><i /></span>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)',
      }}>
        <span>◆ PORTFOLIO VALUATION</span>
        <span style={{ color: isSyncing ? 'var(--amb)' : isDone ? 'var(--grn)' : 'var(--ink-3)' }}>
          {isSyncing ? '● SYNC...' : isDone ? '● UPDATED' : lastSync ? '● LOCKED' : '● PENDING'}
        </span>
      </div>
      <div style={{ padding: '20px 16px 14px' }}>
        <div style={{ marginBottom: 12 }}>
          <div className="readout-cur" style={{ marginBottom: 6 }}>
            ARS{lastSync ? ` · SYNC ${lastSync}` : ' · NOT SYNCED'}
          </div>
          <div className="readout-big" style={{
            color: isSyncing ? 'var(--amb)' : 'var(--grn)',
            opacity: isSyncing ? 0.55 : 1, transition: 'opacity 0.3s',
            fontSize: isDesktop ? 72 : undefined,
          }}>
            <span style={{ color: 'var(--ink-3)', fontSize: isDesktop ? 32 : 30, marginRight: 6 }}>$</span>
            {synced ? fmt(totalArs).intStr : '—'}
            {synced && <span className="cents">.{fmt(totalArs).centStr}</span>}
          </div>
        </div>
        {tickers.some(t => t.last_price_currency === 'USD') && (
          <div style={{ paddingTop: 10, borderTop: '1px solid var(--line)', fontFamily: 'var(--mono)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 4 }}>USD ASSETS</div>
            <div style={{ fontSize: 22, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
              ${fmt(totalUsd).intStr}<span style={{ fontSize: 13, color: 'var(--ink-4)' }}>.{fmt(totalUsd).centStr}</span>
            </div>
          </div>
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 18, fontFamily: 'var(--mono)', fontSize: 11 }}>
          <span><span style={{ color: 'var(--ink-4)' }}>POS </span>{tickers.length}</span>
          <span><span style={{ color: 'var(--ink-4)' }}>SRC </span>DATA912</span>
          <span><span style={{ color: 'var(--ink-4)' }}>MKT </span>BYMA</span>
        </div>
      </div>
    </div>
  )

  const addTickerForm = showAddForm ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
      <input
        value={addSymbol}
        onChange={e => setAddSymbol(e.target.value.toUpperCase())}
        placeholder="SYMBOL (GGAL, AL30...)"
        style={inputStyle}
        maxLength={12}
        autoFocus
      />
      <input
        value={addQty}
        onChange={e => setAddQty(e.target.value)}
        placeholder="QUANTITY"
        type="number"
        min="0"
        style={inputStyle}
      />
      <input
        value={addClass}
        onChange={e => setAddClass(e.target.value.toUpperCase())}
        placeholder="ASSET CLASS (CEDEAR · TECH)"
        style={inputStyle}
      />
      <input
        value={addAvgCost}
        onChange={e => setAddAvgCost(e.target.value)}
        placeholder="COSTO PROMEDIO (opcional)"
        type="number"
        min="0"
        step="any"
        style={inputStyle}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {INSTRUMENT_KINDS.map(k => (
          <div key={k} className={`chip ${addKind === k ? 'on' : ''}`} onClick={() => setAddKind(k)}>
            {k}
          </div>
        ))}
      </div>
      {addErr && (
        <div style={{ border: '1px solid var(--red)', color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 10, padding: '8px 12px', letterSpacing: '0.14em' }}>
          ✕ {addErr}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-trigger" onClick={handleAddTicker} disabled={addTicker.isPending} style={{ padding: '12px 18px' }}>
          <span style={{ fontSize: 11, letterSpacing: '0.22em' }}>{addTicker.isPending ? 'SAVING...' : '▶ CONFIRM'}</span>
        </button>
        <button
          onClick={() => { setShowAddForm(false); setAddErr('') }}
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
  ) : null

  const tickerTable = (
    <>
      {tickers.length === 0 && !showAddForm ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          NO TICKERS · TAP + TO ADD
        </div>
      ) : (
        tickers.length > 0 && (
          <div className="panel tight">
            <span className="brackets"><i /></span>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isDesktop ? '80px 1fr 80px 90px 100px 36px' : '60px 1fr 60px 90px 36px',
              padding: '6px 0 10px', borderBottom: '1px solid var(--line)',
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-4)',
            }}>
              <span>TICKER</span>
              <span>CLASS</span>
              <span style={{ textAlign: 'right' }}>QTY</span>
              <span style={{ textAlign: 'right' }}>VALUE</span>
              {isDesktop && <span style={{ textAlign: 'right' }}>PX</span>}
              <span />
            </div>
            {tickers.map((t, i) => isDesktop ? (
              <div key={t.id} style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 80px 90px 100px 36px',
                alignItems: 'center', padding: '10px 0',
                borderBottom: i === tickers.length - 1 ? 0 : '1px solid var(--line)',
                fontFamily: 'var(--mono)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--grn)', letterSpacing: '0.04em' }}>{t.symbol}</span>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{t.asset_class ?? t.instrument_kind}</div>
                  {t.avg_cost != null && (
                    <div style={{ fontSize: 8.5, color: 'var(--ink-4)', marginTop: 2, letterSpacing: '0.08em' }}>Ø {t.avg_cost.toFixed(2)}</div>
                  )}
                </div>
                <span style={{ textAlign: 'right', fontSize: 11, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                  {t.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                </span>
                <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                  {t.last_price != null ? `${t.last_price_currency === 'USD' ? '$' : '$'}${fmt(t.quantity * t.last_price).intStr}` : '—'}
                </span>
                <span style={{ textAlign: 'right', fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
                  {t.last_price != null ? t.last_price.toFixed(2) : '—'}
                </span>
                <span
                  onClick={() => setBuyTicker(t)}
                  style={{ textAlign: 'right', fontSize: 9, letterSpacing: '0.12em', color: 'var(--grn)', cursor: 'pointer' }}
                >
                  OPR
                </span>
              </div>
            ) : (
              <TickerRow key={t.id} ticker={t} syncing={isSyncing} last={i === tickers.length - 1} onBuy={() => setBuyTicker(t)} />
            ))}
          </div>
        )
      )}
    </>
  )

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
          {valuationPanel}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {syncButton}
            <div className="panel tight" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>
              <span className="brackets"><i /></span>
              <div style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--ink-4)', marginBottom: 8 }}>◆ DATA SOURCES</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>DATA912 · BYMA L1</span><span style={{ color: 'var(--grn)' }}>● UP</span></div>
              <div style={{ marginTop: 8, color: 'var(--ink-4)', letterSpacing: '0.16em' }}>
                {lastSync ? `LAST SYNC · ${lastSync}` : 'NOT YET SYNCED'}
              </div>
            </div>
          </div>
        </div>
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0 8px', fontFamily: 'var(--mono)', fontSize: 10,
            letterSpacing: '0.18em', color: 'var(--ink-3)', borderBottom: '1px solid var(--line)', marginBottom: 10,
          }}>
            <span>◆ INVENTORY · TICKERS</span>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span
                onClick={() => { setShowAddForm(f => !f); setAddErr('') }}
                style={{ color: 'var(--grn)', cursor: 'pointer', letterSpacing: '0.18em' }}
              >
                {showAddForm ? '— CANCEL' : '+ TICKER'}
              </span>
              <span>{tickers.length} POS</span>
            </div>
          </div>
          {addTickerForm}
          {tickerTable}
        </div>
        {buyTicker && (
          <OperateTickerModal
            ticker={buyTicker}
            accounts={accounts}
            onClose={() => setBuyTicker(null)}
          />
        )}
      </div>
    )
  }

  // Mobile layout
  return (
    <div className="scroll" style={{ padding: '0 14px 20px' }}>
      <div style={{ marginTop: 14 }}>{valuationPanel}</div>
      <SectionLabel right="MANUAL">SYNC MARKET DATA</SectionLabel>
      {syncButton}
      <SectionLabel
        right={
          <span style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span
              onClick={() => { setShowAddForm(f => !f); setAddErr('') }}
              style={{ color: 'var(--grn)', cursor: 'pointer' }}
            >
              {showAddForm ? '— CANCEL' : '+ TICKER'}
            </span>
            <span>{tickers.length} POS</span>
          </span>
        }
      >
        INVENTORY · TICKERS
      </SectionLabel>
      {addTickerForm}
      {tickerTable}
      <div style={{
        marginTop: 10, fontFamily: 'var(--mono)', fontSize: 9.5,
        letterSpacing: '0.14em', color: 'var(--ink-4)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>SRC · DATA912 · BYMA L1</span>
        <span>{lastSync ? `LAST SYNC ${lastSync}` : 'NOT YET SYNCED'}</span>
      </div>
      <div style={{ height: 24 }} />
      {buyTicker && (
        <OperateTickerModal
          ticker={buyTicker}
          accounts={accounts}
          onClose={() => setBuyTicker(null)}
        />
      )}
    </div>
  )
}
