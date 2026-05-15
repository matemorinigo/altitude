import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { GridBg } from '../components/shell/GridBg'

export function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode]       = useState<'login' | 'register'>('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fn = mode === 'login' ? signIn : signUp
    const { error: err } = await fn(email, password)
    setLoading(false)
    if (err) setError(err)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #161616 0%, #050505 70%)',
      padding: '32px 16px',
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 400,
        background: 'var(--bg)',
        border: '1px solid var(--line-2)',
      }}>
        <GridBg />
        <span className="brackets"><i /></span>

        {/* Header */}
        <div style={{
          padding: '24px 20px 16px',
          borderBottom: '1px solid var(--line)',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.24em', color: 'var(--ink-3)' }}>
            ALTITUDE · v0.4.2
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 28, letterSpacing: '0.14em', marginTop: 4, color: 'var(--ink)' }}>
            {mode === 'login' ? 'AUTHENTICATE' : 'REGISTER'}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.16em', marginTop: 4 }}>
            {mode === 'login' ? 'FLT · AUTH-01 ● ARMED' : 'FLT · REG-01 ● ARMED'}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', position: 'relative', zIndex: 1 }}>
          {/* Email */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 6 }}>
              EMAIL · PILOT ID
            </div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
              placeholder="pilot@example.com"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-4)', marginBottom: 6 }}>
              PASSWORD · CLEARANCE
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
              color: 'var(--red)', marginBottom: 14,
              padding: '8px 10px', border: '1px solid var(--red)',
              background: 'rgba(255,48,48,0.05)',
            }}>
              ✕ {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="btn-trigger" disabled={loading} style={{ padding: '20px 18px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{
                width: 26, height: 26, border: '1px solid var(--grn)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontSize: 16,
              }}>↑</span>
              <span style={{ fontSize: 13, letterSpacing: '0.22em' }}>
                {loading ? 'CONNECTING...' : mode === 'login' ? 'AUTHENTICATE' : 'CREATE PILOT'}
              </span>
            </span>
            <span className={`num${loading ? ' blink' : ''}`} style={{ fontSize: 10, letterSpacing: '0.16em' }}>
              {loading ? '●' : 'GO'}
            </span>
          </button>

          {/* Toggle mode */}
          <div style={{
            marginTop: 16, textAlign: 'center',
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-4)',
            cursor: 'pointer',
          }}>
            {mode === 'login' ? (
              <span onClick={() => { setMode('register'); setError(null) }}>
                REGISTER · <span style={{ color: 'var(--grn)' }}>NEW PILOT</span>
              </span>
            ) : (
              <span onClick={() => { setMode('login'); setError(null) }}>
                ← <span style={{ color: 'var(--grn)' }}>BACK TO LOGIN</span>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#080808',
  border: '1px solid var(--line-2)',
  color: 'var(--ink)',
  fontFamily: 'var(--mono)',
  fontSize: 13,
  letterSpacing: '0.04em',
  padding: '12px 10px',
  outline: 'none',
  borderRadius: 0,
  boxSizing: 'border-box',
}
