import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { SectionLabel } from '../components/shell/SectionLabel'
import { Panel } from '../components/panels/Panel'
import { Altimeter } from '../components/panels/Altimeter'
import { CycleTape } from '../components/panels/CycleTape'
import { LogButton } from '../components/panels/LogButton'
import { AccountRow } from '../components/rows/AccountRow'
import { CardRow } from '../components/rows/CardRow'
import { TxRow } from '../components/rows/TxRow'
import { LogTransactionModal } from '../components/modals/LogTransactionModal'
import { PaydayPromptModal } from '../components/modals/PaydayPromptModal'
import { RecurringPromptModal } from '../components/modals/RecurringPromptModal'
import { CardClosePromptModal } from '../components/modals/CardClosePromptModal'
import { TransferModal } from '../components/modals/TransferModal'
import { AccountDetail } from './AccountDetail'
import { CreditCardDetail } from './CreditCardDetail'
import { useAccounts } from '../hooks/useAccounts'
import { useCreditCards } from '../hooks/useCreditCards'
import { useRecentTransactions, useCycleTransactions, type TransactionWithRefs } from '../hooks/useTransactions'
import { usePendingEvents, useLastConfirmedPayday } from '../hooks/useScheduledEvents'
import { useProfile } from '../hooks/useProfile'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { ensureScheduledEvents, nextPaydayDate, cycleProgress } from '../lib/payday'
import { ensureInstallments } from '../lib/installments'
import { needsStatementClose } from '../lib/cardCycle'
import { useToast } from '../context/ToastContext'
import { getToday } from '../lib/time'
import { fmt } from '../lib/format'
import { isSpendTx } from '../lib/transactions'
import type { ScheduledEvent, RecurringTemplate, CreditCard, Account } from '../types/db'

export function Dashboard() {
  const [showLog, setShowLog]               = useState(false)
  const [cardToClose, setCardToClose]       = useState<CreditCard | null>(null)
  const [currencyMode, setCurrencyMode]     = useState<'ARS' | 'USD'>('ARS')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [selectedCard, setSelectedCard]       = useState<CreditCard | null>(null)
  const [transferFrom, setTransferFrom]     = useState<Account | null>(null)
  const [editTx, setEditTx]                 = useState<TransactionWithRefs | null>(null)
  const isDesktop                       = useIsDesktop()
  const qc                              = useQueryClient()
  const toast                           = useToast()

  const { data: profile   }  = useProfile()
  const { data: accounts = [] } = useAccounts()
  const { data: cards    = [] } = useCreditCards()
  const { data: txs      = [] } = useRecentTransactions(isDesktop ? 8 : 6)
  const { data: pending  = [] } = usePendingEvents()
  const { data: lastPayday }   = useLastConfirmedPayday()

  const today        = getToday()
  const nextPayday   = profile ? nextPaydayDate(profile, today) : null
  const fallbackLast = new Date(today.getFullYear(), today.getMonth(), 1)
  const cycleFrom    = lastPayday ?? fallbackLast
  const cycle        = nextPayday
    ? cycleProgress(cycleFrom, nextPayday, today)
    : { daysTotal: 30, daysIn: today.getDate(), daysLeft: 30 - today.getDate(), paydayLabel: '—' }

  const { data: cycleTxs = [] } = useCycleTransactions(cycleFrom)
  const totalBurn  = cycleTxs.filter(isSpendTx).reduce((s, t) => s + t.amount, 0)
  const burnPerDay = cycle.daysIn > 0 ? totalBurn / cycle.daysIn : 0

  const arsAccounts  = accounts.filter(a => a.currency === 'ARS')
  const usdAccounts  = accounts.filter(a => a.currency === 'USD')
  const arsBankTotal = arsAccounts.filter(a => !a.exclude_from_total).reduce((s, a) => s + (a.balance ?? 0), 0)
  const usdBankTotal = usdAccounts.filter(a => !a.exclude_from_total).reduce((s, a) => s + (a.balance ?? 0), 0)
  const arsCardDebt  = cards.reduce((s, c) => s + (c.current_debt_ars ?? 0) + (c.statement_debt_ars ?? 0), 0)
  const usdCardDebt  = cards.reduce((s, c) => s + (c.current_debt_usd ?? 0) + (c.statement_debt_usd ?? 0), 0)
  const arsReal      = arsBankTotal - arsCardDebt
  const usdReal      = usdBankTotal - usdCardDebt

  const bankTotal = currencyMode === 'USD' ? usdBankTotal : arsBankTotal
  const cardDebt  = currencyMode === 'USD' ? usdCardDebt  : arsCardDebt
  const real      = currencyMode === 'USD' ? usdReal      : arsReal
  const projEOC   = real - (burnPerDay * cycle.daysLeft)

  const { intStr: bankI, centStr: bankC } = fmt(bankTotal)
  const { intStr: cardI, centStr: cardC } = fmt(cardDebt)
  const { intStr: realI, centStr: realC } = fmt(real)

  const runInstallments = () => {
    ensureInstallments(today).then(({ posted, retained }) => {
      if (posted > 0) {
        qc.invalidateQueries({ queryKey: ['transactions'] })
        qc.invalidateQueries({ queryKey: ['credit_cards'] })
        qc.invalidateQueries({ queryKey: ['installment_plans'] })
      }
      if (posted > 0 || retained > 0) {
        toast(
          posted > 0
            ? `CUOTAS · ${posted} POSTEADA${posted > 1 ? 'S' : ''}${retained > 0 ? ` · ${retained} RETENIDA(S)` : ''}`
            : `CUOTAS · ${retained} RETENIDA(S) POR CIERRE PENDIENTE`,
          'var(--amb)',
        )
      }
    }).catch(() => { /* silencioso */ })
  }

  useEffect(() => {
    ensureScheduledEvents(today)
      .then(() => qc.invalidateQueries({ queryKey: ['scheduled_events'] }))
      .then(runInstallments)
      .catch(() => { /* silencioso */ })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cards.length === 0 || cardToClose) return
    const pending = cards.find(c => needsStatementClose(c, today))
    if (pending) setCardToClose(pending)
  }, [cards]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentEvent = pending[0] as (ScheduledEvent & { recurring_templates: RecurringTemplate }) | undefined
  const showPayday    = !!currentEvent?.recurring_templates?.is_payday && !showLog && !cardToClose
  const showRecurring = !!currentEvent && !currentEvent.recurring_templates?.is_payday && !showLog && !cardToClose

  const modals = (
    <>
      {showLog && (
        <LogTransactionModal
          accounts={accounts}
          cards={cards}
          onClose={() => setShowLog(false)}
        />
      )}
      {showPayday && profile && (
        <PaydayPromptModal
          event={currentEvent!}
          profile={profile}
          accounts={accounts}
          onClose={() => { }}
        />
      )}
      {showRecurring && (
        <RecurringPromptModal
          event={currentEvent! as ScheduledEvent & { recurring_templates: RecurringTemplate }}
          accounts={accounts}
          cards={cards}
          onClose={() => { }}
        />
      )}
      {cardToClose && !showLog && (
        <CardClosePromptModal
          card={cardToClose}
          onClose={() => { setCardToClose(null); runInstallments() }}
        />
      )}
      {transferFrom && (
        <TransferModal
          fromAccount={transferFrom}
          accounts={accounts}
          onClose={() => setTransferFrom(null)}
        />
      )}
      {editTx && (
        <LogTransactionModal
          accounts={accounts}
          cards={cards}
          editTx={editTx}
          onClose={() => setEditTx(null)}
        />
      )}
    </>
  )

  const altimeter = (
    <Altimeter
      value={real}
      currency={currencyMode}
      onToggleCurrency={() => setCurrencyMode(m => m === 'ARS' ? 'USD' : 'ARS')}
      breakdown={[
        { label: 'BANCOS',  value: `${bankI}.${bankC}`,        color: 'var(--ink)' },
        { label: 'TARJETA', value: `${cardI}.${cardC}`, op: '−', color: 'var(--amb)' },
        { label: 'REAL',    value: `${realI}.${realC}`, op: '=', color: real >= 0 ? 'var(--grn)' : 'var(--red)' },
      ]}
    />
  )

  const cycleTape = (
    <Panel tight>
      <CycleTape
        daysIn={cycle.daysIn}
        daysTotal={cycle.daysTotal}
        paydayLabel={cycle.paydayLabel}
        daysLeft={cycle.daysLeft}
      />
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 11,
      }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)' }}>BURN/DAY</div>
          <div style={{ marginTop: 4 }}>
            {burnPerDay > 0
              ? <span style={{ color: 'var(--amb)' }}>−{fmt(burnPerDay).intStr}</span>
              : <span style={{ color: 'var(--ink-4)' }}>—</span>
            }
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)' }}>PROJ. EOC</div>
          <div style={{ marginTop: 4 }}>
            {burnPerDay > 0
              ? <span style={{ color: projEOC >= 0 ? 'var(--grn)' : 'var(--red)' }}>
                  {projEOC >= 0 ? '+' : '−'}{fmt(Math.abs(projEOC)).intStr}
                </span>
              : <span style={{ color: 'var(--ink-4)' }}>—</span>
            }
          </div>
        </div>
      </div>
    </Panel>
  )

  const accountsList = (
    <>
      {accounts.length === 0
        ? <EmptyHint>NO ACCOUNTS · ADD IN SYS</EmptyHint>
        : accounts.map(a => (
          <AccountRow
            key={a.id}
            {...a}
            onClick={() => setSelectedAccount(a)}
          />
        ))
      }
    </>
  )

  const cardsList = (
    <>
      {cards.length === 0
        ? <EmptyHint>NO CARDS · ADD IN SYS</EmptyHint>
        : cards.map(c => <CardRow key={c.id} {...c} onClick={() => setSelectedCard(c)} />)
      }
    </>
  )

  const recentTx = txs.length === 0
    ? <EmptyHint>NO TRANSACTIONS YET</EmptyHint>
    : (
      <div className="panel tight">
        <span className="brackets"><i /></span>
        {txs.map((t, i) => (
          <TxRow
            key={t.id}
            tx={t}
            acctCode={t.accounts?.code ?? t.credit_cards?.code}
            isCard={!!t.credit_cards?.code}
            last={i === txs.length - 1}
            onClick={() => setEditTx(t)}
          />
        ))}
      </div>
    )

  // Account detail sub-screen — replaces dashboard when active
  if (selectedAccount) {
    return (
      <>
        {transferFrom && (
          <TransferModal
            fromAccount={transferFrom}
            accounts={accounts}
            onClose={() => setTransferFrom(null)}
          />
        )}
        <AccountDetail
          account={selectedAccount}
          cycleFrom={cycleFrom}
          accounts={accounts}
          onBack={() => setSelectedAccount(null)}
          onTransfer={(acct) => setTransferFrom(acct)}
        />
      </>
    )
  }

  // Card detail sub-screen
  if (selectedCard) {
    return <CreditCardDetail card={selectedCard} onBack={() => setSelectedCard(null)} />
  }

  if (isDesktop) {
    return (
      <>
        {modals}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14, padding: 14 }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            {altimeter}

            <LogButton onClick={() => setShowLog(true)} />

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { l: 'QUICK · CAFÉ', a: '−2.500' },
                { l: 'QUICK · UBER', a: '−4.800' },
                { l: 'INCOME', a: '+' },
              ].map((c, i) => (
                <div key={i} className="chip" style={{ display: 'flex', gap: 8 }}>
                  <span>{c.l}</span>
                  <span className="num" style={{ color: c.a.startsWith('+') ? 'var(--grn)' : 'var(--amb)' }}>{c.a}</span>
                </div>
              ))}
            </div>

            <div>
              <DTPanelHeader left="◆ RECENT LEDGER" right={<span style={{ color: 'var(--grn)' }}>● LIVE</span>} />
              {recentTx}
            </div>
          </div>

          {/* Right rail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <div>
              <DTPanelHeader left="◆ CICLO DE HABERES" right={<span style={{ color: 'var(--amb)' }}>T-{String(cycle.daysLeft).padStart(2, '0')}d</span>} />
              {cycleTape}
            </div>
            <div>
              <DTPanelHeader left="◆ ESTADO DE CUENTAS" right={`${accounts.length} OBJ`} />
              {accountsList}
            </div>
            <div>
              <DTPanelHeader left="◆ TARJETAS · DEUDA" right={<span style={{ color: 'var(--amb)' }}>{cards.length} OBJ</span>} />
              {cardsList}
            </div>
          </div>
        </div>
      </>
    )
  }

  // Mobile layout
  return (
    <>
      {modals}
      <div className="scroll" style={{ padding: '0 14px 20px' }}>
        <div style={{ marginTop: 14 }}>{altimeter}</div>

        <SectionLabel right="F1">CENTRO DE MANDO</SectionLabel>
        <LogButton onClick={() => setShowLog(true)} />

        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { l: 'QUICK · CAFÉ', a: '−2.500' },
            { l: 'QUICK · UBER', a: '−4.800' },
            { l: 'INCOME', a: '+' },
          ].map((c, i) => (
            <div key={i} className="chip" style={{ display: 'flex', gap: 8 }}>
              <span>{c.l}</span>
              <span className="num" style={{ color: c.a.startsWith('+') ? 'var(--grn)' : 'var(--amb)' }}>{c.a}</span>
            </div>
          ))}
        </div>

        <SectionLabel right="WIDGET-02">CICLO DE HABERES</SectionLabel>
        {cycleTape}

        <SectionLabel right={`${accounts.length} OBJ`}>ESTADO DE CUENTAS</SectionLabel>
        {accountsList}

        <SectionLabel right={`${cards.length} OBJ`}>TARJETAS DE CRÉDITO</SectionLabel>
        {cardsList}

        <SectionLabel right="LIVE">REGISTRO RECIENTE</SectionLabel>
        {recentTx}

        <div style={{ height: 24 }} />
      </div>
    </>
  )
}

function DTPanelHeader({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0 8px',
      fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)',
      borderBottom: '1px solid var(--line)',
      marginBottom: 10,
    }}>
      <span>{left}</span>
      {right && <span>{right}</span>}
    </div>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)',
      letterSpacing: '0.14em', padding: '8px 0',
    }}>
      {children}
    </div>
  )
}
