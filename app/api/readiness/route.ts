import { NextResponse } from "next/server";
import { calcReadiness, calcTrainingLoad } from "@/lib/training-readiness";
import { getLatestWellness, getRecentActivities } from "@/lib/db";

export async function GET() {
  const wellness = await getLatestWellness();
  const activities = await getRecentActivities(42);

  const activityData = activities.map((a) => ({
    date: a.date,
    duration_s: a.duration_s,
    avg_hr: a.avg_hr,
    distance_m: a.distance_m,
  }));

  const load = calcTrainingLoad(activityData.length > 0 ? activityData : [
    { date: "2026-06-02", duration_s: 1812, avg_hr: 163, distance_m: 5554 },
    { date: "2026-05-31", duration_s: 3486, avg_hr: 164, distance_m: 10324 },
    { date: "2026-05-28", duration_s: 2106, avg_hr: 167, distance_m: 6951 },
    { date: "2026-05-26", duration_s: 3187, avg_hr: 161, distance_m: 9500 },
    { date: "2026-05-24", duration_s: 2767, avg_hr: 154, distance_m: 7951 },
  ]);

  const wellnessData = {
    date: wellness?.date ?? "2026-06-06",
    hrv: wellness?.hrv ?? 77,
    hrv_baseline_lower: wellness?.hrv_baseline_lower ?? 55,
    hrv_baseline_upper: wellness?.hrv_baseline_upper ?? 99,
    sleep_total_s: wellness?.sleep_total_s ?? Math.round(8.2 * 3600),
    sleep_score: wellness?.sleep_score ?? 89,
  };

  const readiness = calcReadiness(wellnessData, load);
  return NextResponse.json({ ...readiness, hrv: wellnessData.hrv });
}
