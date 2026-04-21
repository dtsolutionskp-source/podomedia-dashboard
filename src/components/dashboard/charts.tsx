"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AgeDistribution, GenderDistribution } from "@/lib/podomedia/types";

function pct(x: number): number {
  return Math.round(x * 1000) / 10; // 0.1% 단위
}

function tooltipPct(value: unknown): string {
  if (value === null || value === undefined) return "";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? `${n}%` : "";
}

function shortAgeLabel(label: string): string {
  // "18세 ~ 19세" -> "18-19", "75세 이상" -> "75+"
  const s = label.replaceAll(" ", "");
  const plus = s.match(/^(\d+)세이상$/);
  if (plus) return `${plus[1]}+`;
  const m = s.match(/^(\d+)세~(\d+)세$/);
  if (m) return `${m[1]}-${m[2]}`;
  return label;
}

export function GenderCompareChart(props: {
  baseline?: GenderDistribution;
  segment?: GenderDistribution;
}) {
  const base = props.baseline;
  const seg = props.segment;
  const data: { key: string; baseline: number; segment: number | null }[] = [
    {
      key: "남성",
      baseline: base ? pct(base.items.남성.ratio) : 0,
      segment: seg ? pct(seg.items.남성.ratio) : null,
    },
    {
      key: "여성",
      baseline: base ? pct(base.items.여성.ratio) : 0,
      segment: seg ? pct(seg.items.여성.ratio) : null,
    },
  ];

  return (
    <div className="h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="key" stroke="rgba(255,255,255,0.65)" />
          <YAxis tickFormatter={(v) => `${v}%`} stroke="rgba(255,255,255,0.65)" />
          <Tooltip
            formatter={(value) => tooltipPct(value)}
            contentStyle={{
              background: "rgba(9, 9, 11, 0.9)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.9)",
            }}
          />
          <Legend wrapperStyle={{ color: "rgba(255,255,255,0.8)" }} />
          <Bar dataKey="baseline" name="상권 정보" fill="#a78bfa" radius={[6, 6, 0, 0]} />
          {seg ? (
            <Bar dataKey="segment" name="세그먼트" fill="#22c55e" radius={[6, 6, 0, 0]} />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AgeStackedChart(props: {
  baseline?: AgeDistribution;
  segment?: AgeDistribution;
}) {
  const base = props.baseline;
  const seg = props.segment;

  const keys = base?.items.map((x) => x.key) ?? seg?.items.map((x) => x.key) ?? [];
  const data = keys.map((k) => {
    const b = base?.items.find((x) => x.key === k)?.ratio ?? 0;
    const s = seg?.items.find((x) => x.key === k)?.ratio ?? 0;
    return { key: k, baseline: pct(b), segment: seg ? pct(s) : null };
  });

  return (
    <div className="w-full overflow-x-auto">
      {/* 연령대는 '구간'이므로 가로 폭을 넉넉히 확보 */}
      <div className="h-[360px] min-w-[980px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="key"
            interval={0}
            height={28}
            tickFormatter={(v) => shortAgeLabel(String(v))}
            stroke="rgba(255,255,255,0.65)"
          />
          <YAxis tickFormatter={(v) => `${v}%`} stroke="rgba(255,255,255,0.65)" />
          <Tooltip
            formatter={(value) => tooltipPct(value)}
            contentStyle={{
              background: "rgba(9, 9, 11, 0.9)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.9)",
            }}
          />
          <Legend wrapperStyle={{ color: "rgba(255,255,255,0.8)" }} />
          <Bar dataKey="baseline" name="상권 정보" fill="#60a5fa" radius={[6, 6, 0, 0]} />
          {seg ? (
            <Bar dataKey="segment" name="세그먼트" fill="#f472b6" radius={[6, 6, 0, 0]} />
          ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AgeLineCompareChart(props: {
  baseline?: AgeDistribution;
  segment?: AgeDistribution;
  /** 상권 분포 없이 세그만 그릴 때 범례·축 라벨 */
  segmentOnlyLabel?: string;
}) {
  const base = props.baseline;
  const seg = props.segment;
  const segmentOnly = Boolean(seg) && !base;
  const segLineName = props.segmentOnlyLabel ?? "세그먼트";

  const keys = base?.items.map((x) => x.key) ?? seg?.items.map((x) => x.key) ?? [];
  const data = keys.map((k) => {
    const b = base?.items.find((x) => x.key === k)?.ratio ?? null;
    const s = seg?.items.find((x) => x.key === k)?.ratio ?? null;
    return {
      key: k,
      baseline: b === null ? null : pct(b),
      segment: s === null ? null : pct(s),
    };
  });

  return (
    <div className="w-full overflow-x-auto">
      <div className="h-[360px] min-w-[980px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="key"
              interval={0}
              height={28}
              tickFormatter={(v) => shortAgeLabel(String(v))}
              stroke="rgba(255,255,255,0.65)"
            />
            <YAxis tickFormatter={(v) => `${v}%`} stroke="rgba(255,255,255,0.65)" />
            <Tooltip
              formatter={(value) => tooltipPct(value)}
              labelFormatter={(l) => shortAgeLabel(String(l))}
              contentStyle={{
                background: "rgba(9, 9, 11, 0.9)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.9)",
              }}
            />
            <Legend wrapperStyle={{ color: "rgba(255,255,255,0.8)" }} />
            {!segmentOnly ? (
              <Line
                type="monotone"
                dataKey="baseline"
                name="상권 정보"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ) : null}
            {seg ? (
              <Line
                type="monotone"
                dataKey="segment"
                name={segLineName}
                stroke="#f472b6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

