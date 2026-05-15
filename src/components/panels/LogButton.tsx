interface LogButtonProps {
  onClick: () => void
}

export function LogButton({ onClick }: LogButtonProps) {
  return (
    <button className="btn-trigger" onClick={onClick} style={{ padding: '22px 18px' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
        <span style={{
          width: 28, height: 28, border: '1px solid var(--grn)', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 18,
          lineHeight: 1, flex: '0 0 auto',
        }}>+</span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 13, letterSpacing: '0.22em', whiteSpace: 'nowrap' }}>LOG TRANSACTION</span>
          <span style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
            NUEVA ENTRADA · TAP TO ARM
          </span>
        </span>
      </span>
      <span className="num blink" style={{ fontSize: 10, letterSpacing: '0.16em', flex: '0 0 auto' }}>●REC</span>
    </button>
  )
}
