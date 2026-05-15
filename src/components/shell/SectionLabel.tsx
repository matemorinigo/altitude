import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  both?: boolean
  tight?: boolean
  right?: ReactNode
}

export function SectionLabel({ children, both = true, tight = false, right }: Props) {
  return (
    <div className={`sec-label${both ? ' both' : ''}${tight ? ' tight' : ''}`}>
      <span>{children}</span>
      {right && (
        <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--mono)', letterSpacing: '0.14em' }}>
          {right}
        </span>
      )}
    </div>
  )
}
