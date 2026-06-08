import { getTodayWorkout, getCurrentWeek, buildPlan } from "@/lib/training-plan";
import WeekSummary from "@/components/WeekSummary";
import ReadinessCardCompact from "@/components/ReadinessCardCompact";
import Link from "next/link";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 20) return "Buenas noches";
  if (hour >= 13) return "Buenas tardes";
  return "Buenos días";
}

export default function Dashboard() {
  const today = getTodayWorkout();
  const currentWeek = getCurrentWeek();
  const weekWorkouts = buildPlan().filter((w) => w.week === currentWeek);

  const greeting = getGreeting();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-2xl font-black text-slate-100 leading-tight">
          {greeting}, Lucas 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Listo para tu mejor versión hoy.
        </p>
      </div>

      {/* Card: Entrenamiento de hoy */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">
          Tu entrenamiento de hoy
        </p>
        {today ? (
          <div>
            <h2 className="text-slate-100 font-bold text-lg leading-tight">{today.title}</h2>
            {today.description && (
              <p className="text-slate-500 text-sm mt-1 leading-snug">{today.description}</p>
            )}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-1.5">
                <span className="text-lime-400 font-extrabold text-xl leading-none">{today.distanceKm}</span>
                <span className="text-slate-500 text-sm">km</span>
              </div>
              <Link
                href="/plan"
                className="bg-lime-400 text-[#080c10] font-semibold rounded-xl px-4 py-2 text-sm"
              >
                Ver rutina →
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-slate-100 font-bold text-base">Día de descanso</p>
            <p className="text-slate-500 text-sm mt-1">El descanso es parte del plan.</p>
          </div>
        )}
      </div>

      {/* Card: Readiness */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">
          Tu readiness
        </p>
        <ReadinessCardCompact />
      </div>

      {/* Week summary */}
      <WeekSummary workouts={weekWorkouts} currentWeek={currentWeek} />

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon="📅"
          label="Semana"
          value={`${currentWeek}/15`}
          sub="del ciclo"
        />
        <StatCard
          icon="🏃"
          label="Media"
          value="23 ago"
          sub="obj 1:48–1:52"
          highlight
        />
        <StatCard
          icon="🏁"
          label="Maratón"
          value="20 sep"
          sub="obj 4:00–4:10"
        />
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
      className={`rounded-xl p-3 border ${
        highlight
          ? "bg-lime-400/10 border-lime-400/30"
          : "bg-[#0f1419] border-[#1e2a35]"
      }`}
    >
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-base leading-none">{icon}</span>
        <p className="text-slate-500 text-xs">{label}</p>
      </div>
      <p
        className={`font-extrabold text-base leading-none ${
          highlight ? "text-lime-400" : "text-slate-100"
        }`}
      >
        {value}
      </p>
      <p className="text-slate-500 text-xs mt-1 leading-snug">{sub}</p>
    </div>
  );
}
