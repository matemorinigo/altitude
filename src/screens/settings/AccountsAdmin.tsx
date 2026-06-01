import { useState } from 'react'
import { SectionLabel } from '../../components/shell/SectionLabel'
import { useAccounts, useAddAccount, useArchiveAccount, useUpdateAccountAlias, useToggleAccountExclude } from '../../hooks/useAccounts'
import type { AccountType } from '../../types/db'

interface Props {
  onBack: () => void
}

const inputStyle: React.CSSProperties = {
  background: '#050505', border: '1px solid var(--line-2)',
  color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12,
  letterSpacing: '0.04em', padding: '10px 12px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

export function AccountsAdmin({ onBack }: Props) {
  const { data: accounts = [], isLoading } = useAccounts()
  const addAccount      = useAddAccount()
  const archiveAccount  = useArchiveAccount()
  const updateAlias     = useUpdateAccountAlias()
  const toggleExclude   = useToggleAccountExclude()

  const [showForm, setShowForm]       = useState(false)
  const [code, setCode]               = useState('')
  const [name, setName]               = useState('')
  const [type, setType]               = useState<AccountType>('BANK')
  const [currency, setCurrency]       = useState('ARS')
  const [err, setErr]                 = useState('')
  const [editingAlias, setEditingAlias] = useState<string | null>(null)
  const [aliasInput, setAliasInput]   = useState('')

  const handleAdd = async () => {
    if (!code.trim() || !name.trim()) { setErr('CODE AND NAME REQUIRED'); return }
    setErr('')
    try {
      await addAccount.mutateAsync({ code: code.toUpperCase().trim(), name: name.trim(), type, currency })
      setCode(''); setName(''); setShowForm(false)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'ERROR')
    }
  }

  const startEditAlias = (id: string, current: string) => {
    setEditingAlias(id)
    setAliasInput(current)
  }

  const commitAlias = async (id: string) => {
    await updateAlias.mutateAsync({ id, alias: aliasInput.trim() })
    setEditingAlias(null)
  }

  return (
    <div className="scroll" style={{ padding: '0 14px 20px' }}>
      {/* Back header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
      }}>
        <span onClick={onBack} style={{ color: 'var(--amb)', cursor: 'pointer' }}>← BACK</span>
        <span style={{ color: 'var(--ink-3)' }}>ACCOUNTS · ADMIN</span>
      </div>

      <SectionLabel right={`${accounts.length} OBJ`}>CUENTAS</SectionLabel>

      {isLoading && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          LOADING...
        </div>
      )}

      {accounts.map(a => (
        <div key={a.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10, marginBottom: 10 }}>
          <div className="row" style={{ gridTemplateColumns: 'auto 1fr auto', borderBottom: 0, paddingBottom: 0 }}>
            <div style={{
              width: 36, height: 36, border: '1px solid var(--line-2)', background: '#080808',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-2)',
            }}>{a.code}</div>
            <div>
              <div className="name">{a.name}</div>
              <div className="sub">{a.type} · {a.currency}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <div
                style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', cursor: 'pointer', letterSpacing: '0.1em' }}
                onClick={() => archiveAccount.mutate(a.id)}
              >
                ARCH
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer',
                  color: a.exclude_from_total ? 'var(--amb)' : 'var(--ink-3)',
                }}
                onClick={() => toggleExclude.mutate({ id: a.id, exclude: !a.exclude_from_total })}
              >
                {a.exclude_from_total ? 'EXCL ●' : 'EXCL ○'}
              </div>
            </div>
          </div>
          {/* Alias inline editor */}
          {editingAlias === a.id ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input
                value={aliasInput}
                onChange={e => setAliasInput(e.target.value)}
                placeholder="alias (ej: altitude.galicia.ars)"
                autoFocus
                style={{ ...inputStyle, flex: 1, fontSize: 11, padding: '6px 10px' }}
                onKeyDown={e => { if (e.key === 'Enter') commitAlias(a.id); if (e.key === 'Escape') setEditingAlias(null) }}
              />
              <button
                onClick={() => commitAlias(a.id)}
                disabled={updateAlias.isPending}
                style={{
                  background: 'transparent', border: '1px solid var(--grn)', color: 'var(--grn)',
                  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
                  padding: '6px 12px', cursor: 'pointer',
                }}
              >
                OK
              </button>
              <button
                onClick={() => setEditingAlias(null)}
                style={{
                  background: 'transparent', border: '1px solid var(--line-2)', color: 'var(--ink-3)',
                  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
                  padding: '6px 10px', cursor: 'pointer',
                }}
              >
                ESC
              </button>
            </div>
          ) : (
            <div
              onClick={() => startEditAlias(a.id, a.alias ?? '')}
              style={{
                marginTop: 4, fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.14em',
                color: a.alias ? 'var(--ink-3)' : 'var(--ink-4)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ color: 'var(--ink-4)' }}>ALIAS ›</span>
              <span>{a.alias || '—  tap to set'}</span>
            </div>
          )}
        </div>
      ))}

      {accounts.length === 0 && !isLoading && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          NO ACCOUNTS
        </div>
      )}

      <SectionLabel right="NEW">AGREGAR CUENTA</SectionLabel>

      {!showForm ? (
        <button className="btn-trigger" onClick={() => setShowForm(true)} style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: 11, letterSpacing: '0.22em' }}>+ ADD ACCOUNT</span>
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="CODE (GAL, MP...)" style={inputStyle} maxLength={5} />
          <input value={name} onChange={e => setName(e.target.value)} placeholder="NAME (Galicia · CA)" style={inputStyle} />

          <div style={{ display: 'flex', gap: 6 }}>
            {(['BANK', 'WALLET'] as AccountType[]).map(t => (
              <div key={t} className={`chip ${type === t ? 'on' : ''}`} onClick={() => setType(t)}>{t}</div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {['ARS', 'USD'].map(c => (
              <div key={c} className={`chip ${currency === c ? 'on' : ''}`} onClick={() => setCurrency(c)}>{c}</div>
            ))}
          </div>

          {err && (
            <div style={{ border: '1px solid var(--red)', color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 10, padding: '8px 12px', letterSpacing: '0.14em' }}>
              ✕ {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-trigger" onClick={handleAdd} disabled={addAccount.isPending} style={{ padding: '12px 18px' }}>
              <span style={{ fontSize: 11, letterSpacing: '0.22em' }}>{addAccount.isPending ? 'SAVING...' : '▶ CONFIRM'}</span>
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
