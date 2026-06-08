"use client";
import { useState, useEffect } from "react";
import { fetchSessions, saveSession, GymSession as StoredSession } from "@/lib/gym-storage";
import { getTodayGymDay, GymDay, GymExercise } from "@/lib/gym-plan";

interface Set { kg: number; reps: number }
interface Exercise { name: string; sets: Set[] }
interface Session {
  id?: string;
  date: string;
  type: "Push" | "Pull" | "Piernas";
  exercises: Exercise[];
  duration_min: number;
  notes: string;
}

const GYM_TYPES = ["Push", "Pull", "Piernas"] as const;

const SUGGESTED_EXERCISES: Record<string, string[]> = {
  Push:    ["Press banca", "Press inclinado mancuernas", "Press militar", "Fondos con peso", "Elevaciones laterales", "Tríceps polea"],
  Pull:    ["Dominadas con peso", "Remo con barra", "Remo en polea", "Face pull", "Curl bíceps barra", "Remo a una mano"],
  Piernas: ["Hip thrust", "Bulgarian split squat", "Prensa 45°", "Curl isquiotibiales acostado", "Abducción cadera máquina", "Elevación talones una pierna"],
};

function emptyExercise(): Exercise {
  return { name: "", sets: [{ kg: 0, reps: 0 }] };
}

function nextGymDay(): string {
  const today = new Date().getDay(); // 0=Sun..6=Sat
  const gymDays = [1, 3, 5]; // Mon, Wed, Fri
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  for (let i = 1; i <= 7; i++) {
    const next = (today + i) % 7;
    if (gymDays.includes(next)) return dayNames[next];
  }
  return "Lunes";
}

const TYPE_COLORS: Record<string, string> = {
  Push:    "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Pull:    "bg-green-500/20 text-green-300 border-green-500/30",
  Piernas: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

const PHASE_COLORS: Record<string, string> = {
  Normal:    "bg-zinc-700/50 text-zinc-300",
  Descarga:  "bg-yellow-500/20 text-yellow-300",
  Taper:     "bg-purple-500/20 text-purple-300",
  Recovery:  "bg-red-500/20 text-red-300",
};

function ExerciseRow({ ex }: { ex: GymExercise }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-zinc-800 last:border-0">
      <div className="flex-1">
        <span className="text-zinc-200 text-sm">{ex.name}</span>
        {ex.notes && <span className="text-zinc-500 text-xs ml-2">({ex.notes})</span>}
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-400 shrink-0">
        <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded">
          {ex.sets}×{ex.reps}
        </span>
        {ex.weight && (
          <span className="text-orange-400">{ex.weight}</span>
        )}
      </div>
    </div>
  );
}

function TodayPlanCard({
  gymDay,
  onStartSession,
}: {
  gymDay: GymDay;
  onStartSession: (day: GymDay) => void;
}) {
  const [open, setOpen] = useState(true);
  const typeColor = TYPE_COLORS[gymDay.type] || "bg-zinc-700/50 text-zinc-300";
  const phaseColor = PHASE_COLORS[gymDay.phase] || "bg-zinc-700/50 text-zinc-300";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-zinc-200 font-semibold text-sm">Plan de hoy</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${typeColor}`}>
            {gymDay.type}
          </span>
          {gymDay.phase !== "Normal" && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${phaseColor}`}>
              {gymDay.phase}
            </span>
          )}
        </div>
        <span className="text-zinc-500 text-xs">{open ? "▲ ocultar" : "▼ ver"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Exercises */}
          {gymDay.exercises.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Ejercicios
              </h3>
              <div>
                {gymDay.exercises.map((ex, i) => (
                  <ExerciseRow key={i} ex={ex} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm italic">
              Sesión de piernas omitida (semana de recuperación post-carrera).
            </p>
          )}

          {/* Core finisher */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Core finisher <span className="text-orange-400 font-normal normal-case">(8-10 min — siempre)</span>
            </h3>
            <div>
              {gymDay.core.map((ex, i) => (
                <ExerciseRow key={i} ex={ex} />
              ))}
            </div>
          </div>

          {/* Start session button */}
          {gymDay.exercises.length > 0 && (
            <button
              onClick={() => onStartSession(gymDay)}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Empezar sesión
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function GymPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Session>({
    date: new Date().toISOString().split("T")[0],
    type: "Push",
    exercises: [emptyExercise()],
    duration_min: 70,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Compute today's gym day (client-side only to avoid hydration mismatch)
  const [todayGymDay, setTodayGymDay] = useState<GymDay | null>(null);
  useEffect(() => {
    setTodayGymDay(getTodayGymDay());
  }, []);

  useEffect(() => {
    fetchSessions().then((d) => { setSessions(d as Session[]); setLoading(false); });
  }, []);

  function handleStartSession(day: GymDay) {
    // Pre-fill form: type, and exercises with name + N empty sets
    const allExercises = [...day.exercises, ...day.core];
    const filledExercises: Exercise[] = allExercises.map((ex) => ({
      name: ex.name,
      sets: Array.from({ length: ex.sets }, () => ({ kg: 0, reps: 0 })),
    }));
    setForm((f) => ({
      ...f,
      type: day.type,
      exercises: filledExercises.length > 0 ? filledExercises : [emptyExercise()],
    }));
    // Scroll to form
    setTimeout(() => {
      document.getElementById("gym-log-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function addExercise() {
    setForm((f) => ({ ...f, exercises: [...f.exercises, emptyExercise()] }));
  }

  function addSet(ei: number) {
    setForm((f) => {
      const exs = [...f.exercises];
      exs[ei] = { ...exs[ei], sets: [...exs[ei].sets, { kg: exs[ei].sets.at(-1)?.kg || 0, reps: exs[ei].sets.at(-1)?.reps || 0 }] };
      return { ...f, exercises: exs };
    });
  }

  function removeSet(ei: number, si: number) {
    setForm((f) => {
      const exs = [...f.exercises];
      exs[ei] = { ...exs[ei], sets: exs[ei].sets.filter((_, i) => i !== si) };
      return { ...f, exercises: exs };
    });
  }

  function removeExercise(ei: number) {
    setForm((f) => ({ ...f, exercises: f.exercises.filter((_, i) => i !== ei) }));
  }

  function updateExerciseName(ei: number, name: string) {
    setForm((f) => {
      const exs = [...f.exercises];
      exs[ei] = { ...exs[ei], name };
      return { ...f, exercises: exs };
    });
  }

  function updateSet(ei: number, si: number, field: "kg" | "reps", value: string) {
    setForm((f) => {
      const exs = [...f.exercises];
      const sets = [...exs[ei].sets];
      sets[si] = { ...sets[si], [field]: parseFloat(value) || 0 };
      exs[ei] = { ...exs[ei], sets };
      return { ...f, exercises: exs };
    });
  }

  async function save() {
    setSaving(true);
    try {
      const result = await saveSession(form as Omit<StoredSession, "id">);
      setSessions((prev) => [result as Session, ...prev]);
      setSaved(true);
      setForm({ date: new Date().toISOString().split("T")[0], type: "Push", exercises: [emptyExercise()], duration_min: 70, notes: "" });
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gym</h1>

      {/* Today's plan — only shown on gym days */}
      {todayGymDay ? (
        <TodayPlanCard gymDay={todayGymDay} onStartSession={handleStartSession} />
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
          <span className="text-zinc-500 text-sm">No hay sesión de gym hoy.</span>
          <span className="text-zinc-500 text-sm">
            Próxima sesión: <span className="text-zinc-300 font-medium">{nextGymDay()}</span>
          </span>
        </div>
      )}

      {/* Log form */}
      <div id="gym-log-form" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold text-zinc-200">Registrar sesión</h2>

        {/* Date + Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Fecha</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Tipo</label>
            <div className="flex gap-2">
              {GYM_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    form.type === t
                      ? "bg-orange-500 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          {form.exercises.map((ex, ei) => (
            <div key={ei} className="bg-zinc-800/60 rounded-xl p-3 space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Ejercicio"
                  value={ex.name}
                  onChange={(e) => updateExerciseName(ei, e.target.value)}
                  list={`suggestions-${ei}`}
                  className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500"
                />
                <datalist id={`suggestions-${ei}`}>
                  {(SUGGESTED_EXERCISES[form.type] || []).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {form.exercises.length > 1 && (
                  <button onClick={() => removeExercise(ei)} className="text-zinc-500 hover:text-red-400 text-sm px-1">✕</button>
                )}
              </div>

              {/* Sets */}
              <div className="space-y-1.5">
                {ex.sets.map((set, si) => (
                  <div key={si} className="flex items-center gap-2">
                    <span className="text-zinc-500 text-xs w-6">S{si + 1}</span>
                    <input
                      type="number"
                      placeholder="kg"
                      value={set.kg || ""}
                      onChange={(e) => updateSet(ei, si, "kg", e.target.value)}
                      className="w-16 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-sm text-zinc-200 text-center"
                    />
                    <span className="text-zinc-600 text-xs">kg ×</span>
                    <input
                      type="number"
                      placeholder="reps"
                      value={set.reps || ""}
                      onChange={(e) => updateSet(ei, si, "reps", e.target.value)}
                      className="w-14 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-sm text-zinc-200 text-center"
                    />
                    <span className="text-zinc-600 text-xs">reps</span>
                    {ex.sets.length > 1 && (
                      <button onClick={() => removeSet(ei, si)} className="text-zinc-600 hover:text-red-400 text-xs ml-auto">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => addSet(ei)} className="text-xs text-orange-400 hover:text-orange-300 mt-1">
                + Serie
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addExercise}
          className="w-full py-2 border border-dashed border-zinc-700 rounded-xl text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
        >
          + Agregar ejercicio
        </button>

        {/* Duration + Notes */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Duración (min)</label>
            <input
              type="number"
              value={form.duration_min}
              onChange={(e) => setForm((f) => ({ ...f, duration_min: parseInt(e.target.value) || 0 }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
            <input
              type="text"
              placeholder="Opcional..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 text-sm placeholder-zinc-600"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
        >
          {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar sesión"}
        </button>
      </div>

      {/* History */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Historial</h2>
        {loading ? (
          <p className="text-zinc-500 text-sm">Cargando...</p>
        ) : sessions.length === 0 ? (
          <p className="text-zinc-500 text-sm">No hay sesiones registradas aún.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionHistoryCard key={s.id || s.date} session={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionHistoryCard({ session }: { session: Session }) {
  const typeColors: Record<string, string> = {
    Push: "bg-blue-500/20 text-blue-300",
    Pull: "bg-green-500/20 text-green-300",
    Piernas: "bg-orange-500/20 text-orange-300",
  };
  const totalSets = session.exercises.reduce((s, e) => s + e.sets.length, 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[session.type] || "bg-zinc-700 text-zinc-300"}`}>
            {session.type}
          </span>
          <span className="text-zinc-400 text-sm">{session.date}</span>
        </div>
        <span className="text-zinc-500 text-xs">{session.duration_min}min · {totalSets} series</span>
      </div>
      <div className="space-y-1">
        {session.exercises.map((ex, i) => {
          const best = ex.sets.reduce((m, s) => s.kg > m ? s.kg : m, 0);
          return (
            <div key={i} className="flex items-center justify-between">
              <span className="text-zinc-300 text-sm">{ex.name}</span>
              <span className="text-zinc-500 text-xs">{ex.sets.length} series · max {best}kg</span>
            </div>
          );
        })}
      </div>
      {session.notes && (
        <p className="text-zinc-500 text-xs mt-2 italic">{session.notes}</p>
      )}
    </div>
  );
}
