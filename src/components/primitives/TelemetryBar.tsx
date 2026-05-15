export function TelemetryBar() {
  return (
    <div style={{
      height: 2,
      background: 'var(--line)',
      position: 'relative',
      overflow: 'hidden',
      margin: '12px 0',
    }}>
      <div className="telem-scan" />
    </div>
  )
}
