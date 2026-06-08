import { NextRequest, NextResponse } from "next/server";
import { getTodayWorkout, getCurrentWeek, buildPlan } from "@/lib/training-plan";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

async function buildContext(): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const todayWorkout = getTodayWorkout();
  const currentWeek = getCurrentWeek();
  const weekWorkouts = buildPlan().filter((w) => w.week === currentWeek);

  let hrvInfo = "HRV: no disponible aún";
  let recentActivities = "Actividades recientes: pendiente de sync Strava/Garmin";
  let sleepInfo = "Sueño: no disponible aún";

  if (isSupabaseConfigured()) {
    try {
      const db = supabaseAdmin();
      const { data: wellness } = await db
        .from("wellness")
        .select("*")
        .lte("date", today)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      if (wellness) {
        const pct = wellness.hrv_baseline_lower && wellness.hrv_baseline_upper
          ? Math.round(((wellness.hrv - wellness.hrv_baseline_lower) / (wellness.hrv_baseline_upper - wellness.hrv_baseline_lower)) * 100)
          : null;
        hrvInfo = `HRV hoy: ${wellness.hrv}ms (baseline ${wellness.hrv_baseline_lower}-${wellness.hrv_baseline_upper}ms${pct != null ? `, ${pct}% del rango` : ""})`;
        if (wellness.sleep_total_s) {
          const h = (wellness.sleep_total_s / 3600).toFixed(1);
          sleepInfo = `Sueño anoche: ${h}h${wellness.sleep_score ? `, score ${wellness.sleep_score}` : ""}`;
        }
      }

      const { data: activities } = await db
        .from("activities")
        .select("date, name, distance_m, duration_s, avg_hr, avg_pace_s_per_km")
        .order("date", { ascending: false })
        .limit(5);

      if (activities && activities.length > 0) {
        recentActivities = "Últimas corridas:\n" + activities.map((a) => {
          const km = (a.distance_m / 1000).toFixed(1);
          const min = Math.floor(a.duration_s / 60);
          const pace = a.avg_pace_s_per_km
            ? `${Math.floor(a.avg_pace_s_per_km / 60)}:${String(a.avg_pace_s_per_km % 60).padStart(2, "0")}/km`
            : "-";
          return `  ${a.date}: ${a.name} | ${km}km | ${min}min | ${pace} | HR ${a.avg_hr}`;
        }).join("\n");
      }
    } catch {}
  } else {
    // Use static data from Garmin export
    hrvInfo = "HRV hoy: 77ms (baseline 55-99ms, 50% del rango) — datos del último sync Garmin";
    recentActivities = `Últimas corridas (datos Garmin):
  2026-06-02: VO2 máximo | 5.6km | 30min | 5:26/km | HR 163
  2026-05-31: Base | 10.3km | 58min | 5:37/km | HR 164
  2026-05-28: Tempo | 7.0km | 35min | 5:03/km | HR 167
  2026-05-26: Base | 9.5km | 53min | 5:35/km | HR 161
  2026-05-24: Base | 8.0km | 46min | 5:48/km | HR 154`;
    sleepInfo = "Sueño anoche: 8.2h, score 89";
  }

  const planContext = weekWorkouts.map((w) =>
    `  ${w.date} (${["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][new Date(w.date+"T00:00:00").getDay()]}): ${w.title} — ${w.distanceKm}km ${w.paceTarget || ""}`
  ).join("\n");

  return `CONTEXTO DEL DÍA (${today}):
${hrvInfo}
${sleepInfo}
VO2max: 54 | FC máx: 201 | FC reposo: 45

SEMANA ${currentWeek}/15 — ${weekWorkouts[0]?.phase || ""}:
${planContext}

HOY: ${todayWorkout ? `${todayWorkout.title} — ${todayWorkout.details}` : "Día de descanso"}

${recentActivities}

PROBLEMA PRINCIPAL DETECTADO: Lucas tiende a correr sus salidas fáciles demasiado rápido (Z3/HR 154-164 en vez de Z2/HR <140). Reforzar este punto cuando sea relevante.`;
}

const BASE_SYSTEM = `Sos un entrenador personal de running y fitness para Lucas, 21 años, corredor de Buenos Aires.

PERFIL:
- Objetivos: Media maratón 23 ago 2026 (meta 1:48-1:52) | Maratón 20 sep 2026 (meta 4:00-4:10)
- Estructura: Gym PPL (lun/mié/vie) + Running 3x/sem (mar/jue/dom)
- Sin sentadilla bilateral (molestia previa)

ZONAS FC:
- Z2 easy: HR 121-140 (~6:30-7:00/km) — 80% del entrenamiento
- Z4 umbral: HR 161-180 (~5:05-5:40/km)
- Z5 VO2max: HR 181+ (~4:30-4:50/km)
- HMP (ritmo media): 5:05-5:15/km | MP (ritmo maratón): 5:35-5:50/km

ESTILO: Respondé en español rioplatense. Respuestas concisas y directas. Usá datos concretos cuando los tengas. Si el atleta dice que no pudo completar una sesión, preguntá qué pasó antes de ajustar el plan.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.includes("your_")) {
      return NextResponse.json({
        reply: "Para activar el chat, agregá tu GEMINI_API_KEY en .env.local. Obtenerla es gratis en aistudio.google.com.",
      });
    }

    const context = await buildContext();
    const systemContent = `${BASE_SYSTEM}\n\n${context}`;

    const geminiMessages = [
      { role: "user", parts: [{ text: systemContent }] },
      { role: "model", parts: [{ text: "Entendido. Soy tu coach, tengo el contexto de hoy. ¿En qué te puedo ayudar?" }] },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini error:", err);
      return NextResponse.json({ reply: "Error al llamar a Gemini. Verificá la API key." });
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta.";
    return NextResponse.json({ reply });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ reply: "Error interno." });
  }
}
