import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json([]);
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("gym_sessions")
      .select("*")
      .order("date", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("gym_sessions")
      .insert({
        date: body.date,
        type: body.type,
        exercises: body.exercises,
        duration_min: body.duration_min,
        notes: body.notes || "",
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
