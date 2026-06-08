import { getTodayWorkout, getCurrentWeek, buildPlan, WorkoutType } from "@/lib/training-plan";
import WeekSummary from "@/components/WeekSummary";
import ReadinessCardCompact from "@/components/ReadinessCardCompact";
import Link from "next/link";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 20) return "Buenas noches";
  if (hour >= 13) return "Buenas tardes";
  return "Buenos días";
}

function workoutIcon(type: WorkoutType): string {
  switch (type) {
    case "easy":     return "🟢";
    case "quality":  return "⚡";
    case "long":     return "🗺️";
    case "race":     return "🏅";
    case "recovery": return "💤";
    default:         return "🏃";
  }
}

export default function Dashboard() {
  const today = getTodayWorkout();
  const currentWeek = getCurrentWeek();
  const weekWorkouts = buildPlan().filter((w) => w.week === currentWeek);

  const greeting = getGreeting();

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-slate-100">{greeting}, Lucas 👋</h1>
        <p className="text-slate-500 text-sm mt-0.5">Listo para tu mejor versión hoy.</p>
      </div>

      {/* Today's workout */}
      <section>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">TU ENTRENAMIENTO DE HOY</p>
        {today ? (
          <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-lime-400/10 flex items-center justify-center text-xl">
                {workoutIcon(today.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-100 font-semibold">{today.title}</p>
                <p className="text-slate-500 text-sm">{today.description || today.phase}</p>
              </div>
              <span className="text-lime-400 font-bold flex-shrink-0">{today.distanceKm}km</span>
            </div>
            <Link
              href="/entrenamiento"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-lime-400 text-[#080c10] font-semibold rounded-xl text-sm"
            >
              Ver rutina →
            </Link>
          </div>
        ) : (
          <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">😴</p>
            <p className="text-slate-300 font-medium">Día de descanso</p>
            <p className="text-slate-500 text-xs mt-1">El descanso es parte del plan.</p>
          </div>
        )}
      </section>

      {/* Readiness */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">TU READINESS</p>
          <Link href="/sueno" className="text-xs text-lime-400">Ver sueño →</Link>
        </div>
        <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
          <ReadinessCardCompact />
        </div>
      </section>

      {/* Weekly summary */}
      <section>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">RESUMEN SEMANAL</p>
        <WeekSummary workouts={weekWorkouts} currentWeek={currentWeek} />
      </section>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="📅" label="Semana" value={`${currentWeek}/15`} sub="del ciclo" />
        <StatCard icon="🏃" label="Media" value="23 ago" sub="meta 1:48-1:52" highlight />
        <StatCard icon="🏅" label="Maratón" value="20 sep" sub="meta 4:00-4:10" />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 border flex flex-col gap-1.5 ${
        highlight
          ? "bg-lime-400/10 border-lime-400/30"
          : "bg-[#0f1419] border-[#1e2a35]"
      }`}
    >
      <span className="text-xl leading-none">{icon}</span>
      <p
        className={`font-extrabold text-base leading-none ${
          highlight ? "text-lime-400" : "text-slate-100"
        }`}
      >
        {value}
      </p>
      <div>
        <p className="text-slate-400 text-xs font-medium">{label}</p>
        <p className="text-slate-500 text-xs leading-snug">{sub}</p>
      </div>
    </div>
  );
}
