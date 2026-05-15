export function getToday(): Date {
  if (import.meta.env.DEV) {
    const mock = localStorage.getItem('altitude_mock_date')
    if (mock) return new Date(mock + 'T12:00:00')
  }
  return new Date()
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
