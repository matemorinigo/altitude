// Feriados nacionales AR. Actualizar anualmente.
export const HOLIDAYS_AR: Record<number, string[]> = {
  2025: [
    '2025-01-01', // Año Nuevo
    '2025-03-03', // Carnaval
    '2025-03-04', // Carnaval
    '2025-03-24', // Día de la Memoria
    '2025-04-02', // Malvinas
    '2025-04-18', // Viernes Santo
    '2025-05-01', // Día del Trabajador
    '2025-05-25', // Revolución de Mayo
    '2025-06-16', // Güemes (trasladable)
    '2025-06-20', // Día de la Bandera
    '2025-07-09', // Independencia
    '2025-08-18', // San Martín (trasladable)
    '2025-10-12', // Diversidad Cultural
    '2025-11-24', // Soberanía Nacional (trasladable)
    '2025-12-08', // Inmaculada Concepción
    '2025-12-25', // Navidad
  ],
  2026: [
    '2026-01-01', // Año Nuevo
    '2026-02-16', // Carnaval
    '2026-02-17', // Carnaval
    '2026-03-24', // Día de la Memoria
    '2026-04-02', // Malvinas
    '2026-04-03', // Viernes Santo
    '2026-05-01', // Día del Trabajador
    '2026-05-25', // Revolución de Mayo
    '2026-06-15', // Güemes (trasladable)
    '2026-06-20', // Día de la Bandera
    '2026-07-09', // Independencia
    '2026-08-17', // San Martín (trasladable)
    '2026-10-12', // Diversidad Cultural
    '2026-11-20', // Soberanía Nacional
    '2026-12-08', // Inmaculada Concepción
    '2026-12-25', // Navidad
  ],
  2027: [
    '2027-01-01', // Año Nuevo
    '2027-02-08', // Carnaval
    '2027-02-09', // Carnaval
    '2027-03-24', // Día de la Memoria
    '2027-04-02', // Malvinas
    '2027-03-26', // Viernes Santo
    '2027-05-01', // Día del Trabajador
    '2027-05-25', // Revolución de Mayo
    '2027-06-21', // Güemes (trasladable)
    '2027-06-20', // Día de la Bandera
    '2027-07-09', // Independencia
    '2027-08-16', // San Martín (trasladable)
    '2027-10-11', // Diversidad Cultural (trasladable)
    '2027-11-22', // Soberanía Nacional (trasladable)
    '2027-12-08', // Inmaculada Concepción
    '2027-12-25', // Navidad
  ],
}

export function isBusinessDay(d: Date): boolean {
  const day = d.getDay() // 0=Dom, 6=Sáb
  if (day === 0 || day === 6) return false
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return !(HOLIDAYS_AR[d.getFullYear()] ?? []).includes(iso)
}

// month es 0-indexed
export function getNthBusinessDay(year: number, month: number, n: number): Date {
  let count = 0
  let d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    if (isBusinessDay(d)) {
      count++
      if (count === n) return new Date(d)
    }
    d.setDate(d.getDate() + 1)
  }
  throw new Error(`No hay ${n}° día hábil en ${year}-${month + 1}`)
}
