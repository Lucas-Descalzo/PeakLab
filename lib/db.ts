/**
 * Storage — Upstash Redis.
 * Sin Upstash configurado, todas las operaciones son no-ops y la app
 * funciona con datos estáticos de fallback.
 */
import type { GymSession } from "./gym-storage";

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
  const url = process.env.UPSTASH_REDIS_REST_URL;
  return !!(url && !url.includes("your_") && url.startsWith("http"));
}

async function redis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// ── Wellness ──────────────────────────────────────────────────────────────────

export async function upsertWellness(entry: WellnessEntry): Promise<void> {
  if (!isConfigured()) return;
  const r = await redis();
  await r.set(`wellness:${entry.date}`, JSON.stringify(entry));
}

export async function getLatestWellness(): Promise<WellnessEntry | null> {
  if (!isConfigured()) return null;
  try {
    const r = await redis();
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `wellness:${d.toISOString().split("T")[0]}`;
      const raw = await r.get<string>(key);
      if (raw) return JSON.parse(raw as string);
    }
    return null;
  } catch {
    return null;
  }
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
    const vals = await Promise.all(keys.map((k) => r.get<string>(k)));
    return vals.filter(Boolean).map((v) => JSON.parse(v as string));
  } catch {
    return [];
  }
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
    const raw = await r.lrange("gym:sessions", 0, limit - 1) as string[];
    return raw.map((s) => JSON.parse(s));
  } catch {
    return [];
  }
}
