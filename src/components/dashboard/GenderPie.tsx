"use client";

import * as React from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GenderDistribution } from "@/lib/podomedia/types";

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

type View = "baseline" | "segment";

export function GenderPieCompare(props: {
  baseline?: GenderDistribution;
  segment?: GenderDistribution;
}) {
  const base = props.baseline;
  const seg = props.segment;
  const hasSegment = Boolean(seg);

  const [view, setView] = React.useState<View>(() => (seg ? "segment" : "baseline"));

  React.useEffect(() => {
    if (!seg) setView("baseline");
  }, [seg]);

  const segmentOnly = Boolean(seg) && !base;
  const shown = segmentOnly ? seg : view === "baseline" ? base : seg;
  const deltaFemalePp =
    base && seg ? (seg.items.여성.ratio - base.items.여성.ratio) * 100 : null;
  const deltaMalePp =
    base && seg ? (seg.items.남성.ratio - base.items.남성.ratio) * 100 : null;

  const data = shown
    ? [
        { name: "남성", value: Math.round(shown.items.남성.ratio * 1000) / 10, fill: "#60a5fa" },
        { name: "여성", value: Math.round(shown.items.여성.ratio * 1000) / 10, fill: "#a78bfa" },
      ]
    : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {segmentOnly ? (
          <div className="text-xs text-white/60">세그먼트 성별 (전체·3상권 합산 기준)</div>
        ) : (
          <div className="flex gap-2">
            {hasSegment ? (
              <button
                type="button"
                onClick={() => setView("segment")}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs",
                  view === "segment"
                    ? "border-violet-300/30 bg-violet-500/15 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
                )}
              >
                세그먼트 성별
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setView("baseline")}
              className={cn(
                "rounded-md border px-2 py-1 text-xs",
                view === "baseline"
                  ? "border-violet-300/30 bg-violet-500/15 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
              )}
            >
              상권 성별
            </button>
          </div>
        )}

        {!segmentOnly && hasSegment && deltaFemalePp !== null ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-white/10 text-white/80">
              여성 {deltaFemalePp >= 0 ? "+" : ""}
              {deltaFemalePp.toFixed(1)}%p
            </Badge>
            <Badge variant="outline" className="border-white/10 text-white/80">
              남성 {deltaMalePp! >= 0 ? "+" : ""}
              {deltaMalePp!.toFixed(1)}%p
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="h-[180px] w-full">
        {!shown ? (
          <div className="text-sm text-white/70">성별 데이터가 없습니다.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                formatter={(value, name) => {
                  const n = value == null ? NaN : typeof value === "number" ? value : Number(value);
                  const pctStr = Number.isFinite(n) ? `${n.toFixed(1)}%` : "";
                  return [pctStr, String(name ?? "")];
                }}
                contentStyle={{
                  background: "rgba(9, 9, 11, 0.9)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.9)",
                }}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
                stroke="rgba(255,255,255,0.12)"
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {shown ? (
        <div className="grid grid-cols-2 gap-2 text-xs text-white/80">
          <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1">
            남성 {pct(shown.items.남성.ratio)}
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1">
            여성 {pct(shown.items.여성.ratio)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

