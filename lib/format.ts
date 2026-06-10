/** 27780s → "7h 43min" (mismo formato que Garmin Connect) */
export function formatHm(totalSeconds: number): string {
  const totalMin = Math.round(totalSeconds / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h ${m}min`
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]

/** "2026-06-10" → "miércoles 10/06" — día de semana correcto para esa fecha calendario */
export function spanishWeekday(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  const [, month, day] = dateStr.split("-")
  return `${WEEKDAYS[d.getUTCDay()]} ${day}/${month}`
}
