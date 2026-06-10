/**
 * Fechas en horario de Argentina.
 * Vercel corre en UTC: después de las 21:00 de Argentina el "día UTC" ya
 * cambió, lo que rompía claves de cache y la noción de "hoy".
 */
export function argentinaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date())
}

/** Timestamp unix (segundos) de la medianoche de Argentina de hoy. */
export function argentinaMidnightTimestamp(): number {
  const midnight = new Date(`${argentinaToday()}T23:59:59-03:00`)
  return Math.floor(midnight.getTime() / 1000)
}
