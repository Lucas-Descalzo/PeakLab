/**
 * Storage layer — uses Vercel KV when available, localStorage fallback in browser.
 * Vercel KV is Redis. Schema:
 *   wellness:{date}        → WellnessEntry JSON
 *   activities:list        → sorted set of activity JSON strings (by date)
 *   gym:sessions           → list of GymSession JSON strings
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
}

function isKVConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && !process.env.KV_REST_API_URL.includes("your_"));
}

async function getKV() {
  const { kv } = await import("@vercel/kv");
  return kv;
}

// ── Wellness ──────────────────────────────────────────────────────────────────

export async function upsertWellness(entry: WellnessEntry): Promise<void> {
  if (!isKVConfigured()) return;
  const kv = await getKV();
  await kv.set(`wellness:${entry.date}`, JSON.stringify(entry));
}

export async function getWellness(date: string): Promise<WellnessEntry | null> {
  if (!isKVConfigured()) return null;
  try {
    const kv = await getKV();
    const raw = await kv.get<string>(`wellness:${date}`);
    return raw ? JSON.parse(raw as string) : null;
  } catch {
    return null;
  }
}

export async function getLatestWellness(): Promise<WellnessEntry | null> {
  if (!isKVConfigured()) return null;
  try {
    const kv = await getKV();
    // Get last 7 days and return the most recent one with data
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const entry = await kv.get<string>(`wellness:${dateStr}`);
      if (entry) return JSON.parse(entry as string);
    }
    return null;
  } catch {
    return null;
  }
}

// ── Activities ────────────────────────────────────────────────────────────────

export async function upsertActivity(activity: ActivityEntry): Promise<void> {
  if (!isKVConfigured()) return;
  const kv = await getKV();
  const key = `activity:${activity.garmin_id || activity.strava_id || activity.date + "_" + activity.name}`;
  await kv.set(key, JSON.stringify(activity));
  // Keep an index: sorted set by date
  await (kv as any).zadd("activities:index", { score: new Date(activity.date).getTime(), member: key });
}

export async function getRecentActivities(limit = 10): Promise<ActivityEntry[]> {
  if (!isKVConfigured()) return [];
  try {
    const kv = await getKV();
    const keys = await (kv as any).zrange("activities:index", 0, limit - 1, { rev: true }) as string[];
    if (!keys || keys.length === 0) return [];
    const results = await Promise.all(keys.map((k: string) => kv.get<string>(k)));
    return results.filter(Boolean).map((r) => JSON.parse(r as string));
  } catch {
    return [];
  }
}

// ── Gym Sessions ──────────────────────────────────────────────────────────────

export async function saveGymSession(session: Omit<GymSession, "id">): Promise<GymSession> {
  const id = `gym_${Date.now()}`;
  const full: GymSession = { ...session, id };

  if (isKVConfigured()) {
    try {
      const kv = await getKV();
      await kv.lpush("gym:sessions", JSON.stringify(full));
    } catch {}
  }
  return full;
}

export async function getGymSessions(limit = 50): Promise<GymSession[]> {
  if (!isKVConfigured()) return [];
  try {
    const kv = await getKV();
    const raw = await kv.lrange("gym:sessions", 0, limit - 1);
    return (raw as string[]).map((r) => JSON.parse(r));
  } catch {
    return [];
  }
}
