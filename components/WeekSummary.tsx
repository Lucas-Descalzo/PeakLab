"use client";
import { useState } from "react";
import { PlannedWorkout, WorkoutType } from "@/lib/training-plan";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const TYPE_COLOR: Record<WorkoutType, string> = {
  easy:     "bg-blue-500",
  quality:  "bg-yellow-400",
  long:     "bg-purple-500",
  race:     "bg-red-500",
  rest:     "bg-zinc-700",
  recovery: "bg-green-500",
};

const TYPE_RING: Record<WorkoutType, string> = {
  easy:     "ring-blue-500/60",
  quality:  "ring-yellow-400/60",
  long:     "ring-purple-500/60",
  race:     "ring-red-500/60",
  rest:     "ring-zinc-600/40",
  recovery: "ring-green-500/60",
};

export default function WeekSummary({
  workouts,
  currentWeek,
}: {
  workouts: PlannedWorkout[];
  currentWeek: number;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const totalKm = workouts.reduce((s, w) => s + w.distanceKm, 0);
  const today = new Date().toISOString().split("T")[0];

  // Build a map: dayOfWeek (0-6) → workout
  const byDay: Record<number, PlannedWorkout> = {};
  for (const w of workouts) {
    const d = new Date(w.date + "T00:00:00").getDay();
    byDay[d] = w;
  }

  const todayDow = new Date().getDay();
  const selectedWorkout = workouts.find((w) => w.date === selectedDate) ?? null;

  // Completion stats — all workouts (including rest days) count toward total per spec
  const completed = workouts.filter((w) => w.date < today).length;
  const total = workouts.length;
  const progressPct = total > 0 ? (completed / total) * 100 : 0;
  // For display, non-rest workouts only
  const totalWorkouts = workouts.filter((w) => w.type !== "rest").length;
  const completedWorkouts = workouts.filter(
    (w) => w.type !== "rest" && w.date < today
  ).length;

  function handleDayClick(dow: number) {
    const w = byDay[dow];
    if (!w || w.type === "rest") return;
    setSelectedDate((prev) => (prev === w.date ? null : w.date));
  }

  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Semana {currentWeek}
        </h2>
        <span className="text-slate-100 font-semibold text-sm">
          {completedWorkouts}/{totalWorkouts}{" "}
          <span className="text-slate-500 font-normal">completados</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-[#1e2a35] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-lime-400 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* 7-day circles */}
      <div className="flex justify-between items-end gap-1">
        {DAY_LABELS.map((label, dow) => {
          const workout = byDay[dow];
          const hasTraining = workout && workout.type !== "rest";
          const isToday = dow === todayDow;
          const isPast = workout ? workout.date < today : false;
          const isSelected = workout ? workout.date === selectedDate : false;

          return (
            <div
              key={dow}
              className="flex flex-col items-center gap-1.5 cursor-pointer"
              style={{ WebkitTapHighlightColor: "transparent" }}
              onClick={() => handleDayClick(dow)}
            >
              <div
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  hasTraining ? `${TYPE_COLOR[workout.type]} ${isSelected ? `ring-2 ${TYPE_RING[workout.type]}` : ""}` : "bg-[#1e2a35]",
                  isToday ? "ring-2 ring-white/70 ring-offset-1 ring-offset-[#0f1419]" : "",
                  isPast && !isToday ? "opacity-35" : "",
                ].filter(Boolean).join(" ")}
              >
                {hasTraining && (
                  <span className="text-white font-bold text-xs">
                    {workout.distanceKm}
                  </span>
                )}
              </div>
              <span className={`text-xs ${isToday ? "text-slate-200 font-semibold" : "text-slate-600"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Volume */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-slate-500 text-xs">Volumen</span>
        <span className="text-slate-300 font-semibold text-sm">{totalKm}km</span>
      </div>

      {/* Selected day detail */}
      {selectedWorkout && (
        <div className="mt-4 pt-3 border-t border-[#1e2a35]">
          <div className="flex items-center justify-between">
            <p className="text-slate-200 text-sm font-semibold">{selectedWorkout.title}</p>
            <span className="text-slate-500 text-xs">{selectedWorkout.distanceKm}km</span>
          </div>
          {selectedWorkout.description && (
            <p className="text-slate-500 text-xs mt-0.5 leading-snug">{selectedWorkout.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
