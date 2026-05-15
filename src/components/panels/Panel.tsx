import { ReactNode, CSSProperties } from 'react'

interface Props {
  children: ReactNode
  tight?: boolean
  style?: CSSProperties
  className?: string
}

export function Panel({ children, tight, style, className = '' }: Props) {
  return (
    <div className={`panel${tight ? ' tight' : ''} ${className}`} style={style}>
      <span className="brackets"><i /></span>
      {children}
    </div>
  )
}
