// ── ACWR ─────────────────────────────────────────────────────────────────────

export interface ACWRResult {
  acwr: number
  atl: number
  ctl: number
  tsb: number
  status: "detraining" | "sweet_spot" | "caution" | "danger"
  label: string
  color: string
  description: string
  recommendation: string
}

export function calcACWR(activities: ActivityData[]): ACWRResult {
  const sorted = [...activities].sort((a, b) => a.date.localeCompare(b.date))
  const trimps = sorted.map(calcTRIMP)

  // ATL = 7-day exponential weighted TRIMP
  const atl = ewma(trimps.slice(-7), 7)
  // CTL = 28-day exponential weighted TRIMP
  const ctl = ewma(trimps.slice(-28), 28)
  const tsb = ctl - atl
  const acwr = ctl > 0 ? atl / ctl : 0

  let status: ACWRResult["status"]
  let label: string
  let color: string
  let description: string
  let recommendation: string

  if (acwr < 0.8) {
    status = "detraining"
    label = "Desentrenamiento"
    color = "blue"
    description = "Carga aguda muy baja respecto al fitness acumulado."
    recommendation = "Podés aumentar el volumen sin riesgo. Tu cuerpo puede absorber más carga."
  } else if (acwr <= 1.3) {
    status = "sweet_spot"
    label = "Zona óptima"
    color = "green"
    description = "Equilibrio ideal entre carga y recuperación."
    recommendation = "Seguí el plan actual. Estás en la zona de mejor adaptación."
  } else if (acwr <= 1.5) {
    status = "caution"
    label = "Precaución"
    color = "yellow"
    description = "Carga aguda elevada. Riesgo moderado de lesión."
    recommendation = "Moderá la intensidad los próximos días. Priorizá sueño y nutrición."
  } else {
    status = "danger"
    label = "Zona peligrosa"
    color = "red"
    description = "Carga aguda muy alta. Riesgo real de sobreentrenamiento o lesión."
    recommendation = "Reducí el volumen inmediatamente. 2-3 días de recuperación activa."
  }

  return { acwr, atl, ctl, tsb, status, label, color, description, recommendation }
}

// ── Training Status ───────────────────────────────────────────────────────────

export type TrainingStatusKey = "productive" | "maintaining" | "peaking" | "overreaching" | "detraining"

export interface TrainingStatus {
  key: TrainingStatusKey
  label: string
  description: string
  color: string
  icon: string
}

export function calcTrainingStatus(
  acwr: ACWRResult,
  recentLoad: number,
  previousLoad: number
): TrainingStatus {
  const loadGrowing = recentLoad > previousLoad * 1.05
  const loadStable = recentLoad >= previousLoad * 0.9 && recentLoad <= previousLoad * 1.1
  const loadLow = recentLoad < previousLoad * 0.75

  if (acwr.acwr > 1.3) {
    return {
      key: "overreaching",
      label: "Sobreentrenamiento",
      description: "Carga demasiado alta. Riesgo de lesión o sobreentrenamiento",
      color: "red",
      icon: "🔥",
    }
  }

  if (acwr.acwr >= 0.9 && acwr.acwr <= 1.2 && loadGrowing) {
    return {
      key: "productive",
      label: "Productivo",
      description: "Carga y fitness en equilibrio ideal",
      color: "green",
      icon: "📈",
    }
  }

  if (acwr.acwr >= 0.8 && acwr.acwr <= 1.0 && loadStable) {
    return {
      key: "maintaining",
      label: "Mantenimiento",
      description: "Manteniendo forma. Aumentá carga para progresar",
      color: "lime",
      icon: "➡️",
    }
  }

  if (acwr.acwr < 0.8 && !loadLow) {
    return {
      key: "peaking",
      label: "En forma",
      description: "En forma. Ideal para competir",
      color: "emerald",
      icon: "🏆",
    }
  }

  // detraining: ACWR < 0.8 y carga baja sostenida
  return {
    key: "detraining",
    label: "Desentrenamiento",
    description: "Volumen insuficiente. Perdés forma",
    color: "blue",
    icon: "📉",
  }
}

// ── Load Focus ────────────────────────────────────────────────────────────────

export interface LoadFocus {
  base_aerobic_pct: number
  threshold_pct: number
  vo2max_pct: number
  deficit: "base" | "threshold" | "vo2max" | "balanced"
  deficit_label: string
  recommendation: string
  target_base_pct: number
}

function estimateZoneDistribution(activity: ActivityData): { z2: number; z3: number; z4: number; z5: number } {
  const hr = activity.avg_hr
  const name = (activity as ActivityData & { name?: string }).name?.toLowerCase() ?? ""
  const isBase = name.includes("base") || name.includes("fácil") || name.includes("facil") || name.includes("easy")

  let z2 = 0, z3 = 0, z4 = 0, z5 = 0

  if (hr < 140) {
    z2 = 0.9; z3 = 0.1
  } else if (hr < 155) {
    z2 = 0.3; z3 = 0.6; z4 = 0.1
  } else if (hr < 165) {
    z2 = 0.1; z3 = 0.5; z4 = 0.4
  } else if (hr < 175) {
    z2 = 0.05; z3 = 0.15; z4 = 0.75; z5 = 0.05
  } else {
    z2 = 0; z3 = 0.1; z4 = 0.4; z5 = 0.5
  }

  if (isBase) {
    const bonus = 0.2
    const remaining = 1 - z2
    if (remaining > 0) {
      const scale = Math.max(0, remaining - bonus) / remaining
      z3 *= scale; z4 *= scale; z5 *= scale
      z2 = 1 - z3 - z4 - z5
    }
  }

  return { z2, z3, z4, z5 }
}

export function calcLoadFocus(activities: ActivityData[]): LoadFocus {
  const target_base_pct = 80

  if (activities.length === 0) {
    return {
      base_aerobic_pct: 0,
      threshold_pct: 0,
      vo2max_pct: 0,
      deficit: "base",
      deficit_label: "Sin datos de actividad",
      recommendation: "Registrá actividades para analizar el foco de entrenamiento.",
      target_base_pct,
    }
  }

  let totalDuration = 0
  let weightedZ2 = 0
  let weightedZ3Z4 = 0
  let weightedZ5 = 0

  for (const act of activities) {
    const dur = act.duration_s
    const zones = estimateZoneDistribution(act)
    totalDuration += dur
    weightedZ2 += zones.z2 * dur
    weightedZ3Z4 += (zones.z3 + zones.z4) * dur
    weightedZ5 += zones.z5 * dur
  }

  const base_aerobic_pct = totalDuration > 0 ? Math.round((weightedZ2 / totalDuration) * 100) : 0
  const threshold_pct = totalDuration > 0 ? Math.round((weightedZ3Z4 / totalDuration) * 100) : 0
  const vo2max_pct = totalDuration > 0 ? Math.round((weightedZ5 / totalDuration) * 100) : 0

  let deficit: LoadFocus["deficit"]
  let deficit_label: string
  let recommendation: string

  if (base_aerobic_pct < 65) {
    deficit = "base"
    deficit_label = "Déficit aeróbico base"
    recommendation = "Aumentá el volumen de Z2 (easy). Al menos 65-80% del tiempo debería ser zona aeróbica base."
  } else if (threshold_pct < 10) {
    deficit = "threshold"
    deficit_label = "Déficit umbral"
    recommendation = "Incorporá más trabajo de tempo y umbral (Z3-Z4) para subir el umbral aeróbico."
  } else if (vo2max_pct < 3) {
    deficit = "vo2max"
    deficit_label = "Déficit VO2max"
    recommendation = "Agregá una sesión semanal de intervalos cortos (400m, 1km) para estimular el VO2max."
  } else {
    deficit = "balanced"
    deficit_label = "Distribución equilibrada"
    recommendation = "Distribución de zonas óptima para maratón. Mantenés el perfil 80/20."
  }

  return { base_aerobic_pct, threshold_pct, vo2max_pct, deficit, deficit_label, recommendation, target_base_pct }
}

// ── HRV Trend ─────────────────────────────────────────────────────────────────

export interface HRVTrend {
  current: number
  average7d: number
  average28d: number
  trend: "improving" | "stable" | "declining"
  trend_label: string
  baseline_lower: number
  baseline_upper: number
}

export function calcHRVTrend(
  wellnessEntries: Array<{ date: string; hrv?: number; hrv_baseline_lower?: number; hrv_baseline_upper?: number }>
): HRVTrend {
  const withHRV = wellnessEntries
    .filter((e) => e.hrv != null && e.hrv > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (withHRV.length === 0) {
    return {
      current: 0,
      average7d: 0,
      average28d: 0,
      trend: "stable",
      trend_label: "Sin datos HRV",
      baseline_lower: 0,
      baseline_upper: 0,
    }
  }

  const values = withHRV.map((e) => e.hrv as number)
  const current = values[values.length - 1]

  const last7 = values.slice(-7)
  const last28 = values.slice(-28)
  const average7d = last7.reduce((s, v) => s + v, 0) / last7.length
  const average28d = last28.length > 0 ? last28.reduce((s, v) => s + v, 0) / last28.length : average7d

  // Use last entry's baseline, or compute from data
  const lastEntry = withHRV[withHRV.length - 1]
  const baseline_lower = lastEntry.hrv_baseline_lower ?? Math.round(average28d * 0.9)
  const baseline_upper = lastEntry.hrv_baseline_upper ?? Math.round(average28d * 1.1)

  let trend: HRVTrend["trend"]
  let trend_label: string

  const diff = average7d - average28d
  const threshold = average28d * 0.03 // 3% change

  if (diff > threshold) {
    trend = "improving"
    trend_label = "HRV mejorando — buena recuperación"
  } else if (diff < -threshold) {
    trend = "declining"
    trend_label = "HRV bajando — monitorear fatiga acumulada"
  } else {
    trend = "stable"
    trend_label = "HRV estable"
  }

  return {
    current,
    average7d: Math.round(average7d * 10) / 10,
    average28d: Math.round(average28d * 10) / 10,
    trend,
    trend_label,
    baseline_lower,
    baseline_upper,
  }
}

// ── Original types (kept for compatibility) ───────────────────────────────────

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
