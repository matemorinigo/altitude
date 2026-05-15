export function fmt(n: number) {
  const neg     = n < 0
  const abs     = Math.abs(n)
  const intPart = Math.floor(abs)
  const cents   = Math.round((abs - intPart) * 100)
  const intStr  = intPart.toLocaleString('en-US').replace(/,/g, '.')
  const centStr = String(cents).padStart(2, '0')
  return { intStr, centStr, neg }
}
