import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (process.env.SYNC_SECRET && secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activity = await req.json();

  // Normalize from Garmin Connect format
  const durationS = activity.duration ?? activity.movingDuration ?? 0;
  const distanceM = (activity.distance ?? 0) / 100; // Garmin exports in cm
  const avgHr = activity.averageHR ?? activity.avgHr ?? 0;
  const paceSecPerKm = distanceM > 0 ? (durationS / 1000) / (distanceM / 1000) : 0;
  const date = activity.startTimeLocal
    ? new Date(activity.startTimeLocal).toISOString().split("T")[0]
    : activity.startDate ?? new Date().toISOString().split("T")[0];

  const record = {
    garmin_id: activity.activityId ?? null,
    date,
    name: activity.activityName ?? activity.name ?? "Run",
    type: (activity.activityType?.typeKey ?? activity.activityType ?? "running").toLowerCase(),
    distance_m: distanceM,
    duration_s: Math.round((activity.duration ?? durationS) / 1000),
    avg_hr: Math.round(avgHr),
    max_hr: activity.maxHR ?? activity.maxHr ?? 0,
    avg_pace_s_per_km: Math.round(paceSecPerKm),
    training_effect: activity.aerobicTrainingEffect ?? null,
    raw_data: activity,
  };

  if (!isSupabaseConfigured()) {
    console.log("[activity sync]", date, record.name, record.distance_m.toFixed(0) + "m");
    return NextResponse.json({ status: "logged (no db)", date });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("activities").upsert(record, { onConflict: "garmin_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "ok", date, name: record.name });
}
