import { NextRequest, NextResponse } from "next/server";
import { upsertActivity } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.STRAVA_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": challenge });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    if (event.object_type !== "activity") return NextResponse.json({ status: "ignored" });

    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      }),
    });
    if (!tokenRes.ok) return NextResponse.json({ status: "token_error" });
    const { access_token } = await tokenRes.json();

    const actRes = await fetch(`https://www.strava.com/api/v3/activities/${event.object_id}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!actRes.ok) return NextResponse.json({ status: "fetch_error" });
    const act = await actRes.json();

    await upsertActivity({
      strava_id: act.id,
      date: act.start_date_local?.split("T")[0] ?? new Date().toISOString().split("T")[0],
      name: act.name,
      type: act.type?.toLowerCase() ?? "run",
      distance_m: act.distance,
      duration_s: act.moving_time,
      avg_hr: Math.round(act.average_heartrate ?? 0),
      max_hr: act.max_heartrate ?? 0,
      avg_pace_s_per_km: act.distance > 0 ? Math.round(act.moving_time / (act.distance / 1000)) : 0,
      training_effect: act.perceived_exertion ?? null,
    });

    return NextResponse.json({ status: "saved" });
  } catch (e) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
