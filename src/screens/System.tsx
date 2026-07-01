import { useState } from 'react'
import { SectionLabel } from '../components/shell/SectionLabel'
import { useAuth } from '../hooks/useAuth'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { getToday } from '../lib/time'
import { useAccounts } from '../hooks/useAccounts'
import { useCreditCards } from '../hooks/useCreditCards'
import { useRecurringTemplates } from '../hooks/useRecurring'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import { useTickers } from '../hooks/useTickers'
import { useAllTransactions } from '../hooks/useTransactions'
import { exportLedgerCsv } from '../lib/export'
import { AccountsAdmin } from './settings/AccountsAdmin'
import { CardsAdmin } from './settings/CardsAdmin'
import { PaydayAdmin } from './settings/PaydayAdmin'
import { RecurringAdmin } from './settings/RecurringAdmin'
import { TickersAdmin } from './settings/TickersAdmin'
import { CategoriesAdmin } from './settings/CategoriesAdmin'

type SubScreen = 'accounts' | 'cards' | 'payday' | 'recurring' | 'tickers' | 'categories' | null

function UsdRatePanel({ rate }: { rate: number }) {
  const [val, setVal]     = useState(String(Math.round(rate)))
  const [saved, setSaved] = useState(false)
  const update = useUpdateProfile()

  const handleSave = async () => {
    const n = parseFloat(val)
    if (!isFinite(n) || n <= 0) return
    await update.mutateAsync({ usd_rate: n })
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div style={{ padding: '10px 0 4px' }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em',
        color: 'var(--ink-4)', marginBottom: 8,
      }}>
        ◆ TIPO DE CAMBIO USD
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
          1 USD =
        </span>
        <input
          type="number"
          value={val}
          min="1"
          onChange={e => { setVal(e.target.value); setSaved(false) }}
          style={{
            flex: 1, background: '#050505',
            border: '1px solid var(--line-2)',
            color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12,
            letterSpacing: '0.06em', padding: '7px 10px', outline: 'none',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.12em' }}>ARS</span>
        <div
          className={`chip ${saved ? 'on' : ''}`}
          onClick={handleSave}
          style={{ cursor: 'pointer', whiteSpace: 'nowrap', opacity: update.isPending ? 0.5 : 1 }}
        >
          {saved ? 'OK ✓' : 'GUARDAR'}
        </div>
      </div>
    </div>
  )
}

export function System() {
  const { signOut }              = useAuth()
  const [sub, setSub]            = useState<SubScreen>(null)
  const [exporting, setExporting] = useState(false)
  const { data: accounts  = [] } = useAccounts()
  const { data: cards     = [] } = useCreditCards()
  const { data: templates = [] } = useRecurringTemplates()
  const { data: tickers   = [] } = useTickers()
  const { data: profile }        = useProfile()
  const { data: allTxs    = [] } = useAllTransactions()
  const isDesktop                = useIsDesktop()

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try { exportLedgerCsv(allTxs) } finally { setExporting(false) }
  }

  if (sub === 'accounts')  return <AccountsAdmin  onBack={() => setSub(null)} />
  if (sub === 'cards')     return <CardsAdmin      onBack={() => setSub(null)} />
  if (sub === 'payday')    return <PaydayAdmin     onBack={() => setSub(null)} />
  if (sub === 'recurring') return <RecurringAdmin  onBack={() => setSub(null)} />
  if (sub === 'tickers')    return <TickersAdmin    onBack={() => setSub(null)} />
  if (sub === 'categories') return <CategoriesAdmin onBack={() => setSub(null)} />

  const paydayValue = profile
    ? profile.payday_kind === 'NTH_BUSINESS_DAY'
      ? `${profile.payday_nth_business_day}° DÍA HÁBIL`
      : `DÍA ${profile.payday_day_of_month}`
    : '—'

  const rows: Array<{ label: string; value: string; action?: () => void }> = [
    { label: 'PAYDAY CONFIG', value: paydayValue,                             action: () => setSub('payday') },
    { label: 'BASE CURRENCY', value: 'ARS' },
    { label: 'MARKET API',    value: 'DATA912 · BYMA' },
    { label: 'ACCOUNTS',      value: `${accounts.length} OBJ`,                action: () => setSub('accounts') },
    { label: 'CREDIT CARDS',  value: `${cards.length} OBJ`,                   action: () => setSub('cards') },
    { label: 'RECURRING',     value: `${templates.filter(t => t.is_active).length} ACTIVE`, action: () => setSub('recurring') },
    { label: 'TICKERS',       value: `${tickers.length} HELD`,                             action: () => setSub('tickers') },
    { label: 'CATEGORIES',    value: 'CUSTOM',                                             action: () => setSub('categories') },
    { label: 'EXPORT LEDGER', value: exporting ? 'EXPORTING...' : `CSV · ${allTxs.length} TX`, action: handleExport },
  ]

  const rowEl = (r: { label: string; value: string; action?: () => void }, i: number) => (
    <div
      key={i}
      className="row"
      style={{ gridTemplateColumns: '1fr auto', cursor: r.action ? 'pointer' : 'default' }}
      onClick={r.action}
    >
      <div className="name" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--ink-2)' }}>
        {r.label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: r.action ? 'var(--grn)' : 'var(--ink-3)', letterSpacing: '0.08em' }}>
        {r.value}{r.action ? ' ›' : ''}
      </div>
    </div>
  )

  const signOutRow = (
    <div className="row" style={{ gridTemplateColumns: '1fr auto', marginTop: 8, cursor: 'pointer' }} onClick={signOut}>
      <div className="name" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--red)' }}>
        SIGN OUT
      </div>
    </div>
  )

  const versionFooter = (
    <div style={{ marginTop: 24, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.18em', textAlign: 'center' }}>
      ALTITUDE v0.4.2 · BUILD 2026.05.12
    </div>
  )

  if (isDesktop) {
    const col1 = rows.slice(0, 4)
    const col2 = rows.slice(4)
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 14 }}>
        <div>
          <div className="panel" style={{ padding: 0 }}>
            <span className="brackets"><i /></span>
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid var(--line)',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)',
            }}>◆ GENERAL</div>
            <div style={{ padding: '0 14px' }}>
              {col1.map(rowEl)}
              {profile && <UsdRatePanel rate={profile.usd_rate ?? 1000} />}
            </div>
          </div>
          {import.meta.env.DEV && (
            <div style={{ marginTop: 14, padding: '0 0' }}>
              <DevPanel />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="panel" style={{ padding: 0 }}>
            <span className="brackets"><i /></span>
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid var(--line)',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)',
            }}>◆ DATA & EXPORT</div>
            <div style={{ padding: '0 14px' }}>{col2.map(rowEl)}</div>
          </div>
          <div className="panel" style={{ padding: '12px 14px' }}>
            <span className="brackets"><i /></span>
            {signOutRow}
            {versionFooter}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="scroll" style={{ padding: '0 14px 20px' }}>
      <SectionLabel>SETTINGS · SYSTEM</SectionLabel>
      {rows.map(rowEl)}
      {profile && (
        <div style={{ padding: '0 0 8px', borderBottom: '1px solid var(--line-2)' }}>
          <UsdRatePanel rate={profile.usd_rate ?? 1000} />
        </div>
      )}
      {signOutRow}
      {import.meta.env.DEV && <DevPanel />}
      {versionFooter}
    </div>
  )
}

function DevPanel() {
  const stored = localStorage.getItem('altitude_mock_date') ?? ''
  const [val, setVal] = useState(stored)
  const active = !!stored

  const apply = () => {
    if (val) { localStorage.setItem('altitude_mock_date', val); location.reload() }
  }
  const clear = () => {
    localStorage.removeItem('altitude_mock_date')
    setVal('')
    location.reload()
  }

  return (
    <>
      <SectionLabel right={active ? `MOCK: ${stored}` : 'REAL TIME'}>
        <span style={{ color: active ? 'var(--amb)' : 'var(--ink-4)' }}>DEV · TIME OVERRIDE</span>
      </SectionLabel>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="date"
          value={val}
          onChange={e => setVal(e.target.value)}
          style={{
            flex: 1, background: '#050505', border: `1px solid ${active ? 'var(--amb)' : 'var(--line-2)'}`,
            color: active ? 'var(--amb)' : 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 11,
            letterSpacing: '0.04em', padding: '8px 10px', outline: 'none',
          }}
        />
        <div className="chip amb" onClick={apply} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>SET</div>
        {active && <div className="chip" onClick={clear} style={{ cursor: 'pointer' }}>CLEAR</div>}
      </div>
      <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.14em' }}>
        {active
          ? `▶ SIMULANDO ${getToday().toLocaleDateString('es-AR')} · SOLO EN BUILD DEV`
          : '— FECHA REAL · NO HAY MOCK ACTIVO'}
      </div>
    </>
  )
}
