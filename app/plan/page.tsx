import { buildPlan, getCurrentWeek, WorkoutType } from "@/lib/training-plan";
import WorkoutCard from "@/components/WorkoutCard";

const PHASE_COLORS: Record<string, string> = {
  "Base Aeróbica":            "border-blue-500/30 bg-blue-500/5",
  "Build":                    "border-orange-500/30 bg-orange-500/5",
  "Taper Media":              "border-purple-500/30 bg-purple-500/5",
  "Recovery + Build Maratón": "border-green-500/30 bg-green-500/5",
  "Taper Maratón":            "border-red-500/30 bg-red-500/5",
};

export default function PlanPage() {
  const plan = buildPlan();
  const currentWeek = getCurrentWeek();

  // Group by week
  const weeks = Array.from({ length: 15 }, (_, i) => i + 1);

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold mb-6">Plan de 15 semanas</h1>

      {weeks.map((week) => {
        const workouts = plan.filter((w) => w.week === week);
        if (workouts.length === 0) return null;
        const phase = workouts[0].phase;
        const totalKm = workouts.reduce((s, w) => s + w.distanceKm, 0);
        const isCurrentWeek = week === currentWeek;
        const isPast = week < currentWeek;
        const phaseStyle = PHASE_COLORS[phase] || "border-zinc-700 bg-zinc-900";

        return (
          <details
            key={week}
            open={isCurrentWeek}
            className={`border rounded-2xl overflow-hidden ${phaseStyle} ${isPast ? "opacity-60" : ""}`}
          >
            <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
              <div className="flex items-center gap-3">
                {isCurrentWeek && (
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                )}
                <div>
                  <p className="font-semibold text-zinc-200">
                    Semana {week}
                    {isCurrentWeek && (
                      <span className="ml-2 text-xs text-orange-400 font-normal">← actual</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500">{phase}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-zinc-300 font-medium text-sm">{totalKm}km</p>
                <p className="text-zinc-600 text-xs">{workouts.length} sesiones</p>
              </div>
            </summary>

            <div className="px-4 pb-4 space-y-3">
              {workouts.map((w) => (
                <WorkoutCard key={w.date} workout={w} expanded={isCurrentWeek} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
