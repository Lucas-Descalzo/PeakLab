import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  // Validate sync secret
  const secret = req.headers.get("x-sync-secret");
  if (process.env.SYNC_SECRET && secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, hrv, hrv_status, hrv_baseline_lower, hrv_baseline_upper,
          sleep_total_s, sleep_deep_s, sleep_rem_s, sleep_score, resting_hr } = body;

  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  if (!isSupabaseConfigured()) {
    // Log to console if no DB
    console.log("[wellness sync]", date, { hrv, sleep_score });
    return NextResponse.json({ status: "logged (no db)" });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("wellness").upsert({
    date, hrv, hrv_status, hrv_baseline_lower, hrv_baseline_upper,
    sleep_total_s, sleep_deep_s, sleep_rem_s, sleep_score, resting_hr,
  }, { onConflict: "date" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "ok", date });
}
