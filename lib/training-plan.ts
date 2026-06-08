export type WorkoutType = 'easy' | 'quality' | 'long' | 'race' | 'rest' | 'recovery'

export interface PlannedWorkout {
  date: string
  week: number
  phase: string
  type: WorkoutType
  title: string
  description: string
  distanceKm: number
  paceTarget?: string
  hrTarget?: string
  details: string
}

// Phase definitions
const PHASES = {
  1: 'Base Aeróbica',
  2: 'Build',
  3: 'Taper Media',
  4: 'Recovery + Build Maratón',
  5: 'Taper Maratón',
}

// Plan start date
const PLAN_START = new Date('2026-06-09') // Tuesday week 1

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function fmt(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Build the full 15-week plan
export function buildPlan(): PlannedWorkout[] {
  const plan: PlannedWorkout[] = []

  const weeks: Array<{
    week: number
    phase: number
    tue: PlannedWorkout | null
    thu: PlannedWorkout | null
    sun: PlannedWorkout | null
  }> = [
    // FASE 1 — BASE
    {
      week: 1, phase: 1,
      tue: { date: '', week: 1, phase: PHASES[1], type: 'easy', title: 'Fácil Z2', description: 'Test de control de intensidad. Si podés hablar sin esfuerzo, vas bien.', distanceKm: 8, paceTarget: '6:30-6:45/km', hrTarget: 'HR < 140', details: '8km continuos a Z2. Si te salís de HR 140, bajá el ritmo aunque parezca muy lento.' },
      thu: { date: '', week: 1, phase: PHASES[1], type: 'quality', title: 'Fartlek 35min', description: 'Primera sesión de calidad del ciclo.', distanceKm: 6, paceTarget: 'Z4 en esfuerzos', hrTarget: 'HR 165-175 en esfuerzos', details: '10min Z2 entrada → 5 rondas de [3min Z4 / 2min Z2] → 5min Z2 vuelta' },
      sun: { date: '', week: 1, phase: PHASES[1], type: 'long', title: 'Long Run 13km', description: 'Ritmo conversacional todo el tiempo.', distanceKm: 13, paceTarget: '6:40-6:50/km', hrTarget: 'HR < 140', details: '13km Z2. Si querés, el último km un poco más rápido (~6:15/km) si te sentís bien.' },
    },
    {
      week: 2, phase: 1,
      tue: { date: '', week: 2, phase: PHASES[1], type: 'easy', title: 'Fácil Z2', description: '', distanceKm: 9, paceTarget: '6:30-6:45/km', hrTarget: 'HR < 140', details: '9km Z2 continuo.' },
      thu: { date: '', week: 2, phase: PHASES[1], type: 'quality', title: 'Tempo 8km', description: 'Umbral aeróbico. Ritmo duro pero controlado.', distanceKm: 8, paceTarget: '5:10-5:20/km en bloque', hrTarget: 'HR 165-175', details: '2km Z2 entrada → 4km a 5:10-5:20/km (HR 165-175) → 2km Z2 vuelta' },
      sun: { date: '', week: 2, phase: PHASES[1], type: 'long', title: 'Long Run 15km', description: '', distanceKm: 15, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '15km Z2.' },
    },
    {
      week: 3, phase: 1,
      tue: { date: '', week: 3, phase: PHASES[1], type: 'easy', title: 'Fácil Z2', description: '', distanceKm: 9, paceTarget: '6:30-6:45/km', hrTarget: 'HR < 140', details: '9km Z2.' },
      thu: { date: '', week: 3, phase: PHASES[1], type: 'quality', title: 'Series 5×1km', description: 'Primera sesión de intervalos. Ritmo VO2max.', distanceKm: 9, paceTarget: '4:40-4:50/km en series', hrTarget: 'HR > 181', details: '2km Z2 entrada → 5×1km a 4:40-4:50/km (rec 90s trotando) → 2km Z2 vuelta' },
      sun: { date: '', week: 3, phase: PHASES[1], type: 'long', title: 'Long Run 16km', description: '', distanceKm: 16, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '16km Z2. Último km a ~6:15 si te sentís bien.' },
    },
    {
      week: 4, phase: 1,
      tue: { date: '', week: 4, phase: PHASES[1], type: 'easy', title: 'Fácil Z2', description: 'Semana de descarga.', distanceKm: 7, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '7km Z2, muy relajado.' },
      thu: { date: '', week: 4, phase: PHASES[1], type: 'quality', title: 'Series 4×1km', description: 'Descarga — calidad mantenida, volumen bajo.', distanceKm: 7, paceTarget: '4:40-4:50/km', hrTarget: 'HR > 181', details: '2km Z2 entrada → 4×1km Z4-Z5 (rec 90s) → 2km Z2 vuelta' },
      sun: { date: '', week: 4, phase: PHASES[1], type: 'long', title: 'Long Run 12km', description: '', distanceKm: 12, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '12km Z2.' },
    },
    // FASE 2 — BUILD
    {
      week: 5, phase: 2,
      tue: { date: '', week: 5, phase: PHASES[2], type: 'easy', title: 'Fácil Z2', description: '', distanceKm: 10, paceTarget: '6:30-6:45/km', hrTarget: 'HR < 140', details: '10km Z2.' },
      thu: { date: '', week: 5, phase: PHASES[2], type: 'quality', title: 'Tempo 10km', description: 'Bloque de umbral más largo. Ritmo media maratón (HMP).', distanceKm: 10, paceTarget: '5:05-5:15/km', hrTarget: 'HR 168-176', details: '2km Z2 entrada → 6km a 5:05-5:15/km → 2km Z2 vuelta' },
      sun: { date: '', week: 5, phase: PHASES[2], type: 'long', title: 'Long Run 18km', description: 'Primeros kms largos con ritmo específico al final.', distanceKm: 18, paceTarget: 'Z2 + últimos 3km HMP', hrTarget: 'HR < 140 / HR 168-176 final', details: '15km Z2 → últimos 3km a HMP (5:05-5:15/km)' },
    },
    {
      week: 6, phase: 2,
      tue: { date: '', week: 6, phase: PHASES[2], type: 'quality', title: 'Series 6×1km', description: '', distanceKm: 10, paceTarget: '4:40-4:50/km', hrTarget: 'HR > 181', details: '2km Z2 entrada → 6×1km a 4:40-4:50/km (rec 90s) → 2km Z2 vuelta' },
      thu: { date: '', week: 6, phase: PHASES[2], type: 'easy', title: 'Progresión 10km', description: 'La última parte a ritmo de media maratón.', distanceKm: 10, paceTarget: 'Z2 → últimos 3km HMP', hrTarget: 'HR < 140 → HR 168-176', details: '7km Z2 → últimos 3km a HMP (5:05-5:15/km)' },
      sun: { date: '', week: 6, phase: PHASES[2], type: 'long', title: 'Long Run 19km', description: '', distanceKm: 19, paceTarget: 'Z2 + últimos 4km HMP', hrTarget: 'HR < 140', details: '15km Z2 → últimos 4km a HMP' },
    },
    {
      week: 7, phase: 2,
      tue: { date: '', week: 7, phase: PHASES[2], type: 'quality', title: 'Tempo 10km', description: 'Bloque de umbral más exigente.', distanceKm: 10, paceTarget: '5:05-5:10/km', hrTarget: 'HR 168-176', details: '1km Z2 entrada → 8km a 5:05-5:10/km → 1km Z2 vuelta' },
      thu: { date: '', week: 7, phase: PHASES[2], type: 'easy', title: 'Fácil Z2', description: '', distanceKm: 11, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '11km Z2.' },
      sun: { date: '', week: 7, phase: PHASES[2], type: 'long', title: 'Long Run 20km ⭐', description: 'Long run más largo del ciclo. Últimos 5km a ritmo media maratón.', distanceKm: 20, paceTarget: 'Z2 + últimos 5km HMP', hrTarget: 'HR < 140', details: '15km Z2 → últimos 5km a HMP (5:05-5:15/km). Esta es la sesión más importante del plan.' },
    },
    {
      week: 8, phase: 2,
      tue: { date: '', week: 8, phase: PHASES[2], type: 'easy', title: 'Fácil Z2', description: 'Semana de descarga.', distanceKm: 8, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '8km Z2.' },
      thu: { date: '', week: 8, phase: PHASES[2], type: 'quality', title: '3×3km HMP', description: 'Simulacro de ritmo de carrera.', distanceKm: 15, paceTarget: '5:05-5:10/km en bloques', hrTarget: 'HR 168-176', details: '2km Z2 entrada → 3×3km a 5:05-5:10/km (rec 3min trotando) → 2km Z2 vuelta' },
      sun: { date: '', week: 8, phase: PHASES[2], type: 'long', title: 'Long Run 14km', description: '', distanceKm: 14, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '14km Z2.' },
    },
    // FASE 3 — TAPER MEDIA
    {
      week: 9, phase: 3,
      tue: { date: '', week: 9, phase: PHASES[3], type: 'easy', title: 'Fácil Z2', description: '', distanceKm: 8, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '8km Z2.' },
      thu: { date: '', week: 9, phase: PHASES[3], type: 'quality', title: 'Series mix', description: 'Mantener intensidad, reducir volumen.', distanceKm: 9, paceTarget: 'Z4 + Z5', hrTarget: 'HR 165-181+', details: '2km Z2 entrada → 4×1km Z4 + 2×1km Z5 (rec 90s) → 2km Z2 vuelta' },
      sun: { date: '', week: 9, phase: PHASES[3], type: 'long', title: 'Long Run 15km', description: '', distanceKm: 15, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '15km Z2.' },
    },
    {
      week: 10, phase: 3,
      tue: { date: '', week: 10, phase: PHASES[3], type: 'easy', title: 'Fácil Z2', description: '', distanceKm: 5, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '5km Z2.' },
      thu: { date: '', week: 10, phase: PHASES[3], type: 'quality', title: 'Simulacro 8km HMP', description: 'Test final a ritmo de carrera. Así tiene que sentirse el domingo.', distanceKm: 12, paceTarget: '5:05-5:15/km', hrTarget: 'HR 168-176', details: '2km Z2 entrada → 8km a HMP (5:05-5:15/km) → 2km Z2 vuelta' },
      sun: { date: '', week: 10, phase: PHASES[3], type: 'easy', title: 'Fácil Z2', description: '', distanceKm: 8, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '8km Z2.' },
    },
    {
      week: 11, phase: 3,
      tue: { date: '', week: 11, phase: PHASES[3], type: 'easy', title: 'Fácil Z2', description: 'Semana de carrera. Solo activaciones.', distanceKm: 5, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '5km Z2, muy suave.' },
      thu: { date: '', week: 11, phase: PHASES[3], type: 'quality', title: 'Activación', description: '', distanceKm: 3, paceTarget: 'suave + aceleraciones', hrTarget: 'HR < 150', details: '20min fácil + 4×100m aceleración progresiva' },
      sun: { date: '', week: 11, phase: PHASES[3], type: 'race', title: '🏃 MEDIA MARATÓN', description: 'Objetivo: 1:48-1:52. Salir conservador los primeros 10km.', distanceKm: 21.1, paceTarget: '5:08-5:15/km', hrTarget: 'HR 168-176', details: 'Salir a 5:10-5:15/km los primeros 10km aunque te sientas bien. La segunda parte se gana con los primeros 10km inteligentes. No empezar rápido.' },
    },
    // FASE 4 — RECOVERY + BUILD MARATÓN
    {
      week: 12, phase: 4,
      tue: { date: '', week: 12, phase: PHASES[4], type: 'recovery', title: 'Recovery Z1-Z2', description: 'Semana de recuperación post-media. Sin presión.', distanceKm: 5, paceTarget: 'muy suave', hrTarget: 'HR < 130', details: '5km muy suave Z1-Z2. Si el cuerpo dice no, descansá.' },
      thu: { date: '', week: 12, phase: PHASES[4], type: 'easy', title: 'Fácil Z2', description: '', distanceKm: 7, paceTarget: '6:40-7:00/km', hrTarget: 'HR < 140', details: '7km Z2 si te sentís bien. Reducir a 5km si hay fatiga.' },
      sun: { date: '', week: 12, phase: PHASES[4], type: 'easy', title: 'Fácil Z2', description: '', distanceKm: 10, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '10km Z2.' },
    },
    {
      week: 13, phase: 4,
      tue: { date: '', week: 13, phase: PHASES[4], type: 'easy', title: 'Fácil Z2', description: '', distanceKm: 8, paceTarget: '6:30-6:45/km', hrTarget: 'HR < 140', details: '8km Z2.' },
      thu: { date: '', week: 13, phase: PHASES[4], type: 'quality', title: 'Tempo 8km', description: 'Vuelta a calidad.', distanceKm: 8, paceTarget: '5:10-5:20/km', hrTarget: 'HR 165-175', details: '2km Z2 entrada → 4km Z4 (5:10-5:20/km) → 2km Z2 vuelta' },
      sun: { date: '', week: 13, phase: PHASES[4], type: 'long', title: 'Long Run 18km', description: 'Con ritmo maratón al final.', distanceKm: 18, paceTarget: 'Z2 + últimos 5km MP', hrTarget: 'HR < 140', details: '13km Z2 → últimos 5km a ritmo maratón (MP) 5:35-5:50/km' },
    },
    {
      week: 14, phase: 4,
      tue: { date: '', week: 14, phase: PHASES[4], type: 'easy', title: 'Fácil Z2', description: '', distanceKm: 8, paceTarget: '6:30-6:45/km', hrTarget: 'HR < 140', details: '8km Z2.' },
      thu: { date: '', week: 14, phase: PHASES[4], type: 'quality', title: 'Ritmo Maratón 8km', description: 'Sesión clave. Sentir el ritmo objetivo de la maratón.', distanceKm: 12, paceTarget: '5:35-5:45/km en bloque', hrTarget: 'HR 155-165', details: '2km Z2 entrada → 8km a MP (5:35-5:45/km) → 2km Z2 vuelta' },
      sun: { date: '', week: 14, phase: PHASES[4], type: 'long', title: 'Long Run 20km ⭐', description: 'La sesión más importante del bloque maratón. Últimos 6km a MP.', distanceKm: 20, paceTarget: 'Z2 + últimos 6km MP', hrTarget: 'HR < 140', details: '14km Z2 → últimos 6km a MP (5:35-5:45/km)' },
    },
    {
      week: 15, phase: 5,
      tue: { date: '', week: 15, phase: PHASES[5], type: 'easy', title: 'Fácil Z2', description: '', distanceKm: 5, paceTarget: '6:30-7:00/km', hrTarget: 'HR < 140', details: '5km Z2.' },
      thu: { date: '', week: 15, phase: PHASES[5], type: 'quality', title: 'Activación final', description: '', distanceKm: 3, paceTarget: 'suave + aceleraciones', hrTarget: 'HR < 150', details: '3km suave + 4×100m aceleración. Listo.' },
      sun: { date: '', week: 15, phase: PHASES[5], type: 'race', title: '🏅 MARATÓN', description: 'Objetivo: 4:00-4:10. Tu primer maratón. Salir conservador.', distanceKm: 42.2, paceTarget: '5:40-5:50/km', hrTarget: 'HR 155-165', details: 'Salir a 5:45-5:50/km los primeros 10km aunque te sientas muy bien. El maratón empieza en el km 30. Hidratación cada 3-4km desde el inicio.' },
    },
  ]

  // Assign dates: week starts on Monday, Tue = +1, Thu = +3, Sun = +6
  weeks.forEach((w) => {
    const weekStart = addDays(PLAN_START, (w.week - 1) * 7 - 1) // Monday of each week
    if (w.tue) { w.tue.date = fmt(addDays(weekStart, 1)); plan.push(w.tue) }
    if (w.thu) { w.thu.date = fmt(addDays(weekStart, 3)); plan.push(w.thu) }
    if (w.sun) { w.sun.date = fmt(addDays(weekStart, 6)); plan.push(w.sun) }
  })

  return plan
}

export function getTodayWorkout(): PlannedWorkout | null {
  const today = new Date().toISOString().split('T')[0]
  return buildPlan().find(w => w.date === today) || null
}

export function getWeekWorkouts(weekNumber: number): PlannedWorkout[] {
  return buildPlan().filter(w => w.week === weekNumber)
}

export function getCurrentWeek(): number {
  const today = new Date()
  const start = new Date(PLAN_START)
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.min(15, Math.floor(diffDays / 7) + 1))
}
