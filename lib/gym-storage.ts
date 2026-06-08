// Gym session storage with Supabase + localStorage fallback
export interface GymSet { kg: number; reps: number; rir?: number; completed?: boolean }
export interface GymExercise { name: string; sets: GymSet[] }
export interface GymSession {
  id: string;
  date: string;
  type: "Push" | "Pull" | "Piernas";
  exercises: GymExercise[];
  duration_min: number;
  notes: string;
}

const LS_KEY = "gym_sessions_local";

function localLoad(): GymSession[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function localSave(sessions: GymSession[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(sessions));
}

export async function fetchSessions(): Promise<GymSession[]> {
  try {
    const res = await fetch("/api/gym");
    if (res.ok) {
      const remote = await res.json();
      if (Array.isArray(remote) && remote.length > 0) return remote;
    }
  } catch {}
  return localLoad();
}

export async function saveSession(session: Omit<GymSession, "id">): Promise<GymSession> {
  // Always save to localStorage first (instant)
  const local = localLoad();
  const newSession: GymSession = {
    ...session,
    id: `local_${Date.now()}`,
  };
  localSave([newSession, ...local]);

  // Try to sync to Supabase in background
  try {
    const res = await fetch("/api/gym", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    });
    if (res.ok) {
      const remote = await res.json();
      // Replace local entry with remote (has real UUID)
      const updated = localLoad().map((s) => (s.id === newSession.id ? { ...remote } : s));
      localSave(updated);
      return remote;
    }
  } catch {}

  return newSession;
}

// Progress analysis helpers
export function maxWeight(sessions: GymSession[], exerciseName: string): number {
  let max = 0;
  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (ex.name.toLowerCase() === exerciseName.toLowerCase()) {
        for (const set of ex.sets) {
          if (set.kg > max) max = set.kg;
        }
      }
    }
  }
  return max;
}

export function exerciseHistory(sessions: GymSession[], exerciseName: string) {
  const history: { date: string; maxKg: number; totalSets: number }[] = [];
  for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const ex of s.exercises) {
      if (ex.name.toLowerCase() === exerciseName.toLowerCase()) {
        const maxKg = Math.max(...ex.sets.map((st) => st.kg));
        history.push({ date: s.date, maxKg, totalSets: ex.sets.length });
      }
    }
  }
  return history;
}
