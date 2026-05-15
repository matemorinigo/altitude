import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { useAuth } from './hooks/useAuth'
import { useIsDesktop } from './hooks/useIsDesktop'
import { GridBg } from './components/shell/GridBg'
import { HudBar } from './components/shell/HudBar'
import { DesktopHud } from './components/shell/DesktopHud'
import { SideNav } from './components/shell/SideNav'
import { TabBar, type TabId } from './components/shell/TabBar'
import { Login } from './screens/Login'
import { Dashboard } from './screens/Dashboard'
import { Hangar } from './screens/Hangar'
import { Ledger } from './screens/Ledger'
import { System } from './screens/System'
import './styles/index'

const queryClient = new QueryClient()

const SCREEN_TITLE: Record<TabId, string> = {
  dash:   'DASHBOARD',
  hangar: 'HANGAR',
  log:    'LEDGER',
  sys:    'SYSTEM',
}

const SCREEN_SUBTITLE: Record<TabId, string> = {
  dash:   'PRIMARY VIEW · DAILY OPS',
  hangar: 'ASSETS · INVENTORY',
  log:    'TRANSACTION HISTORY',
  sys:    'SYSTEM CONFIGURATION',
}

const SCREEN_NUM: Record<TabId, string> = {
  dash: '01', hangar: '02', log: '03', sys: '04',
}

function Shell() {
  const { session, loading } = useAuth()
  const [tab, setTab] = useState<TabId>('dash')
  const isDesktop = useIsDesktop()

  if (loading) return <LoadingScreen />
  if (!session) return <Login />

  if (isDesktop) {
    return (
      <div style={{
        height: '100dvh', display: 'flex', flexDirection: 'column',
        background: 'var(--bg)', position: 'relative', overflow: 'hidden',
      }}>
        <GridBg />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <DesktopHud tab={tab} />
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <SideNav active={tab} onChange={setTab} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
              {/* Page header */}
              <div style={{
                padding: '12px 18px', borderBottom: '1px solid var(--line)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                fontFamily: 'var(--mono)', flexShrink: 0,
              }}>
                <div style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 18, letterSpacing: '0.16em', color: 'var(--ink)' }}>
                    {SCREEN_TITLE[tab]}
                  </span>
                  <span style={{ fontSize: 10, letterSpacing: '0.22em', color: 'var(--ink-4)' }}>
                    {SCREEN_SUBTITLE[tab]}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-4)' }}>
                  <span>SCREEN {SCREEN_NUM[tab]}/04</span>
                  <span>●</span>
                  <span>RECORDING</span>
                </div>
              </div>
              {/* Content */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                {tab === 'dash'   && <Dashboard />}
                {tab === 'hangar' && <Hangar />}
                {tab === 'log'    && <Ledger />}
                {tab === 'sys'    && <System />}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mobile layout
  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #161616 0%, #050505 70%)',
    }}>
      <div className="screen">
        <GridBg />
        <HudBar />

        <div style={{
          padding: '10px 14px 6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          position: 'relative',
          zIndex: 1,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.24em', color: 'var(--ink-3)' }}>
              ALTITUDE · v0.4.2
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, letterSpacing: '0.14em', marginTop: 4, color: 'var(--ink)' }}>
              {SCREEN_TITLE[tab]}
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.16em',
            color: 'var(--ink-3)', textAlign: 'right',
            display: 'flex', flexDirection: 'column', gap: 4, whiteSpace: 'nowrap',
          }}>
            <div>FLT · {tab.toUpperCase()}-01</div>
            <div style={{ color: 'var(--grn)' }}>● ARMED</div>
          </div>
        </div>

        {tab === 'dash'   && <Dashboard />}
        {tab === 'hangar' && <Hangar />}
        {tab === 'log'    && <Ledger />}
        {tab === 'sys'    && <System />}

        <TabBar active={tab} onChange={setTab} />
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      fontFamily: 'var(--mono)',
      fontSize: 11,
      letterSpacing: '0.22em',
      color: 'var(--ink-4)',
    }}>
      <span className="blink">● INITIALIZING...</span>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
