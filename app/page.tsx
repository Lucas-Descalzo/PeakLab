import { getTodayWorkout, getCurrentWeek, buildPlan } from "@/lib/training-plan";
import WorkoutCard from "@/components/WorkoutCard";
import ReadinessCard from "@/components/ReadinessCard";
import WeekSummary from "@/components/WeekSummary";

export default function Dashboard() {
  const today = getTodayWorkout();
  const currentWeek = getCurrentWeek();
  const weekWorkouts = buildPlan().filter((w) => w.week === currentWeek);

  const todayDate = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-zinc-400 text-sm capitalize">{todayDate}</p>
        <h1 className="text-2xl font-bold text-zinc-100">Hoy</h1>
        <p className="text-zinc-500 text-sm">Semana {currentWeek} de 15</p>
      </div>

      <ReadinessCard />

      {today ? (
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Sesión de hoy
          </h2>
          <WorkoutCard workout={today} expanded />
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
          <p className="text-3xl mb-2">😴</p>
          <p className="text-zinc-300 font-medium">Día de descanso</p>
          <p className="text-zinc-500 text-sm mt-1">
            El descanso es parte del entrenamiento.
          </p>
        </div>
      )}

      <WeekSummary workouts={weekWorkouts} currentWeek={currentWeek} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Semana" value={`${currentWeek}/15`} sub="del ciclo" />
        <StatCard label="Media" value="23 ago" sub="objetivo 1:48-1:52" highlight />
        <StatCard label="Maratón" value="20 sep" sub="objetivo 4:00-4:10" />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: {
  label: string; value: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 border ${highlight ? "bg-orange-500/10 border-orange-500/30" : "bg-zinc-900 border-zinc-800"}`}>
      <p className="text-zinc-400 text-xs">{label}</p>
      <p className={`font-bold text-lg ${highlight ? "text-orange-400" : "text-zinc-100"}`}>{value}</p>
      <p className="text-zinc-500 text-xs">{sub}</p>
    </div>
  );
}
