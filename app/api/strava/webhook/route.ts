import { NextRequest, NextResponse } from "next/server";

// Strava webhook verification (GET) and event handler (POST)
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

    // Only process activity creation/update
    if (event.object_type !== "activity") {
      return NextResponse.json({ status: "ignored" });
    }

    const activityId = event.object_id;
    const athleteId = event.owner_id;

    // Fetch activity details from Strava
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

    if (!tokenRes.ok) {
      console.error("Token refresh failed");
      return NextResponse.json({ status: "token_error" });
    }

    const { access_token } = await tokenRes.json();

    const activityRes = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!activityRes.ok) {
      return NextResponse.json({ status: "fetch_error" });
    }

    const activity = await activityRes.json();

    // Save to Supabase
    const { supabaseAdmin } = await import("@/lib/supabase");
    const db = supabaseAdmin();

    const durationS = activity.moving_time;
    const distanceM = activity.distance;
    const avgHr = activity.average_heartrate || 0;
    const paceSecPerKm = distanceM > 0 ? durationS / (distanceM / 1000) : 0;

    await db.from("activities").upsert({
      strava_id: activityId,
      date: activity.start_date_local?.split("T")[0],
      name: activity.name,
      type: activity.type?.toLowerCase(),
      distance_m: distanceM,
      duration_s: durationS,
      avg_hr: Math.round(avgHr),
      max_hr: activity.max_heartrate || 0,
      avg_pace_s_per_km: Math.round(paceSecPerKm),
      raw_data: activity,
    }, { onConflict: "strava_id" });

    return NextResponse.json({ status: "saved" });
  } catch (e) {
    console.error("Webhook error:", e);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
