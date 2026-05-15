import { fmt } from '../../lib/format'
import type { Ticker } from '../../types/db'

interface Props {
  ticker: Ticker
  syncing?: boolean
  last?: boolean
  onBuy?: () => void
}

export function TickerRow({ ticker, syncing, last, onBuy }: Props) {
  const hasPrice = ticker.last_price != null
  const value    = hasPrice ? ticker.quantity * ticker.last_price! : null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '60px 1fr 60px 90px 36px',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: last ? 0 : '1px solid var(--line)',
      fontFamily: 'var(--mono)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--grn)', letterSpacing: '0.04em' }}>
        {ticker.symbol}
      </span>
      <div>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
          {ticker.asset_class ?? ticker.instrument_kind}
        </div>
        {ticker.avg_cost != null && (
          <div style={{ fontSize: 8.5, color: 'var(--ink-4)', letterSpacing: '0.08em', marginTop: 2 }}>
            Ø {ticker.avg_cost.toFixed(2)}
          </div>
        )}
      </div>
      <span style={{ textAlign: 'right', fontSize: 11, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
        {ticker.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
      </span>
      <span style={{
        textAlign: 'right', fontSize: 12,
        color: syncing ? 'var(--ink-4)' : 'var(--ink)',
        fontVariantNumeric: 'tabular-nums',
        opacity: syncing ? 0.4 : 1,
        transition: 'opacity 0.2s',
      }}>
        {syncing
          ? '------'
          : value != null
            ? `${ticker.last_price_currency === 'USD' ? '$' : '$'}${fmt(value).intStr}`
            : '—'
        }
      </span>
      <span
        onClick={onBuy}
        style={{
          textAlign: 'right', fontSize: 9, letterSpacing: '0.12em',
          color: 'var(--grn)', cursor: 'pointer',
          opacity: syncing ? 0.3 : 1,
          pointerEvents: syncing ? 'none' : 'auto',
        }}
      >
        OPR
      </span>
    </div>
  )
}
