"use client";
import { useState, useEffect } from "react";
import { fetchSessions, saveSession, GymSession as StoredSession } from "@/lib/gym-storage";
import { getTodayGymDay, GymDay, GymExercise } from "@/lib/gym-plan";

interface Set { kg: number; reps: number; rir?: number; completed?: boolean }
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
  return { name: "", sets: [{ kg: 0, reps: 0, rir: undefined, completed: false }] };
}

function nextGymDay(): string {
  const today = new Date().getDay();
  const gymDays = [1, 3, 5];
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  for (let i = 1; i <= 7; i++) {
    const next = (today + i) % 7;
    if (gymDays.includes(next)) return dayNames[next];
  }
  return "Lunes";
}

const TYPE_COLORS: Record<string, string> = {
  Push:    "bg-lime-400/20 text-lime-300 border-lime-400/30",
  Pull:    "bg-green-500/20 text-green-300 border-green-500/30",
  Piernas: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

const PHASE_COLORS: Record<string, string> = {
  Normal:    "bg-zinc-700/50 text-zinc-300",
  Descarga:  "bg-yellow-500/20 text-yellow-300",
  Taper:     "bg-purple-500/20 text-purple-300",
  Recovery:  "bg-red-500/20 text-red-300",
};

function ExerciseRow({ ex }: { ex: GymExercise }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#1e2a35] last:border-0">
      <div className="flex-1">
        <span className="text-slate-200 text-sm">{ex.name}</span>
        {ex.notes && <span className="text-slate-500 text-xs ml-2">({ex.notes})</span>}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
        <span className="font-mono bg-[#1e2a35] px-2 py-0.5 rounded">
          {ex.sets}×{ex.reps}
        </span>
        {ex.weight && (
          <span className="text-lime-400">{ex.weight}</span>
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
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1e2a35]/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-200 font-semibold text-sm">Plan de hoy</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${typeColor}`}>
            {gymDay.type}
          </span>
          {gymDay.phase !== "Normal" && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${phaseColor}`}>
              {gymDay.phase}
            </span>
          )}
        </div>
        <span className="text-slate-500 text-xs">{open ? "▲ ocultar" : "▼ ver"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {gymDay.exercises.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Ejercicios
              </h3>
              <div>
                {gymDay.exercises.map((ex, i) => (
                  <ExerciseRow key={i} ex={ex} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm italic">
              Sesión de piernas omitida (semana de recuperación post-carrera).
            </p>
          )}

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Core finisher <span className="text-lime-400 font-normal normal-case">(8-10 min — siempre)</span>
            </h3>
            <div>
              {gymDay.core.map((ex, i) => (
                <ExerciseRow key={i} ex={ex} />
              ))}
            </div>
          </div>

          {gymDay.exercises.length > 0 && (
            <button
              onClick={() => onStartSession(gymDay)}
              className="w-full py-2.5 bg-lime-400 hover:bg-lime-300 text-[#080c10] font-semibold rounded-xl text-sm transition-colors"
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

  const [todayGymDay, setTodayGymDay] = useState<GymDay | null>(null);
  useEffect(() => {
    setTodayGymDay(getTodayGymDay());
  }, []);

  useEffect(() => {
    fetchSessions().then((d) => { setSessions(d as Session[]); setLoading(false); });
  }, []);

  function handleStartSession(day: GymDay) {
    const allExercises = [...day.exercises, ...day.core];
    const filledExercises: Exercise[] = allExercises.map((ex) => ({
      name: ex.name,
      sets: Array.from({ length: ex.sets }, () => ({ kg: 0, reps: 0, rir: undefined, completed: false })),
    }));
    setForm((f) => ({
      ...f,
      type: day.type,
      exercises: filledExercises.length > 0 ? filledExercises : [emptyExercise()],
    }));
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
      const last = exs[ei].sets.at(-1);
      exs[ei] = {
        ...exs[ei],
        sets: [...exs[ei].sets, { kg: last?.kg || 0, reps: last?.reps || 0, rir: last?.rir, completed: false }],
      };
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

  function updateSet(ei: number, si: number, field: "kg" | "reps" | "rir" | "completed", value: string | boolean) {
    setForm((f) => {
      const exs = [...f.exercises];
      const sets = [...exs[ei].sets];
      if (field === "completed") {
        sets[si] = { ...sets[si], completed: value as boolean };
      } else if (field === "rir") {
        sets[si] = { ...sets[si], rir: value === "" ? undefined : parseInt(value as string) };
      } else {
        sets[si] = { ...sets[si], [field]: parseFloat(value as string) || 0 };
      }
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
      <h1 className="text-2xl font-black text-slate-100">Gym</h1>

      {todayGymDay ? (
        <TodayPlanCard gymDay={todayGymDay} onStartSession={handleStartSession} />
      ) : (
        <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4 flex items-center justify-between">
          <span className="text-slate-500 text-sm">No hay sesión de gym hoy.</span>
          <span className="text-slate-500 text-sm">
            Próxima sesión: <span className="text-slate-300 font-medium">{nextGymDay()}</span>
          </span>
        </div>
      )}

      {/* Log form */}
      <div id="gym-log-form" className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold text-slate-200">Registrar sesión</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full bg-[#080c10] border border-[#1e2a35] rounded-xl px-3 py-2 text-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tipo</label>
            <div className="flex gap-2">
              {GYM_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    form.type === t
                      ? "bg-lime-400 text-[#080c10]"
                      : "bg-[#080c10] border border-[#1e2a35] text-slate-400 hover:text-slate-200"
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
            <div key={ei} className="bg-[#080c10] border border-[#1e2a35] rounded-xl p-3 space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Ejercicio"
                  value={ex.name}
                  onChange={(e) => updateExerciseName(ei, e.target.value)}
                  list={`suggestions-${ei}`}
                  className="flex-1 bg-[#0f1419] border border-[#1e2a35] rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600"
                />
                <datalist id={`suggestions-${ei}`}>
                  {(SUGGESTED_EXERCISES[form.type] || []).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {form.exercises.length > 1 && (
                  <button onClick={() => removeExercise(ei)} className="text-slate-500 hover:text-red-400 text-sm px-1">✕</button>
                )}
              </div>

              {/* Sets header */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-slate-600 text-xs w-6" />
                <span className="text-slate-600 text-xs w-16 text-center">Peso (kg)</span>
                <span className="text-slate-600 text-xs w-14 text-center">Reps</span>
                <span className="text-slate-600 text-xs w-10 text-center">RIR</span>
                <span className="text-slate-600 text-xs ml-auto text-center">✓</span>
              </div>

              {/* Sets */}
              <div className="space-y-1.5">
                {ex.sets.map((set, si) => (
                  <div
                    key={si}
                    className={`flex items-center gap-2 rounded-lg px-1 py-1 transition-colors ${
                      set.completed ? "bg-lime-400/10" : ""
                    }`}
                  >
                    <span className={`text-xs w-6 ${set.completed ? "text-slate-500" : "text-slate-600"}`}>S{si + 1}</span>
                    <input
                      type="number"
                      placeholder="kg"
                      value={set.kg || ""}
                      onChange={(e) => updateSet(ei, si, "kg", e.target.value)}
                      className={`w-16 bg-[#0f1419] border border-[#1e2a35] rounded-lg px-2 py-1 text-sm text-center ${set.completed ? "text-slate-400 opacity-70" : "text-slate-200"}`}
                    />
                    <input
                      type="number"
                      placeholder="reps"
                      value={set.reps || ""}
                      onChange={(e) => updateSet(ei, si, "reps", e.target.value)}
                      className={`w-14 bg-[#0f1419] border border-[#1e2a35] rounded-lg px-2 py-1 text-sm text-center ${set.completed ? "text-slate-400 opacity-70" : "text-slate-200"}`}
                    />
                    <input
                      type="number"
                      placeholder="RIR"
                      min={0}
                      max={5}
                      value={set.rir ?? ""}
                      onChange={(e) => updateSet(ei, si, "rir", e.target.value)}
                      className={`w-10 bg-[#0f1419] border border-[#1e2a35] rounded-lg px-1 py-1 text-sm text-center ${set.completed ? "text-slate-400 opacity-70" : "text-slate-200"}`}
                    />
                    <input
                      type="checkbox"
                      checked={!!set.completed}
                      onChange={(e) => updateSet(ei, si, "completed", e.target.checked)}
                      className="ml-auto w-4 h-4 accent-lime-400 cursor-pointer"
                    />
                    {ex.sets.length > 1 && (
                      <button onClick={() => removeSet(ei, si)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => addSet(ei)} className="text-xs text-lime-400 hover:text-lime-300 mt-1">
                + Serie
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addExercise}
          className="w-full py-2 border border-dashed border-[#1e2a35] rounded-xl text-sm text-slate-500 hover:border-lime-400/30 hover:text-slate-300 transition-colors"
        >
          + Agregar ejercicio
        </button>

        {/* Duration + Notes */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Duración (min)</label>
            <input
              type="number"
              value={form.duration_min}
              onChange={(e) => setForm((f) => ({ ...f, duration_min: parseInt(e.target.value) || 0 }))}
              className="w-full bg-[#080c10] border border-[#1e2a35] rounded-xl px-3 py-2 text-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Notas</label>
            <input
              type="text"
              placeholder="Opcional..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full bg-[#080c10] border border-[#1e2a35] rounded-xl px-3 py-2 text-slate-200 text-sm placeholder-slate-600"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-[#080c10] font-bold rounded-xl transition-colors"
        >
          {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar sesión"}
        </button>
      </div>

      {/* History */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Historial</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Cargando...</p>
        ) : sessions.length === 0 ? (
          <p className="text-slate-500 text-sm">No hay sesiones registradas aún.</p>
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
    Push: "bg-lime-400/20 text-lime-300 border border-lime-400/20",
    Pull: "bg-green-500/20 text-green-300 border border-green-500/20",
    Piernas: "bg-purple-500/20 text-purple-300 border border-purple-500/20",
  };
  const totalSets = session.exercises.reduce((s, e) => s + e.sets.length, 0);

  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[session.type] || "bg-zinc-700 text-zinc-300"}`}>
            {session.type}
          </span>
          <span className="text-slate-400 text-sm">{session.date}</span>
        </div>
        <span className="text-slate-500 text-xs">{session.duration_min}min · {totalSets} series</span>
      </div>
      <div className="space-y-1">
        {session.exercises.map((ex, i) => {
          const best = ex.sets.reduce((m, s) => s.kg > m ? s.kg : m, 0);
          return (
            <div key={i} className="flex items-center justify-between">
              <span className="text-slate-300 text-sm">{ex.name}</span>
              <span className="text-slate-500 text-xs">{ex.sets.length} series · max {best}kg</span>
            </div>
          );
        })}
      </div>
      {session.notes && (
        <p className="text-slate-500 text-xs mt-2 italic">{session.notes}</p>
      )}
    </div>
  );
}
