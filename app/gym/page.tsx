"use client";
import { useState, useEffect } from "react";
import { fetchSessions, saveSession, exerciseHistory, GymSession as StoredSession } from "@/lib/gym-storage";

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
  Push:    ["Press banca", "Press inclinado mancuernas", "Press militar", "Fondos con peso", "Elevaciones laterales", "Triceps polea"],
  Pull:    ["Dominadas", "Remo con barra", "Remo en polea", "Face pull", "Curl bíceps", "Pullover"],
  Piernas: ["Bulgarian split squat", "Hip thrust", "Prensa 45°", "Isquios máquina", "Abducción cadera", "Elevación talones (single leg)"],
};

function emptyExercise(): Exercise {
  return { name: "", sets: [{ kg: 0, reps: 0 }] };
}

export default function GymPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Session>({
    date: new Date().toISOString().split("T")[0],
    type: "Push",
    exercises: [emptyExercise()],
    duration_min: 60,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSessions().then((d) => { setSessions(d as Session[]); setLoading(false); });
  }, []);

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
      setForm({ date: new Date().toISOString().split("T")[0], type: "Push", exercises: [emptyExercise()], duration_min: 60, notes: "" });
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gym</h1>

      {/* Log form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
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
