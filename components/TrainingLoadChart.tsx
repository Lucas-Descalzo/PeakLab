"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { week: "S-5", atl: 18, ctl: 22, tsb: 4 },
  { week: "S-4", atl: 28, ctl: 24, tsb: -4 },
  { week: "S-3", atl: 15, ctl: 22, tsb: 7 },
  { week: "S-2", atl: 32, ctl: 25, tsb: -7 },
  { week: "S-1", atl: 22, ctl: 24, tsb: 2 },
  { week: "Hoy", atl: 18, ctl: 23, tsb: 5 },
];

const current = data[data.length - 1];

function getTsbStatus(tsb: number): { label: string; color: string } {
  if (tsb > 0) return { label: "Fresco", color: "text-lime-400" };
  if (tsb >= -5) return { label: "En forma", color: "text-lime-400" };
  return { label: "Fatigado", color: "text-orange-400" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 font-semibold mb-1">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-medium">
          {entry.name.toUpperCase()}: {entry.value > 0 ? "+" : ""}{entry.value}
        </p>
      ))}
    </div>
  );
}

export default function TrainingLoadChart() {
  const { label: tsbLabel, color: tsbColor } = getTsbStatus(current.tsb);

  return (
    <div className="bg-[#0f1419] border border-[#1e2a35] rounded-2xl p-4 space-y-4">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
        Carga de entrenamiento
      </h2>

      {/* Line chart */}
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="week"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#1e2a35" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px", color: "#94a3b8" }}
            formatter={(value: string) => value.toUpperCase()}
          />
          <Line
            type="monotone"
            dataKey="atl"
            stroke="#4ADE80"
            strokeWidth={2}
            dot={{ fill: "#4ADE80", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="ctl"
            stroke="#60A5FA"
            strokeWidth={2}
            dot={{ fill: "#60A5FA", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="tsb"
            stroke="#FBBF24"
            strokeWidth={2}
            strokeDasharray="4 2"
            dot={{ fill: "#FBBF24", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Current values */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#080c10] border border-[#1e2a35] rounded-xl p-3 text-center">
          <p className="text-slate-500 text-xs mb-1">ATL</p>
          <p className="text-[#4ADE80] font-extrabold text-xl leading-none">{current.atl}</p>
          <p className="text-slate-600 text-xs mt-1">Carga aguda</p>
        </div>
        <div className="bg-[#080c10] border border-[#1e2a35] rounded-xl p-3 text-center">
          <p className="text-slate-500 text-xs mb-1">CTL</p>
          <p className="text-[#60A5FA] font-extrabold text-xl leading-none">{current.ctl}</p>
          <p className="text-slate-600 text-xs mt-1">Carga crónica</p>
        </div>
        <div className="bg-[#080c10] border border-[#1e2a35] rounded-xl p-3 text-center">
          <p className="text-slate-500 text-xs mb-1">TSB</p>
          <p className="text-[#FBBF24] font-extrabold text-xl leading-none">
            {current.tsb > 0 ? "+" : ""}{current.tsb}
          </p>
          <p className={`text-xs mt-1 font-medium ${tsbColor}`}>{tsbLabel}</p>
        </div>
      </div>
    </div>
  );
}
