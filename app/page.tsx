import { getTodayWorkout, getCurrentWeek, buildPlan } from "@/lib/training-plan";
import WorkoutCard from "@/components/WorkoutCard";
import ReadinessCard from "@/components/ReadinessCard";
import WeekSummary from "@/components/WeekSummary";

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

  const todayDate = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const greeting = getGreeting();

  return (
    <div className="space-y-5">
      {/* Greeting + date */}
      <div className="pt-1">
        <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-1 capitalize">
          {todayDate}
        </p>
        <h1 className="text-2xl font-black text-zinc-50 leading-tight">
          {greeting}, Lucas
        </h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          Semana {currentWeek} de 15
        </p>
      </div>

      {/* Training Readiness */}
      <ReadinessCard />

      {/* Today's session — prominent */}
      {today ? (
        <section>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
            Sesión de hoy
          </h2>
          <WorkoutCard workout={today} expanded />
        </section>
      ) : (
        <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl p-6 text-center">
          <p className="text-4xl mb-3">😴</p>
          <p className="text-zinc-200 font-bold text-lg">Día de descanso</p>
          <p className="text-zinc-500 text-sm mt-1">
            El descanso es parte del entrenamiento.
          </p>
        </div>
      )}

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
      className={`stat-card rounded-xl p-3 border ${
        highlight
          ? "bg-blue-500/10 border-blue-500/30"
          : "bg-zinc-900/80 border-zinc-800/60"
      }`}
    >
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-base leading-none">{icon}</span>
        <p className="text-zinc-400 text-xs">{label}</p>
      </div>
      <p
        className={`font-extrabold text-base leading-none ${
          highlight ? "text-blue-400" : "text-zinc-100"
        }`}
      >
        {value}
      </p>
      <p className="text-zinc-500 text-xs mt-1 leading-snug">{sub}</p>
    </div>
  );
}
