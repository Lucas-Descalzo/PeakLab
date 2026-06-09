import { NextRequest, NextResponse } from "next/server";
import { upsertActivity } from "@/lib/db";

const HR_MAX = 201;
const HR_REST = 45;

function calcTRIMP(durS: number, avgHr: number): number {
  if (!avgHr || avgHr <= HR_REST) return 0;
  const ratio = (avgHr - HR_REST) / (HR_MAX - HR_REST);
  return (durS / 60) * ratio * 0.64 * Math.exp(1.92 * ratio);
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (process.env.SYNC_SECRET && secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
    return NextResponse.json({ error: "Storage not configured — KV_REST_API_URL missing in Vercel" }, { status: 503 });
  }

  const body = await req.json();
  const durationS = Math.round((body.duration_s ?? body.duration ?? body.movingDuration ?? 0) / (body.duration_s ? 1 : 1000));
  const distanceM = body.distance_m ?? (body.distance ?? 0) / 100;
  const avgHr = Math.round(body.avg_hr ?? body.averageHR ?? body.avgHr ?? 0);
  const paceSecPerKm = distanceM > 0 ? durationS / (distanceM / 1000) : 0;
  const date = body.date ?? (
    body.startTimeLocal
      ? new Date(body.startTimeLocal).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const zone_1_s = body.zone_1_s ?? null;
  const zone_2_s = body.zone_2_s ?? null;
  const zone_3_s = body.zone_3_s ?? null;
  const zone_4_s = body.zone_4_s ?? null;
  const zone_5_s = body.zone_5_s ?? null;
  const aerobic_te = body.aerobicTrainingEffect ?? body.aerobic_te ?? null;
  const anaerobic_te = body.anaerobicTrainingEffect ?? body.anaerobic_te ?? null;
  const recovery_time_s = body.recovery_time_s ?? null;

  const trimp =
    durationS > 0 && avgHr > 0
      ? Math.round(calcTRIMP(durationS, avgHr))
      : null;

  await upsertActivity({
    garmin_id: body.garmin_id ?? body.activityId,
    date,
    name: body.name ?? body.activityName ?? "Run",
    type: body.type ?? (body.activityType?.typeKey ?? "running").toLowerCase(),
    distance_m: distanceM,
    duration_s: durationS,
    avg_hr: avgHr,
    max_hr: body.max_hr ?? body.maxHR ?? 0,
    avg_pace_s_per_km: body.avg_pace_s_per_km ?? Math.round(paceSecPerKm),
    training_effect: body.training_effect ?? body.aerobicTrainingEffect,
    ...(zone_1_s !== null && { zone_1_s }),
    ...(zone_2_s !== null && { zone_2_s }),
    ...(zone_3_s !== null && { zone_3_s }),
    ...(zone_4_s !== null && { zone_4_s }),
    ...(zone_5_s !== null && { zone_5_s }),
    ...(aerobic_te !== null && { aerobic_te }),
    ...(anaerobic_te !== null && { anaerobic_te }),
    ...(recovery_time_s !== null && { recovery_time_s }),
    ...(trimp !== null && { trimp }),
  });

  return NextResponse.json({ status: "ok", date });
}
