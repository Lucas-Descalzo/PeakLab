import { NextResponse } from "next/server";
import { calcReadiness, calcTrainingLoad } from "@/lib/training-readiness";

// In production this fetches from Supabase.
// Until Supabase is configured, returns data based on latest Garmin export.
export async function GET() {
  try {
    // Try to fetch from Supabase if configured
    const { isSupabaseConfigured, supabaseAdmin } = await import("@/lib/supabase");
    if (isSupabaseConfigured()) {
      const db = supabaseAdmin();

      const today = new Date().toISOString().split("T")[0];

      // Get latest wellness entry
      const { data: wellness } = await db
        .from("wellness")
        .select("*")
        .lte("date", today)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      // Get recent activities for load calculation
      const { data: activities } = await db
        .from("activities")
        .select("date, duration_s, avg_hr, distance_m")
        .lte("date", today)
        .order("date", { ascending: false })
        .limit(42);

      const load = calcTrainingLoad(activities || []);
      const readiness = calcReadiness(wellness || null, load);

      return NextResponse.json({
        ...readiness,
        hrv: wellness?.hrv,
      });
    }
  } catch {
    // Fall through to demo data
  }

  // Demo data based on latest Garmin export (HRV 77, baseline 55-99)
  const demoLoad = calcTrainingLoad([
    { date: "2026-06-02", duration_s: 1812, avg_hr: 163, distance_m: 5554 },
    { date: "2026-05-31", duration_s: 3486, avg_hr: 164, distance_m: 10324 },
    { date: "2026-05-28", duration_s: 2106, avg_hr: 167, distance_m: 6951 },
    { date: "2026-05-26", duration_s: 3187, avg_hr: 161, distance_m: 9500 },
    { date: "2026-05-24", duration_s: 2767, avg_hr: 154, distance_m: 7951 },
  ]);

  const readiness = calcReadiness(
    {
      date: "2026-06-06",
      hrv: 77,
      hrv_baseline_lower: 55,
      hrv_baseline_upper: 99,
      sleep_total_s: 8.2 * 3600,
      sleep_score: 89,
    },
    demoLoad
  );

  return NextResponse.json({ ...readiness, hrv: 77 });
}
