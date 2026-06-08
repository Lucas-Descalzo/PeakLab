import Link from "next/link";
import { getTodayWorkout, getCurrentWeek } from "@/lib/training-plan";
import { getTodayGymDay } from "@/lib/gym-plan";
import WorkoutCard from "@/components/WorkoutCard";

const ZONES = [
  { label: "Z2 Easy",   pace: "5:55-6:15/km", hr: "HR 121-140" },
  { label: "Z4 Umbral", pace: "5:05-5:20/km", hr: "HR 161-180" },
  { label: "Z5 VO2",    pace: "4:30-4:50/km", hr: "HR 181+"    },
];

function getCoachTip(type: string, phase: string): string {
  // Gym tips
  if (type === "Push") {
    return "Push day. Activá el manguito rotador antes del press. Si el primer set es pesado, hacé uno de calentamiento previo.";
  }
  if (type === "Pull") {
    return "Pull day. Enfocate en el recorrido completo, especialmente la extensión superior en dominadas.";
  }
  if (type === "Piernas") {
    return "Leg day. Los hip thrust son la prioridad para el running. Activá glúteos antes con 2 series livianas.";
  }

  // Running tips
  if (type === "easy" || type === "recovery") {
    return "Salida fácil. Si podés hablar sin esfuerzo, vas perfecto. HR < 140 es el objetivo.";
  }
  if (type === "quality") {
    const phaseLower = phase.toLowerCase();
    if (phaseLower.includes("tempo") || phaseLower.includes("umbral") || phaseLower.includes("ritmo maratón")) {
      return "Tempo run. El ritmo tiene que sentirse 'cómodamente difícil' — podés decir palabras sueltas, no oraciones.";
    }
    return "Sesión de calidad. Calentá bien 10min antes de los esfuerzos. Cada serie debe sentirse al 90% de esfuerzo.";
  }
  if (type === "long") {
    return "Long run. Ritmo conversacional todo el tiempo. Si necesitás bajar el ritmo en el km 10, es normal.";
  }
  if (type === "race") {
    return "Día de carrera. Salí 10-15seg más lento que tu objetivo los primeros 5km. La energía llega después.";
  }

  return "Escuchá el cuerpo. El objetivo de hoy es ejecutar bien, no perfectamente.";
}

const LAST_SESSION_MAP: Record<string, string> = {
  "Press banca": "110kg × 8 · hace 7 días",
  "Bulgarian split squat": "25kg × 6 · hace 7 días",
  "Hip thrust": "Primera vez",
  "Remo con barra": "95kg × 8 · hace 7 días",
  "Dominadas con peso": "BW × 10 · hace 7 días",
};

function getLastSession(name: string): string {
  return LAST_SESSION_MAP[name] ?? "Sin registro previo";
}

const HAS_HISTORY = new Set(["Press banca", "Remo con barra"]);

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

  // Determine coach tip context
  const coachType = gymDay ? gymDay.type : (runWorkout ? runWorkout.type : "rest");
  const coachPhase = gymDay ? gymDay.phase : (runWorkout ? runWorkout.title : "");

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

      {/* Coach tip del día — visible cuando hay entrenamiento */}
      {(showGym || showRun) && (
        <div className="bg-lime-400/5 border border-lime-400/20 rounded-xl p-3 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-lime-400 text-sm mt-0.5">●</span>
            <div>
              <p className="text-lime-400 text-xs font-semibold uppercase tracking-wide mb-1">Coach</p>
              <p className="text-slate-300 text-sm leading-relaxed">{getCoachTip(coachType, coachPhase)}</p>
            </div>
          </div>
        </div>
      )}

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
              {gymDay.exercises.map((ex, i) => {
                const hasHistory = HAS_HISTORY.has(ex.name);
                return (
                  <div key={ex.name} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs w-5 text-center">{i + 1}</span>
                        <p className="text-slate-100 font-medium text-sm">{ex.name}</p>
                      </div>
                      <p className="text-slate-500 text-xs">{ex.sets}×{ex.reps}</p>
                    </div>
                    {/* Última ejecución — estático por ahora, en futuro vendrá de Upstash */}
                    <p className="text-xs text-slate-600 ml-7 mb-2">
                      Última vez: {getLastSession(ex.name)} · Objetivo hoy: {ex.weight ?? "ver notas"}
                    </p>
                    {hasHistory && (
                      <span className="text-xs bg-blue-400/10 text-blue-400 px-2 py-0.5 rounded-full ml-7">
                        ↑ Intentá +2.5kg hoy
                      </span>
                    )}
                    {ex.notes && (
                      <p className="text-slate-500 text-xs mt-1 ml-7 leading-snug">{ex.notes}</p>
                    )}
                  </div>
                );
              })}
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
