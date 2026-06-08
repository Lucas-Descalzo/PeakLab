import { NextRequest, NextResponse } from "next/server";
import { saveGymSession, getGymSessions } from "@/lib/db";

export async function GET() {
  const sessions = await getGymSessions();
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await saveGymSession({
      date: body.date,
      type: body.type,
      exercises: body.exercises,
      duration_min: body.duration_min ?? 0,
      notes: body.notes ?? "",
    });
    return NextResponse.json(session);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
