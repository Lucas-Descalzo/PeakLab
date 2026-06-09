import { NextResponse } from "next/server"
import { getLatestWellness, getRecentActivities } from "@/lib/db"
import { getTodayWorkout } from "@/lib/training-plan"
import { calcTrainingLoad, calcReadiness, calcACWR, calcTrainingStatus, calcLoadFocus, calcHRVTrend } from "@/lib/training-readiness"

function midnightTimestamp(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(23, 59, 59, 0)
  return Math.floor(midnight.getTime() / 1000)
}

function ruleBased(score: number, workoutTitle: string) {
  if (score >= 75) return {
    recommendation: "Condición óptima. Día ideal para entrenar fuerte.",
    why: "HRV alto y sueño reparador — el cuerpo absorbió bien la carga reciente.",
    focus: "Alta intensidad",
    action: workoutTitle || "Seguí el plan"
  }
  if (score >= 50) return {
    recommendation: "Buena condición. Seguí el plan sin forzar.",
    why: "Readiness estable. No es el momento de superar límites, sí de acumular trabajo.",
    focus: "Trabajo planificado",
    action: workoutTitle || "Seguí el plan"
  }
  return {
    recommendation: "Recuperación primero. Entrenamiento suave o descanso.",
    why: "HRV y/o sueño por debajo de la baseline. El cuerpo necesita recuperarse.",
    focus: "Recuperación activa",
    action: "Salida suave Z1 o descanso"
  }
}

export async function GET() {
  const today = new Date().toISOString().split("T")[0]

  // Check cache
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let redis: any = null
  try {
    const { Redis } = await import("@upstash/redis")
    if (process.env.UPSTASH_REDIS_REST_URL?.startsWith("http")) {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
      const cached = await redis.get(`daily-brief:${today}`)
      if (cached) return NextResponse.json({ ...JSON.parse(cached as string), cached: true })
    }
  } catch {}

  // Build context
  const wellness = await getLatestWellness().catch(() => null)
  const activities = await getRecentActivities(42).catch(() => [])
  const todayWorkout = getTodayWorkout()

  const activityData = activities.map(a => ({
    date: a.date, duration_s: a.duration_s, avg_hr: a.avg_hr, distance_m: a.distance_m
  }))

  const STATIC = [
    { date: "2026-06-02", duration_s: 1812, avg_hr: 163, distance_m: 5554 },
    { date: "2026-05-31", duration_s: 3486, avg_hr: 164, distance_m: 10324 },
    { date: "2026-05-28", duration_s: 2106, avg_hr: 167, distance_m: 6951 },
  ]

  const data = activityData.length > 0 ? activityData : STATIC
  const load = calcTrainingLoad(data)

  const acwr = calcACWR(data)
  const load_focus = calcLoadFocus(data)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0]
  const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split("T")[0]
  const recentLoad = data.filter((a) => a.date >= sevenDaysAgoStr).reduce((s, a) => s + a.duration_s / 60, 0)
  const previousLoad = data.filter((a) => a.date >= fourteenDaysAgoStr && a.date < sevenDaysAgoStr).reduce((s, a) => s + a.duration_s / 60, 0)
  const training_status = calcTrainingStatus(acwr, recentLoad, previousLoad)

  const wellnessData = {
    date: wellness?.date ?? today,
    hrv: wellness?.hrv ?? 77,
    hrv_baseline_lower: wellness?.hrv_baseline_lower ?? 55,
    hrv_baseline_upper: wellness?.hrv_baseline_upper ?? 99,
    sleep_total_s: wellness?.sleep_total_s ?? Math.round(8.2 * 3600),
    sleep_score: wellness?.sleep_score ?? 89,
  }
  const readiness = calcReadiness(wellnessData, load)

  const hrv_trend = calcHRVTrend([
    {
      date: wellnessData.date,
      hrv: wellnessData.hrv,
      hrv_baseline_lower: wellnessData.hrv_baseline_lower,
      hrv_baseline_upper: wellnessData.hrv_baseline_upper,
    },
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any = { ...ruleBased(readiness.score, todayWorkout?.title ?? "Seguí el plan"), score: readiness.score, status: readiness.label, color: readiness.color }

  // Try Gemini
  const apiKey = process.env.GEMINI_API_KEY
  if (apiKey && !apiKey.includes("your_") && apiKey.length > 10) {
    try {
      const hrv = wellnessData.hrv
      const sleep = (wellnessData.sleep_total_s / 3600).toFixed(1)
      const prompt = `Sos el coach de PeakLab para Lucas (21 años, corredor de Buenos Aires).
DATOS: HRV ${hrv}ms, Sueño ${sleep}h, Readiness ${readiness.score}/100, TSB ${load.tsb.toFixed(1)}.
TRAINING STATUS: ${training_status.label} (${training_status.description})
ACWR: ${acwr.acwr.toFixed(2)} — ${acwr.label}
LOAD FOCUS: ${load_focus.deficit_label} — ${load_focus.recommendation}
HRV TREND (7d): ${hrv_trend.trend_label}
HOY: ${todayWorkout?.title ?? "Sin workout"} — ${todayWorkout?.details?.slice(0, 80) ?? ""}.
Respondé SOLO con JSON sin markdown:
{"recommendation":"max 20 palabras sobre qué hacer hoy","why":"max 20 palabras explicando por qué","focus":"2-3 palabras objetivo clave","action":"max 12 palabras acción concreta"}`

      const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
      for (const model of models) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 200, temperature: 0.7 } }) }
        )
        if (res.ok) {
          const data = await res.json()
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            result = { ...result, ...parsed }
            break
          }
        }
        if (res.status !== 404 && res.status !== 400) break
      }
    } catch { /* use rule-based */ }
  }

  // Cache until midnight
  try {
    if (redis) await redis.set(`daily-brief:${today}`, JSON.stringify(result), { exat: midnightTimestamp() })
  } catch {}

  return NextResponse.json({ ...result, cached: false })
}
