/**
 * Storage — Upstash Redis.
 * Sin Upstash configurado, todas las operaciones son no-ops y la app
 * funciona con datos estáticos de fallback.
 */
import type { GymSession } from "./gym-storage";
import { argentinaToday } from "./dates";

export interface WellnessEntry {
  date: string;
  hrv?: number;
  hrv_status?: string;
  hrv_baseline_lower?: number;
  hrv_baseline_upper?: number;
  sleep_total_s?: number;
  sleep_deep_s?: number;
  sleep_rem_s?: number;
  sleep_score?: number;
  resting_hr?: number;
  recovery_time_s?: number;
  stress_avg?: number;
  stress_max?: number;
}

export interface ActivityEntry {
  id?: string;
  strava_id?: number;
  garmin_id?: number;
  date: string;
  name: string;
  type: string;
  distance_m: number;
  duration_s: number;
  avg_hr: number;
  max_hr?: number;
  avg_pace_s_per_km?: number;
  training_effect?: number;
  zone_1_s?: number;
  zone_2_s?: number;
  zone_3_s?: number;
  zone_4_s?: number;
  zone_5_s?: number;
  aerobic_te?: number;
  anaerobic_te?: number;
  recovery_time_s?: number;
  trimp?: number;
}

function isConfigured(): boolean {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  return !!(url && !url.includes("your_") && url.startsWith("http"));
}

async function redis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL)!,
    token: (process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN)!,
  });
}

/** Parse tolerante: @upstash/redis puede devolver string u objeto ya deserializado. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseValue<T>(raw: any): T | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as T; } catch { return null; }
  }
  return raw as T;
}

// ── Wellness ──────────────────────────────────────────────────────────────────

export async function upsertWellness(entry: WellnessEntry): Promise<void> {
  if (!isConfigured()) return;
  const r = await redis();
  const key = `wellness:${entry.date}`;
  // FIX CRÍTICO: merge con la entrada existente. Antes se sobreescribía el
  // objeto completo, y el POST final del sync ({date, recovery_time_s})
  // borraba el HRV y el sueño del día.
  const existing = parseValue<WellnessEntry>(await r.get(key)) ?? {};
  const merged: WellnessEntry = { ...existing, ...entry };
  // No pisar valores existentes con undefined/null
  for (const k of Object.keys(merged) as (keyof WellnessEntry)[]) {
    if (merged[k] === undefined || merged[k] === null) delete merged[k];
  }
  await r.set(key, JSON.stringify(merged));
}

export async function getLatestWellness(): Promise<WellnessEntry | null> {
  const history = await getWellnessHistory(7);
  return history.length > 0 ? history[history.length - 1] : null;
}

/**
 * Últimos `days` días de wellness (orden cronológico ascendente).
 * Una sola llamada MGET en lugar de N GETs secuenciales.
 */
export async function getWellnessHistory(days: number): Promise<WellnessEntry[]> {
  if (!isConfigured()) return [];
  try {
    const r = await redis();
    const today = argentinaToday();
    const base = new Date(`${today}T12:00:00Z`);
    const keys: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() - i);
      keys.push(`wellness:${d.toISOString().split("T")[0]}`);
    }
    const vals = await r.mget<(string | WellnessEntry | null)[]>(...keys);
    return vals
      .map((v) => parseValue<WellnessEntry>(v))
      .filter((v): v is WellnessEntry => v !== null);
  } catch {
    return [];
  }
}

export interface LatestMetrics {
  hrv: number | null
  hrv_date: string | null
  hrv_baseline_lower: number | null
  hrv_baseline_upper: number | null
  sleep_total_s: number | null
  sleep_score: number | null
  sleep_deep_s: number | null
  sleep_rem_s: number | null
  sleep_date: string | null
  resting_hr: number | null
  stress_avg: number | null
}

/**
 * Último valor disponible POR CAMPO en los últimos 7 días.
 * Evita el problema de "hoy existe pero está incompleto": a la 1am la entrada
 * de hoy puede no tener sueño todavía, pero la de ayer sí — se usa esa.
 */
export async function getLatestMetrics(): Promise<LatestMetrics> {
  const history = await getWellnessHistory(7)
  const out: LatestMetrics = {
    hrv: null, hrv_date: null, hrv_baseline_lower: null, hrv_baseline_upper: null,
    sleep_total_s: null, sleep_score: null, sleep_deep_s: null, sleep_rem_s: null,
    sleep_date: null, resting_hr: null, stress_avg: null,
  }
  // history viene ascendente: recorrer de más nuevo a más viejo
  for (const w of [...history].reverse()) {
    if (out.hrv === null && w.hrv) {
      out.hrv = w.hrv
      out.hrv_date = w.date
      out.hrv_baseline_lower = w.hrv_baseline_lower ?? null
      out.hrv_baseline_upper = w.hrv_baseline_upper ?? null
    }
    if (out.sleep_total_s === null && w.sleep_total_s) {
      out.sleep_total_s = w.sleep_total_s
      out.sleep_score = w.sleep_score ?? null
      out.sleep_deep_s = w.sleep_deep_s ?? null
      out.sleep_rem_s = w.sleep_rem_s ?? null
      out.sleep_date = w.date
    }
    if (out.resting_hr === null && w.resting_hr) out.resting_hr = w.resting_hr
    if (out.stress_avg === null && w.stress_avg !== undefined) out.stress_avg = w.stress_avg
  }
  return out
}

// ── Activities ────────────────────────────────────────────────────────────────

export async function upsertActivity(activity: ActivityEntry): Promise<void> {
  if (!isConfigured()) return;
  const r = await redis();
  const key = `activity:${activity.garmin_id ?? activity.strava_id ?? `${activity.date}_${activity.name.replace(/\s+/g, "_")}`}`;
  await r.set(key, JSON.stringify(activity));
  await r.zadd("activities:index", {
    score: new Date(activity.date).getTime(),
    member: key,
  });
}

export async function getRecentActivities(limit = 10): Promise<ActivityEntry[]> {
  if (!isConfigured()) return [];
  try {
    const r = await redis();
    const keys = await r.zrange("activities:index", 0, limit - 1, { rev: true }) as string[];
    if (!keys?.length) return [];
    // Una sola llamada MGET en lugar de N GETs en paralelo
    const vals = await r.mget<(string | ActivityEntry | null)[]>(...keys);
    return vals
      .map((v) => parseValue<ActivityEntry>(v))
      .filter((v): v is ActivityEntry => v !== null);
  } catch {
    return [];
  }
}

// ── Invalidación de caches diarios ────────────────────────────────────────────

/**
 * Borra los caches calculados del día (daily-brief, load-analysis).
 * Se llama desde las rutas de sync: si entran datos nuevos de Garmin,
 * el brief cacheado a la mañana temprano queda obsoleto.
 */
export async function invalidateDailyCaches(): Promise<void> {
  if (!isConfigured()) return;
  try {
    const r = await redis();
    const today = argentinaToday();
    const utcToday = new Date().toISOString().split("T")[0];
    const keys = new Set([
      `daily-brief:${today}`,
      `load-analysis:${today}`,
      `daily-brief:${utcToday}`,
      `load-analysis:${utcToday}`,
    ]);
    await r.del(...Array.from(keys));
  } catch {}
}

// ── Gym Sessions ──────────────────────────────────────────────────────────────

export async function saveGymSession(session: Omit<GymSession, "id">): Promise<GymSession> {
  const full: GymSession = { ...session, id: `gym_${Date.now()}` };
  if (isConfigured()) {
    try {
      const r = await redis();
      await r.lpush("gym:sessions", JSON.stringify(full));
    } catch {}
  }
  return full;
}

export async function getGymSessions(limit = 50): Promise<GymSession[]> {
  if (!isConfigured()) return [];
  try {
    const r = await redis();
    const raw = await r.lrange("gym:sessions", 0, limit - 1) as (string | GymSession)[];
    return raw
      .map((s) => parseValue<GymSession>(s))
      .filter((s): s is GymSession => s !== null);
  } catch {
    return [];
  }
}
