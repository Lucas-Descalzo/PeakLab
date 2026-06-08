export interface WellnessData {
  date: string
  hrv: number
  hrv_baseline_lower: number
  hrv_baseline_upper: number
  sleep_total_s: number
  sleep_score?: number
  resting_hr?: number
}

export interface ActivityData {
  date: string
  duration_s: number
  avg_hr: number
  distance_m: number
}

// Simplified TRIMP (Training Impulse) — proxy for training stress
function calcTRIMP(activity: ActivityData): number {
  const durationMin = activity.duration_s / 60
  const hrMax = 201
  const hrRest = 45
  const hrRatio = (activity.avg_hr - hrRest) / (hrMax - hrRest)
  return durationMin * hrRatio * 0.64 * Math.exp(1.92 * hrRatio)
}

// Exponential weighted average for ATL (7d) and CTL (42d)
function ewma(values: number[], tau: number): number {
  if (values.length === 0) return 0
  const k = 2 / (tau + 1)
  return values.reduce((prev, curr) => curr * k + prev * (1 - k), values[0])
}

export interface TrainingLoad {
  atl: number   // Acute Training Load (7d) — fatigue
  ctl: number   // Chronic Training Load (42d) — fitness
  tsb: number   // Training Stress Balance — form (CTL - ATL)
}

export function calcTrainingLoad(activities: ActivityData[]): TrainingLoad {
  const sorted = [...activities].sort((a, b) => a.date.localeCompare(b.date))
  const trimp = sorted.map(calcTRIMP)
  const atl = ewma(trimp.slice(-7), 7)
  const ctl = ewma(trimp.slice(-42), 42)
  return { atl, ctl, tsb: ctl - atl }
}

export interface ReadinessScore {
  score: number       // 0-100
  label: string
  color: string
  hrv_score: number
  sleep_score: number
  load_score: number
  recommendation: string
}

export function calcReadiness(
  wellness: WellnessData | null,
  load: TrainingLoad
): ReadinessScore {
  let hrv_score = 50
  let sleep_score = 50
  let load_score = 50

  // HRV score (0-100): where in baseline range
  if (wellness?.hrv && wellness.hrv_baseline_lower && wellness.hrv_baseline_upper) {
    const range = wellness.hrv_baseline_upper - wellness.hrv_baseline_lower
    const pct = (wellness.hrv - wellness.hrv_baseline_lower) / range
    hrv_score = Math.min(100, Math.max(0, Math.round(pct * 100)))
  }

  // Sleep score: Garmin's score directly, or estimate from duration
  if (wellness?.sleep_score) {
    sleep_score = wellness.sleep_score
  } else if (wellness?.sleep_total_s) {
    const hours = wellness.sleep_total_s / 3600
    if (hours >= 8) sleep_score = 90
    else if (hours >= 7) sleep_score = 75
    else if (hours >= 6) sleep_score = 55
    else sleep_score = 30
  }

  // Load score: TSB-based (positive TSB = more rested = higher score)
  // TSB typically ranges from -30 (very fatigued) to +20 (very fresh)
  const normalized = Math.min(100, Math.max(0, ((load.tsb + 30) / 50) * 100))
  load_score = Math.round(normalized)

  const score = Math.round(hrv_score * 0.4 + sleep_score * 0.3 + load_score * 0.3)

  let label: string
  let color: string
  let recommendation: string

  if (score >= 80) {
    label = 'Óptimo'
    color = 'green'
    recommendation = 'Día ideal para sesión de calidad o long run exigente.'
  } else if (score >= 65) {
    label = 'Bueno'
    color = 'lime'
    recommendation = 'Podés entrenar según el plan sin ajustes.'
  } else if (score >= 50) {
    label = 'Moderado'
    color = 'yellow'
    recommendation = 'Hacé la sesión pero sin forzar. Si era calidad, considerá bajar la intensidad.'
  } else if (score >= 35) {
    label = 'Bajo'
    color = 'orange'
    recommendation = 'Reemplazá sesión dura por easy Z2 o descanso activo.'
  } else {
    label = 'Muy bajo'
    color = 'red'
    recommendation = 'Descansá. El cuerpo necesita recuperación. Entrenar hoy suma fatiga sin beneficio.'
  }

  return { score, label, color, hrv_score, sleep_score, load_score, recommendation }
}
