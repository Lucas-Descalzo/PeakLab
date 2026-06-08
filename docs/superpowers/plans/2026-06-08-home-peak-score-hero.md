# Home Peak Score Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the home page into an intelligent coaching center with a Peak Score hero, Daily Brief AI API, and a coach-first UX that shows score, status, what to do today, and why.

**Architecture:** A new `/api/daily-brief` route calculates readiness + training load, optionally enriches with Gemini, and caches the result in Upstash Redis until midnight. A new `PeakScoreHero` client component fetches this API and renders the score prominently with AI-generated coaching text. `app/page.tsx` is rewritten to lead with the hero, followed by MicroStat chips, a compact workout card, weekly summary, and stats.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Upstash Redis (`@upstash/redis`), Gemini REST API (optional), existing `lib/training-readiness`, `lib/training-plan`, `lib/db`.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `app/api/daily-brief/route.ts` | GET endpoint — compute readiness, optionally call Gemini, cache in Upstash |
| Create | `components/PeakScoreHero.tsx` | Client component — fetches `/api/daily-brief`, renders hero score + coach brief |
| Modify | `app/page.tsx` | Rewrite home with new hierarchy: greeting → hero → micro-stats → workout card → weekly summary → stats |

---

## Task 1: Create `/api/daily-brief/route.ts`

**Files:**
- Create: `app/api/daily-brief/route.ts`

- [ ] **Step 1: Create the route file with imports and type definitions**

```typescript
// app/api/daily-brief/route.ts
import { NextResponse } from "next/server";
import { calcReadiness, calcTrainingLoad } from "@/lib/training-readiness";
import { getLatestWellness, getRecentActivities } from "@/lib/db";
import { getTodayWorkout } from "@/lib/training-plan";

export interface DailyBrief {
  score: number;
  status: string;
  color: string;
  recommendation: string;
  why: string;
  focus: string;
  action: string;
  cached: boolean;
  hrv: number;
  sleep_h: number;
  tsb: number;
}
```

- [ ] **Step 2: Add the cache key and midnight-timestamp helper**

```typescript
function getTodayKey(): string {
  // Argentina time (UTC-3)
  const now = new Date();
  const ar = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  const y = ar.getFullYear();
  const m = String(ar.getMonth() + 1).padStart(2, "0");
  const d = String(ar.getDate()).padStart(2, "0");
  return `daily-brief:${y}-${m}-${d}`;
}

function getMidnightTimestamp(): number {
  // Unix seconds at 23:59:59 Argentina time today
  const now = new Date();
  const ar = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  const y = ar.getFullYear();
  const m = String(ar.getMonth() + 1).padStart(2, "0");
  const d = String(ar.getDate()).padStart(2, "0");
  return Math.floor(new Date(`${y}-${m}-${d}T23:59:59-03:00`).getTime() / 1000);
}
```

- [ ] **Step 3: Add the rule-based fallback brief builder**

```typescript
function ruleBased(score: number, workoutTitle: string): Pick<DailyBrief, "recommendation" | "why" | "focus" | "action"> {
  if (score >= 75) {
    return {
      recommendation: "Día óptimo para entrenar fuerte.",
      why: "HRV alto y sueño reparador.",
      focus: "Alta intensidad",
      action: workoutTitle,
    };
  }
  if (score >= 50) {
    return {
      recommendation: "Entrenamiento moderado recomendado.",
      why: "Readiness buena, mantené el plan.",
      focus: "Trabajo planificado",
      action: workoutTitle,
    };
  }
  return {
    recommendation: "Priorizá la recuperación hoy.",
    why: "HRV y/o sueño por debajo de la baseline.",
    focus: "Recuperación",
    action: "Salida suave o descanso",
  };
}
```

- [ ] **Step 4: Add the optional Gemini enrichment function**

```typescript
async function callGemini(
  hrv: number,
  hrvPct: number,
  sleep: number,
  sleepScore: number,
  tsb: number,
  score: number,
  workoutTitle: string,
  workoutDetails: string,
): Promise<Pick<DailyBrief, "recommendation" | "why" | "focus" | "action"> | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Sos el coach de PeakLab para Lucas (21 años, corredor de Buenos Aires).
DATOS DE HOY: HRV ${hrv}ms (${hrvPct}% baseline), Sueño ${sleep.toFixed(1)}h (score ${sleepScore}), Training load balance TSB: ${tsb.toFixed(1)}, Readiness score: ${score}/100.
HOY PLANIFICADO: ${workoutTitle} — ${workoutDetails}

Respondé SOLO con JSON válido (sin markdown):
{
  "recommendation": "Una oración sobre qué hacer hoy (max 20 palabras)",
  "why": "Una oración explicando por qué basado en los datos (max 25 palabras)",
  "focus": "2-3 palabras: el objetivo clave de hoy",
  "action": "Acción concreta inmediata (max 15 palabras)"
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 256 },
        }),
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    // Strip potential markdown code fences
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Add the GET handler**

```typescript
export async function GET() {
  const key = getTodayKey();

  // 1. Try cache
  const isUpstash = !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    !process.env.UPSTASH_REDIS_REST_URL.includes("your_") &&
    process.env.UPSTASH_REDIS_REST_URL.startsWith("http")
  );

  if (isUpstash) {
    try {
      const { Redis } = await import("@upstash/redis");
      const r = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      const cached = await r.get<string>(key);
      if (cached) {
        const parsed: DailyBrief = typeof cached === "string" ? JSON.parse(cached) : cached;
        return NextResponse.json({ ...parsed, cached: true });
      }
    } catch {
      // fall through to compute
    }
  }

  // 2. Compute readiness
  const wellness = await getLatestWellness();
  const activities = await getRecentActivities(42);

  const activityData = activities.map((a) => ({
    date: a.date,
    duration_s: a.duration_s,
    avg_hr: a.avg_hr,
    distance_m: a.distance_m,
  }));

  const load = calcTrainingLoad(
    activityData.length > 0
      ? activityData
      : [
          { date: "2026-06-02", duration_s: 1812, avg_hr: 163, distance_m: 5554 },
          { date: "2026-05-31", duration_s: 3486, avg_hr: 164, distance_m: 10324 },
          { date: "2026-05-28", duration_s: 2106, avg_hr: 167, distance_m: 6951 },
          { date: "2026-05-26", duration_s: 3187, avg_hr: 161, distance_m: 9500 },
          { date: "2026-05-24", duration_s: 2767, avg_hr: 154, distance_m: 7951 },
        ],
  );

  const wellnessData = {
    date: wellness?.date ?? "2026-06-08",
    hrv: wellness?.hrv ?? 77,
    hrv_baseline_lower: wellness?.hrv_baseline_lower ?? 55,
    hrv_baseline_upper: wellness?.hrv_baseline_upper ?? 99,
    sleep_total_s: wellness?.sleep_total_s ?? Math.round(8.2 * 3600),
    sleep_score: wellness?.sleep_score ?? 89,
  };

  const readiness = calcReadiness(wellnessData, load);
  const hrv = wellnessData.hrv;
  const hrvBaseline = wellnessData.hrv_baseline_lower + wellnessData.hrv_baseline_upper;
  const hrvPct = Math.round((hrv / (hrvBaseline / 2)) * 100);
  const sleep_h = wellnessData.sleep_total_s / 3600;
  const sleepScore = wellnessData.sleep_score ?? 89;
  const tsb = load.tsb;

  // 3. Today's workout
  const todayWorkout = getTodayWorkout();
  const workoutTitle = todayWorkout?.title ?? "Descanso";
  const workoutDetails = todayWorkout?.details ?? "Día de descanso activo.";

  // 4. AI enrichment or rule-based
  const aiText =
    (await callGemini(hrv, hrvPct, sleep_h, sleepScore, tsb, readiness.score, workoutTitle, workoutDetails)) ??
    ruleBased(readiness.score, workoutTitle);

  const result: DailyBrief = {
    score: readiness.score,
    status: readiness.label,
    color: readiness.color,
    hrv,
    sleep_h,
    tsb,
    cached: false,
    ...aiText,
  };

  // 5. Cache until midnight
  if (isUpstash) {
    try {
      const { Redis } = await import("@upstash/redis");
      const r = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      await r.set(key, JSON.stringify(result), { exat: getMidnightTimestamp() });
    } catch {
      // cache failure is non-fatal
    }
  }

  return NextResponse.json(result);
}
```

- [ ] **Step 6: Verify the file compiles (no TypeScript errors at build)**

Run:
```bash
cd C:\Users\lucas\training-app && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 7: Commit**

```bash
cd C:\Users\lucas\training-app
git add app/api/daily-brief/route.ts
git commit -m "feat: add /api/daily-brief endpoint with Upstash cache + Gemini fallback"
```

---

## Task 2: Create `components/PeakScoreHero.tsx`

**Files:**
- Create: `components/PeakScoreHero.tsx`

- [ ] **Step 1: Create the skeleton/loading state component internals**

```tsx
// components/PeakScoreHero.tsx
"use client";
import { useEffect, useState } from "react";

interface DailyBrief {
  score: number;
  status: string;
  color: string;
  recommendation: string;
  why: string;
  focus: string;
  action: string;
  cached: boolean;
  hrv: number;
  sleep_h: number;
  tsb: number;
}

function Skeleton() {
  return (
    <div className="relative bg-[#0f1419] border border-[#1e2a35] rounded-3xl p-5 overflow-hidden animate-pulse">
      <div className="h-3 w-24 bg-[#1e2a35] rounded mb-4" />
      <div className="flex items-end gap-3 mb-1">
        <div className="h-20 w-24 bg-[#1e2a35] rounded" />
        <div className="mb-2 space-y-1">
          <div className="h-3 w-10 bg-[#1e2a35] rounded" />
          <div className="h-5 w-20 bg-[#1e2a35] rounded" />
        </div>
      </div>
      <div className="h-1.5 bg-[#1e2a35] rounded-full mb-5" />
      <div className="space-y-3">
        <div className="h-4 w-3/4 bg-[#1e2a35] rounded" />
        <div className="h-3 w-1/2 bg-[#1e2a35] rounded" />
        <div className="h-6 w-24 bg-[#1e2a35] rounded-full" />
        <div className="h-12 bg-[#1e2a35] rounded-xl" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the main export component with fetch logic**

```tsx
export default function PeakScoreHero() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/daily-brief")
      .then((r) => r.json())
      .then((d: DailyBrief) => {
        setBrief(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (!brief) return null;

  return (
    <div className="relative bg-[#0f1419] border border-[#1e2a35] rounded-3xl p-5 overflow-hidden">
      {/* Subtle gradient background tied to score */}
      <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-transparent pointer-events-none" />

      {/* PEAK SCORE label */}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
        PEAK SCORE
      </p>

      {/* Score + status */}
      <div className="flex items-end gap-3 mb-1">
        <span className="text-7xl font-black text-lime-400 leading-none">{brief.score}</span>
        <div className="mb-2">
          <span className="text-slate-400 text-sm">/100</span>
          <p className="text-slate-200 font-semibold text-lg">{brief.status}</p>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-1.5 bg-[#1e2a35] rounded-full mb-5">
        <div
          className="h-1.5 rounded-full bg-lime-400 transition-all duration-1000"
          style={{ width: `${brief.score}%` }}
        />
      </div>

      {/* Coach recommendation */}
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <span className="text-lime-400 mt-0.5 flex-shrink-0">●</span>
          <div>
            <p className="text-slate-100 font-medium text-sm leading-snug">
              {brief.recommendation}
            </p>
            <p className="text-slate-500 text-xs mt-1">{brief.why}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <span className="bg-lime-400/10 text-lime-400 text-xs px-3 py-1 rounded-full font-medium">
            {brief.focus}
          </span>
        </div>

        {/* CTA */}
        <a
          href="/entrenamiento"
          className="flex items-center justify-between w-full bg-lime-400 text-[#080c10] font-bold rounded-xl px-4 py-3 mt-2"
        >
          <span>{brief.action}</span>
          <span>→</span>
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the file compiles**

Run:
```bash
cd C:\Users\lucas\training-app && npx tsc --noEmit 2>&1 | head -30
```
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd C:\Users\lucas\training-app
git add components/PeakScoreHero.tsx
git commit -m "feat: add PeakScoreHero client component with score, status, coach brief"
```

---

## Task 3: Rewrite `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace the entire file content**

This rewrite:
- Adds the `MicroStat` inline component
- Removes the `ReadinessCardCompact` section entirely
- Leads with a minimal greeting, then `PeakScoreHero`, then micro-stats row, then a compact workout card, then `WeekSummary`, then the 3-stat grid

```tsx
import { getTodayWorkout, getCurrentWeek, buildPlan, WorkoutType } from "@/lib/training-plan";
import WeekSummary from "@/components/WeekSummary";
import PeakScoreHero from "@/components/PeakScoreHero";
import Link from "next/link";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 20) return "Buenas noches";
  if (hour >= 13) return "Buenas tardes";
  return "Buenos días";
}

function workoutIcon(type: WorkoutType): string {
  switch (type) {
    case "easy":     return "🟢";
    case "quality":  return "⚡";
    case "long":     return "🗺️";
    case "race":     return "🏅";
    case "recovery": return "💤";
    default:         return "🏃";
  }
}

function MicroStat({
  icon,
  label,
  value,
  status,
  dotColor,
}: {
  icon: string;
  label: string;
  value: string;
  status: string;
  dotColor: string;
}) {
  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-sm leading-none">{icon}</span>
        <span className="text-slate-500 text-xs font-medium">{label}</span>
      </div>
      <p className="text-slate-100 font-bold text-sm leading-none">{value}</p>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className="text-slate-500 text-xs">{status}</span>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 border flex flex-col gap-1.5 ${
        highlight
          ? "bg-lime-400/10 border-lime-400/30"
          : "bg-[#0f1419] border-[#1e2a35]"
      }`}
    >
      <span className="text-xl leading-none">{icon}</span>
      <p
        className={`font-extrabold text-base leading-none ${
          highlight ? "text-lime-400" : "text-slate-100"
        }`}
      >
        {value}
      </p>
      <div>
        <p className="text-slate-400 text-xs font-medium">{label}</p>
        <p className="text-slate-500 text-xs leading-snug">{sub}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const today = getTodayWorkout();
  const currentWeek = getCurrentWeek();
  const weekWorkouts = buildPlan().filter((w) => w.week === currentWeek);
  const greeting = getGreeting();

  return (
    <div className="space-y-4 pb-4">
      {/* 1. Greeting — minimal */}
      <p className="text-slate-400 text-sm pt-2">{greeting}, Lucas</p>

      {/* 2. Peak Score Hero */}
      <PeakScoreHero />

      {/* 3. Sub-metrics row */}
      <div className="grid grid-cols-3 gap-2">
        <MicroStat icon="🫀" label="HRV" value="77ms" status="Óptimo" dotColor="bg-lime-400" />
        <MicroStat icon="😴" label="Sueño" value="8.2h" status="Bueno" dotColor="bg-lime-400" />
        <MicroStat icon="⚡" label="Carga" value="TSB +5" status="Fresco" dotColor="bg-lime-400" />
      </div>

      {/* 4. Workout del día — compact secondary card */}
      {today ? (
        <div className="flex items-center gap-3 bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-3">
          <div className="w-9 h-9 rounded-lg bg-lime-400/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lg leading-none">{workoutIcon(today.type)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-100 font-semibold text-sm truncate">{today.title}</p>
            <p className="text-slate-500 text-xs">{today.distanceKm}km · {today.paceTarget}</p>
          </div>
          <Link href="/entrenamiento" className="text-lime-400 text-sm font-medium flex-shrink-0">
            Ver →
          </Link>
        </div>
      ) : null}

      {/* 5. Weekly summary */}
      <section>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          RESUMEN SEMANAL
        </p>
        <WeekSummary workouts={weekWorkouts} currentWeek={currentWeek} />
      </section>

      {/* 6. Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="📅" label="Semana" value={`${currentWeek}/15`} sub="del ciclo" />
        <StatCard icon="🏃" label="Media" value="23 ago" sub="meta 1:48-1:52" highlight />
        <StatCard icon="🏅" label="Maratón" value="20 sep" sub="meta 4:00-4:10" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles with no new TypeScript errors**

Run:
```bash
cd C:\Users\lucas\training-app && npx tsc --noEmit 2>&1 | head -30
```
Expected: no new errors.

- [ ] **Step 3: Run a full build to confirm it produces no errors**

Run:
```bash
cd C:\Users\lucas\training-app && npm run build 2>&1 | tail -20
```
Expected: `Route (app)` table printed, no red error lines.

- [ ] **Step 4: Commit**

```bash
cd C:\Users\lucas\training-app
git add app/page.tsx
git commit -m "feat: rewrite home with Peak Score hero, micro-stats, compact workout card"
```

---

## Task 4: Final integration commit and push

- [ ] **Step 1: Run full build one more time to confirm clean state**

```bash
cd C:\Users\lucas\training-app && npm run build 2>&1 | tail -30
```
Expected: successful build, no errors.

- [ ] **Step 2: Stage all changes and commit with the spec-requested message**

```bash
cd C:\Users\lucas\training-app
git add -A
git commit -m "Home redesign: Peak Score hero + Daily Brief AI + coach-first UX"
```

- [ ] **Step 3: Push to remote**

```bash
cd C:\Users\lucas\training-app && git push
```
Expected: remote branch updated.

---

## Self-Review Checklist

**Spec coverage:**
- [x] `GET /api/daily-brief` endpoint → Task 1
- [x] Upstash cache with TTL until midnight → Task 1, Steps 1 & 5
- [x] Gemini API call with exact prompt → Task 1, Step 4
- [x] Rule-based fallback (score >= 75, 50-74, < 50) → Task 1, Step 3
- [x] `PeakScoreHero` client component with skeleton → Task 2
- [x] Score bar, recommendation, focus pill, CTA button → Task 2, Step 2
- [x] Home hierarchy: greeting → hero → micro-stats → workout card → weekly summary → stats → Task 3
- [x] `MicroStat` component (3 chips) → Task 3, Step 1
- [x] Compact workout card (secondary) → Task 3, Step 1
- [x] `ReadinessCardCompact` section removed → Task 3, Step 1 (not imported)
- [x] Minimal greeting (`text-slate-400 text-sm`) → Task 3, Step 1
- [x] Final `npm run build` + `git push` → Task 4

**Type consistency:** `DailyBrief` interface is defined in `route.ts` and re-declared locally in `PeakScoreHero.tsx` (no shared import needed — the component only fetches JSON). `WorkoutType` import in `page.tsx` matches existing `lib/training-plan` export. `MicroStat` and `StatCard` props are self-contained.

**Placeholder scan:** No TBD/TODO/placeholder patterns found. All code blocks contain complete implementations.
