import Link from "next/link";
import { getTodayWorkout, getCurrentWeek } from "@/lib/training-plan";
import { getTodayGymDay } from "@/lib/gym-plan";
import WorkoutCard from "@/components/WorkoutCard";

const ZONES = [
  { label: "Z2 Easy",   pace: "5:55-6:15/km", hr: "HR 121-140" },
  { label: "Z4 Umbral", pace: "5:05-5:20/km", hr: "HR 161-180" },
  { label: "Z5 VO2",    pace: "4:30-4:50/km", hr: "HR 181+"    },
];

export default function EntrenamientoPage() {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat

  const isGymDay    = dow === 1 || dow === 3 || dow === 5; // Mon/Wed/Fri
  const isRunDay    = dow === 2 || dow === 4 || dow === 0; // Tue/Thu/Sun
  const isRestDay   = dow === 6;                           // Sat

  const gymDay     = isGymDay  ? getTodayGymDay()    : null;
  const runWorkout = isRunDay  ? getTodayWorkout()   : null;
  const currentWeek = getCurrentWeek();

  // Fallback: if gym day but no gymDay returned (e.g. Recovery + Piernas), treat as rest
  const showGym  = isGymDay && gymDay !== null;
  const showRun  = isRunDay && runWorkout !== null;
  const showRest = isRestDay || (isGymDay && !gymDay) || (isRunDay && !runWorkout);

  const totalSets = gymDay
    ? [...gymDay.exercises, ...gymDay.core].reduce((acc, ex) => acc + ex.sets, 0)
    : 0;

  const DAY_LABEL: Record<number, string> = {
    0: "Domingo", 1: "Lunes", 2: "Martes",
    3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="pt-1">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">
          {DAY_LABEL[dow]}
        </p>
        <h1 className="text-2xl font-black text-slate-100 leading-tight">
          Entrenamiento de hoy
        </h1>
      </div>

      {/* ── GYM VIEW ── */}
      {showGym && gymDay && (
        <div className="space-y-4">
          {/* Hero header */}
          <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-3xl font-black text-slate-100 leading-none">
                  {gymDay.type.toUpperCase()}
                </h2>
                <p className="text-slate-500 text-sm mt-1">{gymDay.phase}</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20 mt-1">
                Semana {currentWeek}
              </span>
            </div>

            {/* Stats row */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-[#1e2a35]">
              {[
                { label: "Duración est.", value: "~70 min" },
                { label: "Ejercicios",   value: `${gymDay.exercises.length}` },
                { label: "Series total", value: `${totalSets}` },
              ].map((s) => (
                <div key={s.label} className="flex-1 text-center">
                  <p className="text-slate-100 font-extrabold text-lg leading-none">{s.value}</p>
                  <p className="text-slate-500 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Exercise list */}
          <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                Ejercicios
              </p>
            </div>
            <div className="divide-y divide-[#1e2a35]">
              {gymDay.exercises.map((ex, i) => (
                <div key={ex.name} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="text-slate-600 text-sm font-bold w-5 text-right flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-100 text-sm font-semibold leading-tight">{ex.name}</p>
                    {ex.notes && (
                      <p className="text-slate-500 text-xs mt-0.5 leading-snug">{ex.notes}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-slate-100 text-sm font-bold">
                      {ex.sets} × {ex.reps}
                    </p>
                    {ex.weight && (
                      <p className="text-slate-500 text-xs mt-0.5">{ex.weight}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Core finisher */}
          {gymDay.core.length > 0 && (
            <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl overflow-hidden">
              <div className="px-5 pt-4 pb-2">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                  Core Finisher
                </p>
              </div>
              <div className="divide-y divide-[#1e2a35]">
                {gymDay.core.map((ex, i) => (
                  <div key={ex.name} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="text-slate-600 text-sm font-bold w-5 text-right flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-100 text-sm font-semibold leading-tight">{ex.name}</p>
                      {ex.notes && (
                        <p className="text-slate-500 text-xs mt-0.5 leading-snug">{ex.notes}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-slate-100 text-sm font-bold">
                        {ex.sets} × {ex.reps}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <Link
            href="/gym"
            className="block w-full bg-lime-400 text-[#080c10] font-black text-base text-center rounded-2xl py-4 hover:bg-lime-300 transition-colors"
          >
            Iniciar entrenamiento →
          </Link>
        </div>
      )}

      {/* ── RUNNING VIEW ── */}
      {showRun && runWorkout && (
        <div className="space-y-4">
          <WorkoutCard workout={runWorkout} expanded />

          {/* Zone reference */}
          <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-4">
              Zonas de referencia
            </p>
            <div className="space-y-3">
              {ZONES.map((z) => (
                <div key={z.label} className="flex items-center justify-between gap-3">
                  <span className="text-slate-400 text-sm font-semibold w-24 flex-shrink-0">
                    {z.label}
                  </span>
                  <span className="text-slate-100 text-sm font-bold flex-1">{z.pace}</span>
                  <span className="text-slate-500 text-xs text-right">{z.hr}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── REST / NO WORKOUT VIEW ── */}
      {showRest && (
        <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">😴</p>
          <p className="text-slate-100 font-bold text-lg">Día de descanso</p>
          <p className="text-slate-500 text-sm mt-2 leading-snug">
            El descanso es parte del entrenamiento.
          </p>
        </div>
      )}
    </div>
  );
}
