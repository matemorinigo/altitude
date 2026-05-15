import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'

const ToastCtx = createContext<(msg: string, color?: string) => void>(() => {})

export function useToast() {
  return useContext(ToastCtx)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ msg: string; color: string; key: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((msg: string, color = 'var(--grn)') => {
    if (timer.current) clearTimeout(timer.current)
    setState({ msg, color, key: Date.now() })
    timer.current = setTimeout(() => setState(null), 2000)
  }, [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {state && (
        <div
          key={state.key}
          style={{
            position: 'fixed',
            top: 0,
            left: '50%',
            width: '100%',
            maxWidth: 480,
            zIndex: 200,
            padding: '10px 16px',
            background: '#000',
            borderBottom: `1px solid ${state.color}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            color: state.color,
            boxShadow: `0 4px 20px ${state.color}28`,
            animation: 'toast-slide 0.15s ease-out',
          }}
        >
          <span>◆</span>
          <span>{state.msg}</span>
        </div>
      )}
    </ToastCtx.Provider>
  )
}
