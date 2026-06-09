"use client";
import { useState, useEffect } from "react";
import { fetchSessions, saveSession, GymSession as StoredSession } from "@/lib/gym-storage";
import { getTodayGymDay, GymDay, GymExercise } from "@/lib/gym-plan";
import WorkoutSession from "@/components/screens/WorkoutSession";

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

// ── PR detection ──────────────────────────────────────────────────────────────
function detectPR(exerciseName: string, currentKg: number, sessions: Session[]): boolean {
  if (currentKg <= 0) return false;
  const historical = sessions
    .flatMap(s => s.exercises)
    .filter(e => e.name.toLowerCase() === exerciseName.toLowerCase())
    .flatMap(e => e.sets)
    .map(s => s.kg);

  if (historical.length === 0) return false;
  const prevMax = Math.max(...historical);
  return currentKg > prevMax;
}

// ── CounterInput ──────────────────────────────────────────────────────────────
function CounterInput({
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const dec = () => onChange(Math.max(min, parseFloat((value - step).toFixed(2))));
  const inc = () => {
    const next = parseFloat((value + step).toFixed(2));
    onChange(max !== undefined ? Math.min(max, next) : next);
  };
  const display = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return (
    <div className={`flex items-center bg-[#0f1419] border border-[#1e2a35] rounded-xl overflow-hidden ${disabled ? "opacity-60" : ""}`}>
      <button
        type="button"
        onClick={dec}
        disabled={disabled}
        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-lime-400 text-lg transition-colors shrink-0"
      >
        −
      </button>
      <span className="w-10 text-center text-slate-100 font-medium text-sm select-none">{display}</span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled}
        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-lime-400 text-lg transition-colors shrink-0"
      >
        +
      </button>
    </div>
  );
}

// ── ExerciseRow (plan card) ───────────────────────────────────────────────────
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

// ── TodayPlanCard ─────────────────────────────────────────────────────────────
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

// ── ExerciseForm (accordion sets + chips) ────────────────────────────────────
function ExerciseForm({
  ex,
  ei,
  formType,
  sessions,
  onUpdateName,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  showRemove,
}: {
  ex: Exercise;
  ei: number;
  formType: string;
  sessions: Session[];
  onUpdateName: (ei: number, name: string) => void;
  onUpdateSet: (ei: number, si: number, field: "kg" | "reps" | "rir" | "completed", value: string | boolean | number) => void;
  onAddSet: (ei: number) => void;
  onRemoveSet: (ei: number, si: number) => void;
  onRemoveExercise: (ei: number) => void;
  showRemove: boolean;
}) {
  const [expandedSet, setExpandedSet] = useState<number>(ex.sets.length - 1);

  useEffect(() => {
    setExpandedSet(ex.sets.length - 1);
  }, [ex.sets.length]);

  // PR detection: max kg across all current sets for this exercise
  const currentMaxKg = ex.sets.reduce((m, s) => s.kg > m ? s.kg : m, 0);
  const isPR = ex.name.trim().length > 0 && detectPR(ex.name, currentMaxKg, sessions);

  // Exercise completion feedback
  const allSetsCompleted = ex.sets.length > 0 && ex.sets.every(s => s.completed);
  const exerciseVolume = ex.sets.reduce((t, s) => t + s.kg * s.reps, 0);

  return (
    <div className="bg-[#080c10] border border-[#1e2a35] rounded-xl p-3 space-y-3">
      {/* Exercise name + remove */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Escribí o seleccioná un ejercicio..."
          value={ex.name}
          onChange={(e) => onUpdateName(ei, e.target.value)}
          className="flex-1 bg-[#0f1419] border border-[#1e2a35] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-lime-400/50 transition-colors"
        />
        {showRemove && (
          <button
            type="button"
            onClick={() => onRemoveExercise(ei)}
            className="text-slate-500 hover:text-red-400 text-sm px-1 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* PR badge */}
      {isPR && (
        <div className="flex items-center gap-1 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-2 py-1">
          <span className="text-yellow-400 text-sm">🏅</span>
          <span className="text-yellow-400 text-xs font-semibold">¡Nuevo PR personal!</span>
        </div>
      )}

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-1.5">
        {(SUGGESTED_EXERCISES[formType] || []).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onUpdateName(ei, name)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              ex.name === name
                ? "border-lime-400 text-lime-400 bg-lime-400/10"
                : "border-[#1e2a35] text-slate-400 hover:border-lime-400 hover:text-lime-400"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Sets accordion */}
      <div className="space-y-1">
        {ex.sets.map((set, si) => {
          const isExpanded = expandedSet === si;
          const summaryText = `S${si + 1} — ${set.kg}kg × ${set.reps} reps${set.rir !== undefined ? ` (RIR ${set.rir})` : ""}`;
          return (
            <div
              key={si}
              className={`rounded-lg border transition-colors ${
                set.completed
                  ? "border-lime-400/30 bg-lime-400/5"
                  : "border-[#1e2a35] bg-[#0f1419]"
              }`}
            >
              {/* Collapsed summary row */}
              {!isExpanded ? (
                <button
                  type="button"
                  onClick={() => setExpandedSet(si)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-left"
                >
                  <span className={set.completed ? "text-slate-500 line-through" : "text-slate-300"}>
                    {summaryText}
                  </span>
                  {set.completed && (
                    <span className="text-lime-400 text-xs font-bold ml-2">✓</span>
                  )}
                </button>
              ) : (
                /* Expanded set editor */
                <div className="p-2.5 space-y-2">
                  {/* Set label + collapse button */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${set.completed ? "text-lime-400" : "text-slate-400"}`}>
                      Serie {si + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {ex.sets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveSet(ei, si)}
                          className="text-slate-600 hover:text-red-400 text-xs transition-colors"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedSet(-1)}
                        className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
                      >
                        ▲
                      </button>
                    </div>
                  </div>

                  {/* Counter inputs row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-slate-600 text-xs">Peso (kg)</span>
                      <CounterInput
                        value={set.kg}
                        onChange={(v) => onUpdateSet(ei, si, "kg", v)}
                        step={2.5}
                        min={0}
                        disabled={set.completed}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-slate-600 text-xs">Reps</span>
                      <CounterInput
                        value={set.reps}
                        onChange={(v) => onUpdateSet(ei, si, "reps", v)}
                        step={1}
                        min={1}
                        disabled={set.completed}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-slate-600 text-xs">RIR</span>
                      <CounterInput
                        value={set.rir ?? 0}
                        onChange={(v) => onUpdateSet(ei, si, "rir", v)}
                        step={1}
                        min={0}
                        max={5}
                        disabled={set.completed}
                      />
                    </div>
                  </div>

                  {/* Completed checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
                    <input
                      type="checkbox"
                      checked={!!set.completed}
                      onChange={(e) => onUpdateSet(ei, si, "completed", e.target.checked)}
                      className="w-4 h-4 accent-lime-400 cursor-pointer"
                    />
                    <span className="text-xs text-slate-400">Serie completada</span>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onAddSet(ei)}
        className="text-xs text-lime-400 hover:text-lime-300 transition-colors"
      >
        + Serie
      </button>

      {/* Exercise completion feedback */}
      {allSetsCompleted && (
        <div className="flex items-center gap-2 text-lime-400">
          <span>✓</span>
          <span className="text-xs font-medium">Ejercicio completado</span>
          <span className="text-xs text-slate-500">
            · {exerciseVolume.toLocaleString()}kg total
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
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
  const [coachMessage, setCoachMessage] = useState("");

  const [todayGymDay, setTodayGymDay] = useState<GymDay | null>(null);
  const [activeSession, setActiveSession] = useState(false);
  const [sessionGymDay, setSessionGymDay] = useState<GymDay | null>(null);

  useEffect(() => {
    setTodayGymDay(getTodayGymDay());
  }, []);

  useEffect(() => {
    fetchSessions().then((d) => { setSessions(d as Session[]); setLoading(false); });
  }, []);

  // Session volume tracker (only completed sets)
  const sessionVolume = form.exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((setTotal, s) => {
      return setTotal + (s.completed ? s.kg * s.reps : 0);
    }, 0);
  }, 0);

  function handleStartSession(day: GymDay) {
    setSessionGymDay(day);
    setActiveSession(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSessionFinish(completed: {
    type: "Push" | "Pull" | "Piernas";
    exercises: { name: string; sets: { kg: number; reps: number; rir: number; done: boolean }[] }[];
    duration_min: number;
  }) {
    const exercises: Exercise[] = completed.exercises.map(ex => ({
      name: ex.name,
      sets: ex.sets.map(s => ({ kg: s.kg, reps: s.reps, rir: s.rir, completed: s.done })),
    }));
    setForm(f => ({ ...f, type: completed.type, exercises, duration_min: completed.duration_min }));
    setActiveSession(false);
    setTimeout(() => {
      document.getElementById("gym-log-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
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

  function updateSet(
    ei: number,
    si: number,
    field: "kg" | "reps" | "rir" | "completed",
    value: string | boolean | number
  ) {
    setForm((f) => {
      const exs = [...f.exercises];
      const sets = [...exs[ei].sets];
      if (field === "completed") {
        sets[si] = { ...sets[si], completed: value as boolean };
      } else if (field === "rir") {
        if (typeof value === "number") {
          sets[si] = { ...sets[si], rir: value };
        } else {
          sets[si] = { ...sets[si], rir: value === "" ? undefined : parseInt(value as string) };
        }
      } else {
        sets[si] = { ...sets[si], [field]: typeof value === "number" ? value : (parseFloat(value as string) || 0) };
      }
      exs[ei] = { ...exs[ei], sets };
      return { ...f, exercises: exs };
    });
  }

  async function save() {
    setSaving(true);
    setCoachMessage("");
    try {
      const result = await saveSession(form as Omit<StoredSession, "id">);
      setSessions((prev) => [result as Session, ...prev]);
      setSaved(true);

      const messages = [
        "Sesión registrada. Volumen sólido para un día de " + form.type + ".",
        "Bien ejecutado. El cuerpo absorbe esta carga en las próximas 48h.",
        "Registrado. El core al final marca la diferencia para el running.",
        "Sesión completada. Recuperá bien antes de la próxima corrida.",
      ];
      setCoachMessage(messages[Math.floor(Math.random() * messages.length)]);

      setForm({ date: new Date().toISOString().split("T")[0], type: "Push", exercises: [emptyExercise()], duration_min: 70, notes: "" });
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-100">Gym</h1>

      {/* Active session tracker */}
      {activeSession && sessionGymDay && (
        <WorkoutSession
          gymDay={sessionGymDay}
          onFinish={handleSessionFinish}
          onClose={() => setActiveSession(false)}
        />
      )}

      {!activeSession && (todayGymDay ? (
        <TodayPlanCard gymDay={todayGymDay} onStartSession={handleStartSession} />
      ) : (
        <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4 flex items-center justify-between">
          <span className="text-slate-500 text-sm">No hay sesión de gym hoy.</span>
          <span className="text-slate-500 text-sm">
            Próxima sesión: <span className="text-slate-300 font-medium">{nextGymDay()}</span>
          </span>
        </div>
      ))}

      {/* Log form — hidden while session is active */}
      <div id="gym-log-form" className={`bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4 space-y-4 ${activeSession ? "hidden" : ""}`}>
        <h2 className="font-semibold text-slate-200">Registrar sesión</h2>

        {/* Session volume tracker */}
        <div className="flex items-center justify-between bg-[#0f1419] border border-[#1e2a35] rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs uppercase tracking-wide">Volumen sesión</span>
          </div>
          <span className="text-lime-400 font-bold">{sessionVolume.toLocaleString()}kg</span>
        </div>

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
                  type="button"
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
            <ExerciseForm
              key={ei}
              ex={ex}
              ei={ei}
              formType={form.type}
              sessions={sessions}
              onUpdateName={updateExerciseName}
              onUpdateSet={updateSet}
              onAddSet={addSet}
              onRemoveSet={removeSet}
              onRemoveExercise={removeExercise}
              showRemove={form.exercises.length > 1}
            />
          ))}
        </div>

        <button
          type="button"
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
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full py-3 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-[#080c10] font-bold rounded-xl transition-colors"
        >
          {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar sesión"}
        </button>

        {/* Coach message */}
        {coachMessage && (
          <div className="flex items-start gap-2 bg-lime-400/5 border border-lime-400/20 rounded-xl p-3">
            <span className="text-lime-400 mt-0.5">●</span>
            <p className="text-slate-300 text-sm">{coachMessage}</p>
          </div>
        )}
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
            {sessions.map((s, idx) => (
              <SessionHistoryCard key={s.id || s.date} session={s} allSessions={sessions} sessionIndex={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionHistoryCard({
  session,
  allSessions,
  sessionIndex,
}: {
  session: Session;
  allSessions: Session[];
  sessionIndex: number;
}) {
  const typeColors: Record<string, string> = {
    Push: "bg-lime-400/20 text-lime-300 border border-lime-400/20",
    Pull: "bg-green-500/20 text-green-300 border border-green-500/20",
    Piernas: "bg-purple-500/20 text-purple-300 border border-purple-500/20",
  };
  const totalSets = session.exercises.reduce((s, e) => s + e.sets.length, 0);

  const totalVolume = session.exercises
    .flatMap(e => e.sets)
    .reduce((t, s) => t + s.kg * s.reps, 0);

  // Find the previous session of the same type (sessions are ordered newest first, so look at higher indices)
  const prevSameType = allSessions
    .slice(sessionIndex + 1)
    .find(s => s.type === session.type);

  const prevVolume = prevSameType
    ? prevSameType.exercises.flatMap(e => e.sets).reduce((t, s) => t + s.kg * s.reps, 0)
    : null;

  const volumeDelta = prevVolume !== null && prevVolume > 0
    ? ((totalVolume / prevVolume - 1) * 100)
    : null;

  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[session.type] || "bg-zinc-700 text-zinc-300"}`}>
            {session.type}
          </span>
          <span className="text-slate-400 text-sm">{session.date}</span>
          {volumeDelta !== null && (
            <span className={`text-xs font-medium ${volumeDelta >= 0 ? "text-lime-400" : "text-red-400"}`}>
              {volumeDelta >= 0 ? "↑" : "↓"} {Math.abs(volumeDelta).toFixed(0)}% vs anterior
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lime-400 text-xs font-medium">{totalVolume.toLocaleString()}kg</span>
          <span className="text-slate-500 text-xs">{session.duration_min}min · {totalSets} series</span>
        </div>
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
