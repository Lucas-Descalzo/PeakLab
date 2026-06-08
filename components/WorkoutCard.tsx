import { PlannedWorkout, WorkoutType } from "@/lib/training-plan";

const TYPE_STYLES: Record<WorkoutType, {
  bg: string; border: string; badge: string; label: string; icon: string;
}> = {
  easy:     { bg: "bg-blue-500/8",    border: "border-blue-500/25",   badge: "bg-blue-500/20 text-blue-300",     label: "Fácil",     icon: "🟦" },
  quality:  { bg: "bg-yellow-500/8",  border: "border-yellow-500/25", badge: "bg-yellow-500/20 text-yellow-300", label: "Calidad",   icon: "⚡" },
  long:     { bg: "bg-purple-500/8",  border: "border-purple-500/25", badge: "bg-purple-500/20 text-purple-300", label: "Long Run",  icon: "🗺️" },
  race:     { bg: "bg-red-500/8",     border: "border-red-500/25",    badge: "bg-red-500/20 text-red-300",       label: "Carrera",   icon: "🏅" },
  rest:     { bg: "bg-zinc-800/40",   border: "border-zinc-700/50",   badge: "bg-zinc-700 text-zinc-400",        label: "Descanso",  icon: "😴" },
  recovery: { bg: "bg-green-500/8",   border: "border-green-500/25",  badge: "bg-green-500/20 text-green-300",   label: "Recupero",  icon: "💤" },
};

export default function WorkoutCard({
  workout,
  expanded = false,
}: {
  workout: PlannedWorkout;
  expanded?: boolean;
}) {
  const s = TYPE_STYLES[workout.type];

  return (
    <div className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
      {/* Top row: icon + title block + distance */}
      <div className="flex items-start gap-3">
        {/* Big icon */}
        <div className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-black/20 text-2xl leading-none">
          {s.icon}
        </div>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5 ${s.badge}`}>
            {s.label}
          </span>
          <h3 className="text-zinc-50 font-bold text-base leading-tight">{workout.title}</h3>
          {workout.description && (
            <p className="text-zinc-400 text-sm mt-1 leading-snug">{workout.description}</p>
          )}
        </div>

        {/* Distance */}
        <div className="flex-shrink-0 text-right">
          <p className="text-zinc-200 font-extrabold text-lg leading-none">{workout.distanceKm}</p>
          <p className="text-zinc-500 text-xs mt-0.5">km</p>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/8 space-y-3">
          <p className="text-zinc-300 text-sm leading-relaxed">{workout.details}</p>

          {(workout.paceTarget || workout.hrTarget) && (
            <div className="flex flex-wrap gap-2">
              {workout.paceTarget && (
                <MetricChip icon="⏱" label={workout.paceTarget} />
              )}
              {workout.hrTarget && (
                <MetricChip icon="❤️" label={workout.hrTarget} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700/50 text-zinc-200 text-sm font-medium px-3 py-1.5 rounded-xl">
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
