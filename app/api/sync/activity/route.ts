import { NextRequest, NextResponse } from "next/server";
import { upsertActivity } from "@/lib/db";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (process.env.SYNC_SECRET && secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activity = await req.json();
  const durationS = Math.round((activity.duration ?? activity.movingDuration ?? 0) / 1000);
  const distanceM = (activity.distance ?? 0) / 100; // cm → m
  const avgHr = Math.round(activity.averageHR ?? activity.avgHr ?? 0);
  const paceSecPerKm = distanceM > 0 ? durationS / (distanceM / 1000) : 0;
  const date = activity.startTimeLocal
    ? new Date(activity.startTimeLocal).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  await upsertActivity({
    garmin_id: activity.activityId,
    date,
    name: activity.activityName ?? activity.name ?? "Run",
    type: (activity.activityType?.typeKey ?? "running").toLowerCase(),
    distance_m: distanceM,
    duration_s: durationS,
    avg_hr: avgHr,
    max_hr: activity.maxHR ?? 0,
    avg_pace_s_per_km: Math.round(paceSecPerKm),
    training_effect: activity.aerobicTrainingEffect,
  });

  return NextResponse.json({ status: "ok", date });
}
