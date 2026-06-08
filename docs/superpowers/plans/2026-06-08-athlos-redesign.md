# Athlos Redesign — PeakLab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign PeakLab to match Athlos aesthetics — near-black background, lime-400 neon accent replacing all blue, dense-but-clean cards, Athlos-style layout on every page.

**Architecture:** Pure visual/UI overhaul: swap colour tokens in CSS variables and Tailwind classes, restructure card layouts, add new UI sections (ReadinessCardCompact, PRs, Training Load in Metrics, RIR in Gym, Athlos-style Chat). No API, routing, or lib changes. The new `ReadinessCardCompact` is a new file; everything else is editing existing files.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS (arbitrary values), React hooks

---

## File Map

| File | Action | What changes |
|---|---|---|
| `app/globals.css` | Modify | Color variables → green, add `.pulse-green`, `.bar-gradient` green, focus rings |
| `app/layout.tsx` | Modify | Body bg class `bg-zinc-950` → `bg-[#080c10]` |
| `components/Nav.tsx` | Modify | Active state `text-blue-400` → `text-lime-400`, glow filter |
| `components/ReadinessCard.tsx` | Modify | Factor rows (HRV/Sleep/Load with dot+label), recommendation block at bottom |
| `components/ReadinessCardCompact.tsx` | Create | New component: score left + label/rec right + 3 sub-scores row |
| `components/WeekSummary.tsx` | Modify | "N/M completados" progress bar, green accent |
| `components/WorkoutCard.tsx` | Modify | Blue → lime accent on easy type |
| `app/page.tsx` | Modify | Greeting redesign, Today card big CTA, use ReadinessCardCompact |
| `app/gym/page.tsx` | Modify | GymSet gets `rir?` + `completed?`, set rows updated, blue → lime |
| `lib/gym-storage.ts` | Modify | `GymSet` type: add `rir?: number; completed?: boolean` |
| `app/metricas/page.tsx` | Modify | PRs section + Training Load section, blue → lime accent |
| `app/chat/page.tsx` | Modify | Coach header with green avatar, bubble styles, green send button |

---

## Task 1: CSS Variables + Global Styles

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update globals.css**

Replace the entire file content:

```css
@import "tailwindcss";

:root {
  --background: #080c10;
  --foreground: #F1F5F9;
  --accent: #4ADE80;
  --accent-glow: rgba(74, 222, 128, 0.15);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Smooth transitions on interactive elements */
* {
  transition-property: color, background-color, border-color, opacity, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Focus rings — green accent */
*:focus-visible {
  outline: 2px solid #4ADE80;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #1e2a35;
  border-radius: 2px;
}
::-webkit-scrollbar-thumb:hover {
  background: #2d3f4e;
}

/* Gauge animation */
@keyframes gauge-fill {
  from { stroke-dashoffset: 0; }
}

/* Pulse glow for active indicator — green */
@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
}

.pulse-green {
  animation: pulse-green 2s ease-in-out infinite;
}

/* Stat card hover lift */
.stat-card {
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(74, 222, 128, 0.08);
}

/* Day circle tap target */
.day-circle {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

/* Bottom nav backdrop */
.nav-backdrop {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(8, 12, 16, 0.85);
}

/* Bar gradient for volume chart — green */
.bar-gradient {
  background: linear-gradient(to bottom, #4ADE80, #16a34a);
}
```

- [ ] **Step 2: Update layout.tsx body class**

In `app/layout.tsx`, change:
```tsx
// Old
<body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">

// New
<body className="min-h-screen bg-[#080c10] text-slate-100 antialiased">
```

- [ ] **Step 3: Verify build compiles**

```bash
cd C:/Users/lucas/training-app && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/lucas/training-app
git add app/globals.css app/layout.tsx
git commit -m "style: green accent CSS variables, dark #080c10 background"
```

---

## Task 2: Nav — Blue → Lime Active State

**Files:**
- Modify: `components/Nav.tsx`

- [ ] **Step 1: Update Nav active colours**

Replace the entire file:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Hoy", icon: "⚡" },
  { href: "/plan", label: "Plan", icon: "📅" },
  { href: "/gym", label: "Gym", icon: "🏋️" },
  { href: "/metricas", label: "Métricas", icon: "📊" },
  { href: "/chat", label: "Coach", icon: "💬" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-backdrop border-t border-[#1e2a35]">
      <div className="max-w-4xl mx-auto flex justify-around">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center py-3 px-4 text-xs transition-colors ${
                active ? "text-lime-400" : "text-slate-500 hover:text-slate-200"
              }`}
            >
              <span className={`text-xl mb-0.5 ${active ? "drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]" : ""}`}>
                {l.icon}
              </span>
              <span className={active ? "font-semibold" : ""}>{l.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/lucas/training-app
git add components/Nav.tsx
git commit -m "style: Nav active state lime-400 instead of blue"
```

---

## Task 3: GymSet Type — Add RIR + Completed

**Files:**
- Modify: `lib/gym-storage.ts`

- [ ] **Step 1: Update GymSet interface**

In `lib/gym-storage.ts`, replace:
```ts
// Old
export interface GymSet { kg: number; reps: number }
```

With:
```ts
export interface GymSet { kg: number; reps: number; rir?: number; completed?: boolean }
```

The rest of the file stays unchanged — `GymSet` is used inside `GymExercise` and stored as JSON, so adding optional fields is backward-compatible.

- [ ] **Step 2: Commit**

```bash
cd C:/Users/lucas/training-app
git add lib/gym-storage.ts
git commit -m "feat: GymSet type adds optional rir and completed fields"
```

---

## Task 4: ReadinessCard Full Redesign (Athlos Factors)

**Files:**
- Modify: `components/ReadinessCard.tsx`

The redesign keeps the existing `GaugeSVG` function and the `Readiness` interface unchanged. It replaces the sub-score chips section with factor rows, and adds a recommendation block.

- [ ] **Step 1: Replace ReadinessCard component body**

Replace the entire file:

```tsx
"use client";
import { useEffect, useState } from "react";

interface Readiness {
  score: number;
  label: string;
  color: string;
  hrv_score: number;
  sleep_score: number;
  load_score: number;
  recommendation: string;
  hrv?: number;
}

const GAUGE_COLOR: Record<string, string> = {
  green:  "#4ADE80",
  lime:   "#4ADE80",
  yellow: "#FBBF24",
  orange: "#f97316",
  red:    "#F87171",
};

const TEXT_COLOR: Record<string, string> = {
  green:  "text-lime-400",
  lime:   "text-lime-400",
  yellow: "text-yellow-400",
  orange: "text-orange-400",
  red:    "text-red-400",
};

function factorDotColor(value: number): string {
  if (value >= 70) return "#4ADE80";
  if (value >= 50) return "#FBBF24";
  return "#F87171";
}

function factorLabel(value: number): string {
  if (value >= 70) return "Óptimo";
  if (value >= 50) return "Moderado";
  return "Bajo";
}

function GaugeSVG({ score, color }: { score: number; color: string }) {
  const cx = 90, cy = 90, r = 68, sw = 10;
  const fullArc = Math.PI * r;
  const filled = (score / 100) * fullArc;
  const empty = fullArc - filled;
  const arcColor = GAUGE_COLOR[color] || "#4ADE80";

  return (
    <svg
      viewBox="0 0 180 100"
      width="180"
      height="100"
      className="overflow-visible"
      aria-hidden="true"
    >
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#1e2a35"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      {score > 0 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={arcColor}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${empty}`}
          style={{ filter: `drop-shadow(0 0 6px ${arcColor}80)` }}
        />
      )}
    </svg>
  );
}

export default function ReadinessCard() {
  const [data, setData] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/readiness")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5 animate-pulse">
        <div className="h-3 bg-[#1e2a35] rounded w-1/3 mb-4" />
        <div className="flex justify-center">
          <div className="w-44 h-24 bg-[#1e2a35] rounded-full" />
        </div>
        <div className="flex flex-col gap-2 mt-4">
          <div className="h-8 bg-[#1e2a35] rounded-xl" />
          <div className="h-8 bg-[#1e2a35] rounded-xl" />
          <div className="h-8 bg-[#1e2a35] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const textColor = TEXT_COLOR[data.color] || "text-lime-400";

  const factors = [
    { icon: "💓", name: "HRV", value: data.hrv_score, rawValue: data.hrv ? `${data.hrv}ms` : undefined },
    { icon: "😴", name: "Sueño", value: data.sleep_score, rawValue: undefined },
    { icon: "⚡", name: "Carga", value: data.load_score, rawValue: undefined },
  ];

  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-5">
      {/* Header */}
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">
        Training Readiness
      </p>

      {/* Gauge + score */}
      <div className="flex flex-col items-center -mb-2">
        <div className="relative">
          <GaugeSVG score={data.score} color={data.color} />
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-1">
            <span className={`text-4xl font-black leading-none tracking-tight ${textColor}`}>
              {data.score}
            </span>
            <span className={`text-xs font-semibold mt-0.5 uppercase tracking-wider ${textColor}`}>
              {data.label}
            </span>
          </div>
        </div>
      </div>

      {/* Factor rows */}
      <div className="mt-4 space-y-2">
        {factors.map((f) => (
          <div key={f.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{f.icon}</span>
              <span className="text-slate-300 text-sm">{f.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {f.rawValue && (
                <span className="text-slate-400 text-sm font-mono">{f.rawValue}</span>
              )}
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: factorDotColor(f.value) }}
              />
              <span className="text-slate-400 text-xs w-14 text-right">{factorLabel(f.value)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="mt-4 pt-3 border-t border-[#1e2a35]">
        <p className="text-slate-400 text-sm leading-snug">
          <span className="text-lime-400 font-semibold">Consejo: </span>
          {data.recommendation}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd C:/Users/lucas/training-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/lucas/training-app
git add components/ReadinessCard.tsx
git commit -m "feat: ReadinessCard factor rows + green gauge (Athlos style)"
```

---

## Task 5: ReadinessCardCompact — New Component

**Files:**
- Create: `components/ReadinessCardCompact.tsx`

- [ ] **Step 1: Create the compact component**

```tsx
"use client";
import { useEffect, useState } from "react";

interface Readiness {
  score: number;
  label: string;
  color: string;
  hrv_score: number;
  sleep_score: number;
  load_score: number;
  recommendation: string;
  hrv?: number;
}

const SCORE_COLOR: Record<string, string> = {
  green:  "text-lime-400",
  lime:   "text-lime-400",
  yellow: "text-yellow-400",
  orange: "text-orange-400",
  red:    "text-red-400",
};

function subDotColor(v: number) {
  if (v >= 70) return "#4ADE80";
  if (v >= 50) return "#FBBF24";
  return "#F87171";
}

export default function ReadinessCardCompact() {
  const [data, setData] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/readiness")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4 animate-pulse">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 rounded-full bg-[#1e2a35]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#1e2a35] rounded w-1/2" />
            <div className="h-3 bg-[#1e2a35] rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const scoreColor = SCORE_COLOR[data.color] || "text-lime-400";

  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">
        Tu Readiness
      </p>

      {/* Score + label + recommendation */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-[#1e2a35]"
          style={{ borderColor: data.color === 'green' || data.color === 'lime' ? '#4ADE80' : data.color === 'yellow' ? '#FBBF24' : data.color === 'red' ? '#F87171' : '#4ADE80' }}
        >
          <span className={`text-2xl font-black leading-none ${scoreColor}`}>{data.score}</span>
          <span className={`text-xs font-semibold uppercase ${scoreColor}`}>{data.label}</span>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed flex-1">{data.recommendation}</p>
      </div>

      {/* Sub-scores row */}
      <div className="flex gap-2 pt-3 border-t border-[#1e2a35]">
        {[
          { label: "HRV", value: data.hrv_score },
          { label: "Sueño", value: data.sleep_score },
          { label: "Carga", value: data.load_score },
        ].map((s) => (
          <div key={s.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: subDotColor(s.value) }}
              />
              <span className="text-slate-200 text-sm font-bold">{s.value}</span>
            </div>
            <span className="text-slate-500 text-xs">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd C:/Users/lucas/training-app && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/lucas/training-app
git add components/ReadinessCardCompact.tsx
git commit -m "feat: ReadinessCardCompact component for dashboard"
```

---

## Task 6: WeekSummary — Progress Bar + Completed Count

**Files:**
- Modify: `components/WeekSummary.tsx`

The completed count = workouts with a date that has already passed (< today) and type !== 'rest'. Total = all non-rest workouts in the week.

- [ ] **Step 1: Replace WeekSummary**

Replace the entire file:

```tsx
"use client";
import { useState } from "react";
import { PlannedWorkout, WorkoutType } from "@/lib/training-plan";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const TYPE_COLOR: Record<WorkoutType, string> = {
  easy:     "bg-lime-500",
  quality:  "bg-yellow-400",
  long:     "bg-purple-500",
  race:     "bg-red-500",
  rest:     "bg-[#1e2a35]",
  recovery: "bg-lime-600",
};

const TYPE_RING: Record<WorkoutType, string> = {
  easy:     "ring-lime-500/60",
  quality:  "ring-yellow-400/60",
  long:     "ring-purple-500/60",
  race:     "ring-red-500/60",
  rest:     "ring-slate-600/40",
  recovery: "ring-lime-600/60",
};

export default function WeekSummary({
  workouts,
  currentWeek,
}: {
  workouts: PlannedWorkout[];
  currentWeek: number;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  const trainingSessions = workouts.filter((w) => w.type !== "rest");
  const completed = trainingSessions.filter((w) => w.date < today).length;
  const total = trainingSessions.length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const phase = workouts[0]?.phase ?? "";

  const byDay: Record<number, PlannedWorkout> = {};
  for (const w of workouts) {
    const d = new Date(w.date + "T00:00:00").getDay();
    byDay[d] = w;
  }

  const todayDow = new Date().getDay();
  const selectedWorkout = workouts.find((w) => w.date === selectedDate) ?? null;

  function handleDayClick(dow: number) {
    const w = byDay[dow];
    if (!w || w.type === "rest") return;
    setSelectedDate((prev) => (prev === w.date ? null : w.date));
  }

  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
          Semana {currentWeek}
          {phase && <span className="text-slate-600 font-normal normal-case ml-1">— {phase}</span>}
        </p>
        <span className="text-slate-300 font-semibold text-sm">{completed}/{total} completados</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#1e2a35] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-lime-400 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* 7-day circles */}
      <div className="flex justify-between items-end gap-1">
        {DAY_LABELS.map((label, dow) => {
          const workout = byDay[dow];
          const hasTraining = workout && workout.type !== "rest";
          const isToday = dow === todayDow;
          const isPast = workout ? workout.date < today : false;
          const isSelected = workout ? workout.date === selectedDate : false;

          return (
            <div
              key={dow}
              className="flex flex-col items-center gap-1.5 day-circle"
              onClick={() => handleDayClick(dow)}
            >
              <div
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  hasTraining
                    ? `${TYPE_COLOR[workout.type]} ${isSelected ? `ring-2 ${TYPE_RING[workout.type]}` : ""}`
                    : "bg-[#1e2a35]",
                  isToday ? "ring-2 ring-white/70 ring-offset-1 ring-offset-[#0f1419]" : "",
                  isPast && !isToday ? "opacity-35" : "",
                ].filter(Boolean).join(" ")}
              >
                {hasTraining && (
                  <span className="text-white font-bold text-xs">
                    {workout.distanceKm}
                  </span>
                )}
              </div>
              <span className={`text-xs ${isToday ? "text-slate-200 font-semibold" : "text-slate-600"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedWorkout && (
        <div className="mt-4 pt-3 border-t border-[#1e2a35]">
          <div className="flex items-center justify-between">
            <p className="text-slate-200 text-sm font-semibold">{selectedWorkout.title}</p>
            <span className="text-slate-500 text-xs">{selectedWorkout.distanceKm}km</span>
          </div>
          {selectedWorkout.description && (
            <p className="text-slate-500 text-xs mt-0.5 leading-snug">{selectedWorkout.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd C:/Users/lucas/training-app && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/lucas/training-app
git add components/WeekSummary.tsx
git commit -m "feat: WeekSummary progress bar + completed count (Athlos style)"
```

---

## Task 7: Dashboard Page Redesign

**Files:**
- Modify: `app/page.tsx`

The dashboard shows: greeting block, big "today's workout" card, readiness compact, week summary, stat cards. Uses `ReadinessCardCompact` instead of `ReadinessCard`.

- [ ] **Step 1: Replace app/page.tsx**

```tsx
import { getTodayWorkout, getCurrentWeek, buildPlan } from "@/lib/training-plan";
import ReadinessCardCompact from "@/components/ReadinessCardCompact";
import WeekSummary from "@/components/WeekSummary";
import Link from "next/link";
import { PlannedWorkout, WorkoutType } from "@/lib/training-plan";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 20) return "Buenas noches";
  if (hour >= 13) return "Buenas tardes";
  return "Buenos días";
}

const TODAY_TYPE_STYLES: Record<WorkoutType, { border: string; accent: string; badge: string; label: string; icon: string }> = {
  easy:     { border: "border-lime-500/30",   accent: "text-lime-400",   badge: "bg-lime-500/15 text-lime-300",    label: "Fácil",    icon: "🟩" },
  quality:  { border: "border-yellow-500/30", accent: "text-yellow-400", badge: "bg-yellow-500/15 text-yellow-300", label: "Calidad",  icon: "⚡" },
  long:     { border: "border-purple-500/30", accent: "text-purple-400", badge: "bg-purple-500/15 text-purple-300", label: "Long Run", icon: "🗺️" },
  race:     { border: "border-red-500/30",    accent: "text-red-400",    badge: "bg-red-500/15 text-red-300",       label: "Carrera",  icon: "🏅" },
  rest:     { border: "border-[#1e2a35]",     accent: "text-slate-400",  badge: "bg-slate-700 text-slate-400",      label: "Descanso", icon: "😴" },
  recovery: { border: "border-lime-600/30",   accent: "text-lime-500",   badge: "bg-lime-600/15 text-lime-400",     label: "Recupero", icon: "💤" },
};

function TodayWorkoutCard({ workout }: { workout: PlannedWorkout }) {
  const s = TODAY_TYPE_STYLES[workout.type];
  return (
    <div className={`bg-[#0f1419] border ${s.border} rounded-2xl p-5`}>
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">
        Tu entrenamiento de hoy
      </p>
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-black/30 text-2xl">
          {s.icon}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5 ${s.badge}`}>
            {s.label}
          </span>
          <h3 className="text-slate-50 font-bold text-lg leading-tight">{workout.title}</h3>
          {workout.description && (
            <p className="text-slate-400 text-sm mt-1 leading-snug">{workout.description}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-slate-200 font-extrabold text-xl leading-none">{workout.distanceKm}</p>
          <p className="text-slate-500 text-xs mt-0.5">km</p>
        </div>
      </div>
      <Link
        href="/plan"
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-lime-400 hover:bg-lime-300 text-[#080c10] font-bold rounded-xl text-sm transition-colors"
      >
        Ver rutina →
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const today = getTodayWorkout();
  const currentWeek = getCurrentWeek();
  const weekWorkouts = buildPlan().filter((w) => w.week === currentWeek);

  const greeting = getGreeting();

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="pt-1">
        <h1 className="text-2xl font-black text-slate-50 leading-tight">
          {greeting}, Lucas 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">Listo para tu mejor versión hoy.</p>
      </div>

      {/* Today's workout */}
      {today ? (
        <TodayWorkoutCard workout={today} />
      ) : (
        <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-6 text-center">
          <p className="text-4xl mb-3">😴</p>
          <p className="text-slate-200 font-bold text-lg">Día de descanso</p>
          <p className="text-slate-500 text-sm mt-1">El descanso es parte del entrenamiento.</p>
        </div>
      )}

      {/* Readiness compact */}
      <ReadinessCardCompact />

      {/* Week summary */}
      <WeekSummary workouts={weekWorkouts} currentWeek={currentWeek} />

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="📅" label="Semana" value={`${currentWeek}/15`} sub="del ciclo" />
        <StatCard icon="🏃" label="Media" value="23 ago" sub="obj 1:48–1:52" highlight />
        <StatCard icon="🏁" label="Maratón" value="20 sep" sub="obj 4:00–4:10" />
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, highlight,
}: {
  icon: string; label: string; value: string; sub: string; highlight?: boolean;
}) {
  return (
    <div
      className={`stat-card rounded-xl p-3 border ${
        highlight
          ? "bg-lime-400/10 border-lime-400/30"
          : "bg-[#0f1419] border-[#1e2a35]"
      }`}
    >
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-base leading-none">{icon}</span>
        <p className="text-slate-400 text-xs">{label}</p>
      </div>
      <p className={`font-extrabold text-base leading-none ${highlight ? "text-lime-400" : "text-slate-100"}`}>
        {value}
      </p>
      <p className="text-slate-500 text-xs mt-1 leading-snug">{sub}</p>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd C:/Users/lucas/training-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/lucas/training-app
git add app/page.tsx
git commit -m "feat: dashboard redesign — Athlos style, ReadinessCardCompact, CTA button"
```

---

## Task 8: Gym Page — RIR + Completed + Green Accent

**Files:**
- Modify: `app/gym/page.tsx`

Changes:
1. Local `Set` interface gets `rir?: number; completed?: boolean`
2. `emptyExercise()` sets default `{ kg: 0, reps: 0, rir: undefined, completed: false }`
3. Set row: add RIR number input (0-5) + completed checkbox; completed rows get green-tint bg + line-through
4. `updateSet` handles `"rir"` and `"completed"` fields
5. All blue accents → lime/green

- [ ] **Step 1: Replace app/gym/page.tsx**

```tsx
"use client";
import { useState, useEffect } from "react";
import { fetchSessions, saveSession, GymSession as StoredSession } from "@/lib/gym-storage";
import { getTodayGymDay, GymDay, GymExercise } from "@/lib/gym-plan";

interface GymSet { kg: number; reps: number; rir?: number; completed?: boolean }
interface Exercise { name: string; sets: GymSet[] }
interface Session {
  id?: string;
  date: string;
  type: "Push" | "Pull" | "Piernas";
  exercises: Exercise[];
  duration_min: number;
  notes: string;
}

const GYM_TYPES = ["Push", "Pull", "Piernas"] as const;

const SUGGESTED_EXERCISES: Record<string, string[]> = {
  Push:    ["Press banca", "Press inclinado mancuernas", "Press militar", "Fondos con peso", "Elevaciones laterales", "Tríceps polea"],
  Pull:    ["Dominadas con peso", "Remo con barra", "Remo en polea", "Face pull", "Curl bíceps barra", "Remo a una mano"],
  Piernas: ["Hip thrust", "Bulgarian split squat", "Prensa 45°", "Curl isquiotibiales acostado", "Abducción cadera máquina", "Elevación talones una pierna"],
};

function emptyExercise(): Exercise {
  return { name: "", sets: [{ kg: 0, reps: 0, rir: undefined, completed: false }] };
}

function nextGymDay(): string {
  const today = new Date().getDay();
  const gymDays = [1, 3, 5];
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  for (let i = 1; i <= 7; i++) {
    const next = (today + i) % 7;
    if (gymDays.includes(next)) return dayNames[next];
  }
  return "Lunes";
}

const TYPE_COLORS: Record<string, string> = {
  Push:    "bg-lime-500/20 text-lime-300 border-lime-500/30",
  Pull:    "bg-green-500/20 text-green-300 border-green-500/30",
  Piernas: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

const PHASE_COLORS: Record<string, string> = {
  Normal:   "bg-slate-700/50 text-slate-300",
  Descarga: "bg-yellow-500/20 text-yellow-300",
  Taper:    "bg-purple-500/20 text-purple-300",
  Recovery: "bg-red-500/20 text-red-300",
};

function ExerciseRow({ ex }: { ex: GymExercise }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#1e2a35] last:border-0">
      <div className="flex-1">
        <span className="text-slate-200 text-sm">{ex.name}</span>
        {ex.notes && <span className="text-slate-500 text-xs ml-2">({ex.notes})</span>}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
        <span className="font-mono bg-[#1e2a35] px-2 py-0.5 rounded">
          {ex.sets}×{ex.reps}
        </span>
        {ex.weight && (
          <span className="text-lime-400">{ex.weight}</span>
        )}
      </div>
    </div>
  );
}

function TodayPlanCard({
  gymDay,
  onStartSession,
}: {
  gymDay: GymDay;
  onStartSession: (day: GymDay) => void;
}) {
  const [open, setOpen] = useState(true);
  const typeColor = TYPE_COLORS[gymDay.type] || "bg-slate-700/50 text-slate-300";
  const phaseColor = PHASE_COLORS[gymDay.phase] || "bg-slate-700/50 text-slate-300";

  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1e2a35]/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-200 font-semibold text-sm">Plan de hoy</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${typeColor}`}>
            {gymDay.type}
          </span>
          {gymDay.phase !== "Normal" && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${phaseColor}`}>
              {gymDay.phase}
            </span>
          )}
        </div>
        <span className="text-slate-500 text-xs">{open ? "▲ ocultar" : "▼ ver"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {gymDay.exercises.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Ejercicios
              </h3>
              <div>
                {gymDay.exercises.map((ex, i) => (
                  <ExerciseRow key={i} ex={ex} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm italic">
              Sesión de piernas omitida (semana de recuperación post-carrera).
            </p>
          )}

          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Core finisher <span className="text-lime-400 font-normal normal-case">(8-10 min — siempre)</span>
            </h3>
            <div>
              {gymDay.core.map((ex, i) => (
                <ExerciseRow key={i} ex={ex} />
              ))}
            </div>
          </div>

          {gymDay.exercises.length > 0 && (
            <button
              onClick={() => onStartSession(gymDay)}
              className="w-full py-2.5 bg-lime-400 hover:bg-lime-300 text-[#080c10] font-semibold rounded-xl text-sm transition-colors"
            >
              Empezar sesión
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function GymPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Session>({
    date: new Date().toISOString().split("T")[0],
    type: "Push",
    exercises: [emptyExercise()],
    duration_min: 70,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [todayGymDay, setTodayGymDay] = useState<GymDay | null>(null);

  useEffect(() => {
    setTodayGymDay(getTodayGymDay());
  }, []);

  useEffect(() => {
    fetchSessions().then((d) => { setSessions(d as Session[]); setLoading(false); });
  }, []);

  function handleStartSession(day: GymDay) {
    const allExercises = [...day.exercises, ...day.core];
    const filledExercises: Exercise[] = allExercises.map((ex) => ({
      name: ex.name,
      sets: Array.from({ length: ex.sets }, () => ({ kg: 0, reps: 0, rir: undefined, completed: false })),
    }));
    setForm((f) => ({
      ...f,
      type: day.type,
      exercises: filledExercises.length > 0 ? filledExercises : [emptyExercise()],
    }));
    setTimeout(() => {
      document.getElementById("gym-log-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function addExercise() {
    setForm((f) => ({ ...f, exercises: [...f.exercises, emptyExercise()] }));
  }

  function addSet(ei: number) {
    setForm((f) => {
      const exs = [...f.exercises];
      const last = exs[ei].sets.at(-1);
      exs[ei] = { ...exs[ei], sets: [...exs[ei].sets, { kg: last?.kg || 0, reps: last?.reps || 0, rir: last?.rir, completed: false }] };
      return { ...f, exercises: exs };
    });
  }

  function removeSet(ei: number, si: number) {
    setForm((f) => {
      const exs = [...f.exercises];
      exs[ei] = { ...exs[ei], sets: exs[ei].sets.filter((_, i) => i !== si) };
      return { ...f, exercises: exs };
    });
  }

  function removeExercise(ei: number) {
    setForm((f) => ({ ...f, exercises: f.exercises.filter((_, i) => i !== ei) }));
  }

  function updateExerciseName(ei: number, name: string) {
    setForm((f) => {
      const exs = [...f.exercises];
      exs[ei] = { ...exs[ei], name };
      return { ...f, exercises: exs };
    });
  }

  function updateSet(ei: number, si: number, field: "kg" | "reps" | "rir", value: string) {
    setForm((f) => {
      const exs = [...f.exercises];
      const sets = [...exs[ei].sets];
      sets[si] = { ...sets[si], [field]: parseFloat(value) || 0 };
      exs[ei] = { ...exs[ei], sets };
      return { ...f, exercises: exs };
    });
  }

  function toggleCompleted(ei: number, si: number) {
    setForm((f) => {
      const exs = [...f.exercises];
      const sets = [...exs[ei].sets];
      sets[si] = { ...sets[si], completed: !sets[si].completed };
      exs[ei] = { ...exs[ei], sets };
      return { ...f, exercises: exs };
    });
  }

  async function save() {
    setSaving(true);
    try {
      const result = await saveSession(form as Omit<StoredSession, "id">);
      setSessions((prev) => [result as Session, ...prev]);
      setSaved(true);
      setForm({ date: new Date().toISOString().split("T")[0], type: "Push", exercises: [emptyExercise()], duration_min: 70, notes: "" });
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-50">Gym</h1>

      {todayGymDay ? (
        <TodayPlanCard gymDay={todayGymDay} onStartSession={handleStartSession} />
      ) : (
        <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4 flex items-center justify-between">
          <span className="text-slate-500 text-sm">No hay sesión de gym hoy.</span>
          <span className="text-slate-500 text-sm">
            Próxima sesión: <span className="text-slate-300 font-medium">{nextGymDay()}</span>
          </span>
        </div>
      )}

      {/* Log form */}
      <div id="gym-log-form" className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold text-slate-200">Registrar sesión</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Fecha</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full bg-[#080c10] border border-[#1e2a35] rounded-xl px-3 py-2 text-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
            <div className="flex gap-1">
              {GYM_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    form.type === t
                      ? "bg-lime-400 text-[#080c10]"
                      : "bg-[#080c10] border border-[#1e2a35] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {form.exercises.map((ex, ei) => (
            <div key={ei} className="bg-[#080c10] border border-[#1e2a35] rounded-xl p-3 space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Ejercicio"
                  value={ex.name}
                  onChange={(e) => updateExerciseName(ei, e.target.value)}
                  list={`suggestions-${ei}`}
                  className="flex-1 bg-[#0f1419] border border-[#1e2a35] rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600"
                />
                <datalist id={`suggestions-${ei}`}>
                  {(SUGGESTED_EXERCISES[form.type] || []).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {form.exercises.length > 1 && (
                  <button onClick={() => removeExercise(ei)} className="text-slate-500 hover:text-red-400 text-sm px-1">✕</button>
                )}
              </div>

              {/* Sets header */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-slate-600 text-xs w-6" />
                <span className="text-slate-600 text-xs w-16 text-center">kg</span>
                <span className="text-slate-600 text-xs w-14 text-center">reps</span>
                <span className="text-slate-600 text-xs w-12 text-center">RIR</span>
                <span className="text-slate-600 text-xs flex-1 text-center">✓</span>
              </div>

              <div className="space-y-1.5">
                {ex.sets.map((set, si) => (
                  <div
                    key={si}
                    className={`flex items-center gap-2 px-1 py-1 rounded-lg transition-colors ${
                      set.completed ? "bg-lime-500/10 border border-lime-500/20" : ""
                    }`}
                  >
                    <span className="text-slate-500 text-xs w-6">S{si + 1}</span>
                    <input
                      type="number"
                      placeholder="kg"
                      value={set.kg || ""}
                      onChange={(e) => updateSet(ei, si, "kg", e.target.value)}
                      className={`w-16 bg-[#0f1419] border border-[#1e2a35] rounded-lg px-2 py-1 text-sm text-center ${
                        set.completed ? "text-slate-500 line-through" : "text-slate-200"
                      }`}
                    />
                    <input
                      type="number"
                      placeholder="reps"
                      value={set.reps || ""}
                      onChange={(e) => updateSet(ei, si, "reps", e.target.value)}
                      className={`w-14 bg-[#0f1419] border border-[#1e2a35] rounded-lg px-2 py-1 text-sm text-center ${
                        set.completed ? "text-slate-500 line-through" : "text-slate-200"
                      }`}
                    />
                    <input
                      type="number"
                      placeholder="RIR"
                      min={0}
                      max={5}
                      value={set.rir ?? ""}
                      onChange={(e) => updateSet(ei, si, "rir", e.target.value)}
                      className="w-12 bg-[#0f1419] border border-[#1e2a35] rounded-lg px-2 py-1 text-sm text-slate-200 text-center"
                    />
                    <input
                      type="checkbox"
                      checked={set.completed || false}
                      onChange={() => toggleCompleted(ei, si)}
                      className="w-4 h-4 accent-lime-400 cursor-pointer flex-1"
                    />
                    {ex.sets.length > 1 && (
                      <button onClick={() => removeSet(ei, si)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => addSet(ei)} className="text-xs text-lime-400 hover:text-lime-300 mt-1">
                + Serie
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addExercise}
          className="w-full py-2 border border-dashed border-[#1e2a35] rounded-xl text-sm text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
        >
          + Agregar ejercicio
        </button>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Duración (min)</label>
            <input
              type="number"
              value={form.duration_min}
              onChange={(e) => setForm((f) => ({ ...f, duration_min: parseInt(e.target.value) || 0 }))}
              className="w-full bg-[#080c10] border border-[#1e2a35] rounded-xl px-3 py-2 text-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notas</label>
            <input
              type="text"
              placeholder="Opcional..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full bg-[#080c10] border border-[#1e2a35] rounded-xl px-3 py-2 text-slate-200 text-sm placeholder-slate-600"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-[#080c10] font-bold rounded-xl transition-colors"
        >
          {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar sesión"}
        </button>
      </div>

      {/* History */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Historial</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Cargando...</p>
        ) : sessions.length === 0 ? (
          <p className="text-slate-500 text-sm">No hay sesiones registradas aún.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionHistoryCard key={s.id || s.date} session={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionHistoryCard({ session }: { session: Session }) {
  const typeColors: Record<string, string> = {
    Push:    "bg-lime-500/20 text-lime-300 border border-lime-500/20",
    Pull:    "bg-green-500/20 text-green-300 border border-green-500/20",
    Piernas: "bg-purple-500/20 text-purple-300 border border-purple-500/20",
  };
  const totalSets = session.exercises.reduce((s, e) => s + e.sets.length, 0);

  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[session.type] || "bg-slate-700 text-slate-300"}`}>
            {session.type}
          </span>
          <span className="text-slate-400 text-sm">{session.date}</span>
        </div>
        <span className="text-slate-500 text-xs">{session.duration_min}min · {totalSets} series</span>
      </div>
      <div className="space-y-1">
        {session.exercises.map((ex, i) => {
          const best = ex.sets.reduce((m, s) => s.kg > m ? s.kg : m, 0);
          return (
            <div key={i} className="flex items-center justify-between">
              <span className="text-slate-300 text-sm">{ex.name}</span>
              <span className="text-slate-500 text-xs">{ex.sets.length} series · max {best}kg</span>
            </div>
          );
        })}
      </div>
      {session.notes && (
        <p className="text-slate-500 text-xs mt-2 italic">{session.notes}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd C:/Users/lucas/training-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/lucas/training-app
git add app/gym/page.tsx
git commit -m "feat: gym RIR field, completed checkbox, green accent"
```

---

## Task 9: Metricas — PRs Section + Training Load Section

**Files:**
- Modify: `app/metricas/page.tsx`

Two new sections appended after the activity log:
1. "RÉCORDS PERSONALES" — static data, simple rows
2. "CARGA DE ENTRENAMIENTO" — uses `calcTrainingLoad` from `lib/training-readiness.ts` called with `STATIC_ACTIVITIES`

Note: `metricas/page.tsx` is a server component (async function). `calcTrainingLoad` returns `{ atl, ctl, tsb }`.

TSB interpretation thresholds:
- tsb > 5 → "Fresco"
- tsb >= -10 → "En forma"
- tsb >= -25 → "Fatigado"
- tsb < -25 → "Muy fatigado"

Also replace all `blue-400/500` accent references with `lime-400`.

- [ ] **Step 1: Replace app/metricas/page.tsx**

```tsx
import { getRecentActivities, getLatestWellness } from "@/lib/db";
import { calcTrainingLoad } from "@/lib/training-readiness";

const STATIC_ACTIVITIES = [
  { date: "2026-06-02", name: "VO2 máximo", distance_m: 5554, duration_s: 1812, avg_hr: 163, training_effect: 3.5 },
  { date: "2026-05-31", name: "Base", distance_m: 10324, duration_s: 3486, avg_hr: 164, training_effect: 4.0 },
  { date: "2026-05-28", name: "Tempo", distance_m: 6951, duration_s: 2106, avg_hr: 167, training_effect: 4.1 },
  { date: "2026-05-26", name: "Base", distance_m: 9500, duration_s: 3187, avg_hr: 161, training_effect: 4.1 },
  { date: "2026-05-24", name: "Base", distance_m: 7951, duration_s: 2767, avg_hr: 154, training_effect: 3.5 },
  { date: "2026-05-10", name: "Media Maratón Ciudad", distance_m: 21357, duration_s: 6936, avg_hr: 174, training_effect: 5.0 },
];

const WEEKLY_KM = [42, 48, 55, 51, 38, 62, 58];
const WEEK_LABELS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7"];

const PERSONAL_RECORDS = [
  { label: "PR Mejor 5K",  value: "24:17",   date: "nov 2025" },
  { label: "PR Mejor 10K", value: "49:41",   date: "nov 2025" },
  { label: "PR Media",     value: "1:51:42", date: "ago 2025" },
  { label: "PR 1km",       value: "4:09",    date: "may 2026" },
];

function tsbInterpretation(tsb: number): { label: string; color: string } {
  if (tsb > 5)   return { label: "Fresco",       color: "text-lime-400" };
  if (tsb >= -10) return { label: "En forma",    color: "text-lime-400" };
  if (tsb >= -25) return { label: "Fatigado",    color: "text-yellow-400" };
  return           { label: "Muy fatigado",       color: "text-red-400" };
}

export default async function MetricasPage() {
  const [liveActivities, wellness] = await Promise.all([
    getRecentActivities(10),
    getLatestWellness(),
  ]);

  const activities = liveActivities.length > 0 ? liveActivities : STATIC_ACTIVITIES;
  const hasLiveData = liveActivities.length > 0;
  const hrv = wellness?.hrv ?? 77;
  const hrvPct = wellness
    ? Math.round(
        ((wellness.hrv ?? 77) - (wellness.hrv_baseline_lower ?? 55)) /
          ((wellness.hrv_baseline_upper ?? 99) - (wellness.hrv_baseline_lower ?? 55)) *
          100
      )
    : 50;

  const maxKm = Math.max(...WEEKLY_KM);

  // Training load from static activities (server-side)
  const load = calcTrainingLoad(STATIC_ACTIVITIES);
  const tsb = tsbInterpretation(load.tsb);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-50">Métricas</h1>
        {!hasLiveData && (
          <span className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-full">
            Garmin export
          </span>
        )}
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox icon="❤️" label="FC Reposo" value="45" unit="bpm" sub="nivel atlético" color="text-lime-400" />
        <StatBox icon="📈" label="VO2max" value="54" unit="" sub="Superior — Garmin" color="text-lime-400" />
        <StatBox icon="🏃" label="PR Media" value="1:51:42" unit="" sub="24 ago 2025" color="text-lime-400" />
        <StatBox icon="🧠" label="HRV hoy" value={String(hrv)} unit="ms" sub={`${hrvPct}% del baseline`} color="text-purple-400" />
      </div>

      {/* Volume chart */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
          Volumen semanal (km)
        </h2>
        <div className="flex items-end gap-2 h-28">
          {WEEKLY_KM.map((km, i) => {
            const heightPct = (km / maxKm) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-slate-500 text-xs">{km}</span>
                <div
                  className="w-full rounded-t-md bar-gradient"
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-slate-600 text-xs">{WEEK_LABELS[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Race predictions */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Predicciones Garmin (jun 2026)
        </h2>
        <div className="space-y-2">
          {[
            { dist: "5K",      time: "21:53",   pace: "4:23/km", target: false },
            { dist: "10K",     time: "46:32",   pace: "4:39/km", target: false },
            { dist: "Media",   time: "1:45:05", pace: "4:59/km", target: true  },
            { dist: "Maratón", time: "3:53:55", pace: "5:33/km", target: true  },
          ].map((r) => (
            <div
              key={r.dist}
              className={`flex items-center justify-between p-3 rounded-xl ${
                r.target
                  ? "bg-lime-400/10 border border-lime-400/20"
                  : "bg-[#080c10]"
              }`}
            >
              <span className={`font-semibold text-sm ${r.target ? "text-lime-300" : "text-slate-300"}`}>
                {r.dist}
              </span>
              <div className="text-right">
                <span className={`font-extrabold text-base ${r.target ? "text-lime-400" : "text-slate-200"}`}>
                  {r.time}
                </span>
                <span className="text-slate-500 text-xs ml-2">{r.pace}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs mt-3 leading-snug">
          Tus tiempos reales son más conservadores — las predicciones asumen condiciones óptimas.
        </p>
      </div>

      {/* Activity log */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Últimas corridas{" "}
          {hasLiveData && (
            <span className="text-lime-400 normal-case font-normal">● live</span>
          )}
        </h2>
        <div className="space-y-2">
          {activities.map((a, i) => {
            const km = (a.distance_m / 1000).toFixed(1);
            const paceRaw = a.distance_m > 0 ? a.duration_s / (a.distance_m / 1000) : 0;
            const pace = paceRaw > 0
              ? `${Math.floor(paceRaw / 60)}:${String(Math.round(paceRaw % 60)).padStart(2, "0")}`
              : "--";
            const te = (a as { training_effect?: number }).training_effect ?? null;
            return (
              <div
                key={i}
                className="bg-[#0f1419] border border-[#1e2a35] rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-slate-200 text-sm font-semibold">{a.name}</p>
                  <p className="text-slate-500 text-xs">{a.date}</p>
                </div>
                <div className="flex gap-5 text-right">
                  <div>
                    <p className="text-slate-200 text-sm font-bold">{km}km</p>
                    <p className="text-slate-500 text-xs">{pace}/km</p>
                  </div>
                  <div>
                    <p className="text-slate-200 text-sm font-bold">{a.avg_hr} bpm</p>
                    {te !== null && <p className="text-slate-500 text-xs">TE {te}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personal Records */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Récords personales
        </h2>
        <div className="space-y-2">
          {PERSONAL_RECORDS.map((pr) => (
            <div key={pr.label} className="flex items-center justify-between py-1.5 border-b border-[#1e2a35] last:border-0">
              <span className="text-slate-400 text-sm">{pr.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-lime-400 font-bold text-sm font-mono">{pr.value}</span>
                <span className="text-slate-600 text-xs">({pr.date})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Training Load */}
      <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Carga de entrenamiento
        </h2>
        <div className="space-y-2">
          {[
            { label: "Carga aguda (ATL)", value: load.atl.toFixed(1), desc: "Fatiga reciente (7d)" },
            { label: "Carga crónica (CTL)", value: load.ctl.toFixed(1), desc: "Forma física (42d)" },
            { label: "Balance (TSB)", value: load.tsb.toFixed(1), desc: "CTL − ATL" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-[#1e2a35] last:border-0">
              <div>
                <p className="text-slate-300 text-sm">{item.label}</p>
                <p className="text-slate-600 text-xs">{item.desc}</p>
              </div>
              <span className="text-slate-200 font-bold text-sm font-mono">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-[#1e2a35] flex items-center justify-between">
          <span className="text-slate-400 text-sm">Estado actual</span>
          <span className={`font-bold text-sm ${tsb.color}`}>{tsb.label}</span>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  icon, label, value, unit, sub, color,
}: {
  icon: string; label: string; value: string; unit: string; sub: string; color: string;
}) {
  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-base leading-none">{icon}</span>
        <p className="text-slate-400 text-xs">{label}</p>
      </div>
      <p className={`text-2xl font-extrabold leading-none ${color}`}>
        {value}
        {unit && <span className="text-sm font-normal ml-1 text-slate-400">{unit}</span>}
      </p>
      <p className="text-slate-500 text-xs mt-1">{sub}</p>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd C:/Users/lucas/training-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/lucas/training-app
git add app/metricas/page.tsx
git commit -m "feat: metrics PRs section, training load ATL/CTL/TSB, green accent"
```

---

## Task 10: Chat Page — Athlos Style

**Files:**
- Modify: `app/chat/page.tsx`

- [ ] **Step 1: Replace app/chat/page.tsx**

```tsx
"use client";
import { useState, useRef, useEffect } from "react";

interface Message { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "¿Cómo debería correr mañana si dormí poco?",
  "¿En qué zona tengo que ir en el long run?",
  "¿Qué ejercicios de gym priorizo esta semana?",
  "¿Cómo me preparo para la media maratón?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const content = text || input.trim();
    if (!content) return;

    const userMsg: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error de conexión." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-lime-400/20 border border-lime-400/40 flex items-center justify-center">
          <span className="text-lime-400 text-base">🤖</span>
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-50 leading-none">Coach IA</h1>
          <p className="text-slate-500 text-xs mt-0.5">Tu entrenador personal</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-lime-400" />
          <span className="text-slate-500 text-xs">Activo</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            {/* Welcome bubble */}
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-lime-400/20 border border-lime-400/30 flex items-center justify-center">
                <span className="text-lime-400 text-xs">🤖</span>
              </div>
              <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                <p className="text-slate-300 text-sm">
                  Hola. Soy tu coach de entrenamiento. Tengo acceso a tu plan, tus datos de Garmin y tu historial de gym. ¿En qué te puedo ayudar?
                </p>
              </div>
            </div>

            {/* Suggestions */}
            <div className="pl-9">
              <p className="text-slate-500 text-xs mb-2">Preguntas frecuentes</p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left bg-[#0f1419] border border-[#1e2a35] hover:border-lime-400/30 rounded-xl p-3 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-lime-400/20 border border-lime-400/30 flex items-center justify-center mb-0.5">
                <span className="text-lime-400 text-xs">🤖</span>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-lime-400 text-[#080c10] font-medium rounded-br-sm"
                  : "bg-[#0f1419] border border-[#1e2a35] text-slate-200 rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-lime-400/20 border border-lime-400/30 flex items-center justify-center mb-0.5">
              <span className="text-lime-400 text-xs">🤖</span>
            </div>
            <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl rounded-bl-sm px-4 py-2.5">
              <span className="text-slate-400 text-sm">Pensando</span>
              <span className="animate-pulse text-slate-400">...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Preguntá algo..."
          className="flex-1 bg-[#0f1419] border border-[#1e2a35] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-lime-400/50"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="px-4 py-3 bg-lime-400 hover:bg-lime-300 disabled:opacity-40 text-[#080c10] rounded-xl font-bold text-sm transition-colors"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd C:/Users/lucas/training-app && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/lucas/training-app
git add app/chat/page.tsx
git commit -m "feat: chat Athlos style — green avatar, lime user bubbles, coach avatar"
```

---

## Task 11: Final Build + Push

**Files:** None (verification only)

- [ ] **Step 1: Full production build**

```bash
cd C:/Users/lucas/training-app && npm run build 2>&1
```

Expected: `✓ Compiled successfully` with no TypeScript or linting errors. If errors appear, fix them before proceeding.

- [ ] **Step 2: Stage all changed files**

```bash
cd C:/Users/lucas/training-app && git add -A
```

- [ ] **Step 3: Final commit**

```bash
cd C:/Users/lucas/training-app
git commit -m "Full redesign: green accent, Athlos-style cards, RIR in gym, PRs in metrics"
```

- [ ] **Step 4: Push**

```bash
cd C:/Users/lucas/training-app && git push
```

Expected: branch pushed to remote successfully.

---

## Self-Review

### Spec coverage check

| Requirement | Covered in task |
|---|---|
| `globals.css` → `#080c10` bg, green accent vars | Task 1 |
| `layout.tsx` body bg class | Task 1 |
| `ReadinessCard` factor rows (HRV/Sleep/Load + dot + label) | Task 4 |
| `ReadinessCard` recommendation block | Task 4 |
| `ReadinessCardCompact` new component (score circle + rec + sub-scores) | Task 5 |
| `WeekSummary` progress bar + completed count | Task 6 |
| `WeekSummary` "Semana X — fase" header | Task 6 |
| `page.tsx` greeting "Buenos días/tardes/noches, Lucas 👋" | Task 7 |
| `page.tsx` big "today workout" card with CTA | Task 7 |
| `page.tsx` ReadinessCardCompact in dashboard | Task 7 |
| `gym/page.tsx` RIR field per set | Task 8 |
| `gym/page.tsx` completed checkbox, green bg on done sets | Task 8 |
| `lib/gym-storage.ts` GymSet type updated | Task 3 |
| `metricas/page.tsx` PRs section | Task 9 |
| `metricas/page.tsx` Training Load ATL/CTL/TSB | Task 9 |
| `chat/page.tsx` Athlos style with green avatars | Task 10 |
| Nav blue → lime active | Task 2 |
| Build + git push | Task 11 |

### Placeholder scan

No TBD, TODO, or "similar to Task N" patterns. All code blocks are complete.

### Type consistency

- `GymSet` updated in `lib/gym-storage.ts` (Task 3) with `rir?: number; completed?: boolean`
- Local `GymSet` in `app/gym/page.tsx` (Task 8) mirrors exactly: `{ kg: number; reps: number; rir?: number; completed?: boolean }`
- `updateSet` in gym page accepts `"kg" | "reps" | "rir"` (all numeric)  
- `toggleCompleted` handles the boolean `completed` field separately — no type conflict
- `ReadinessCardCompact` fetches its own data from `/api/readiness` — same `Readiness` interface as `ReadinessCard`, no sharing needed
- `calcTrainingLoad` called with `STATIC_ACTIVITIES` which satisfy `ActivityData[]` from `lib/training-readiness.ts` (has `date`, `duration_s`, `avg_hr`, `distance_m`) ✓
