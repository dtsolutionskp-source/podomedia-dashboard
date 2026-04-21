"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ReactivityChart(props: {
  data: { market: string; liftPp: number; reactivityPp: number }[];
}) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={props.data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="market" stroke="rgba(255,255,255,0.65)" />
          <YAxis stroke="rgba(255,255,255,0.65)" tickFormatter={(v) => `${v}%p`} />
          <Tooltip
            formatter={(value) => {
              const n = value == null ? NaN : typeof value === "number" ? value : Number(value);
              return Number.isFinite(n) ? `${n.toFixed(1)}%p` : "";
            }}
            contentStyle={{
              background: "rgba(9, 9, 11, 0.9)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.9)",
            }}
          />
          <Legend wrapperStyle={{ color: "rgba(255,255,255,0.8)" }} />
          <Bar dataKey="liftPp" name="상권 정보 대비 변화" fill="#a78bfa" radius={[6, 6, 0, 0]} />
          <Bar dataKey="reactivityPp" name="타 상권 평균 대비 반응성" fill="#22c55e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

