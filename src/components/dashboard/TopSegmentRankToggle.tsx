"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import type { Market, TopSegment } from "@/lib/podomedia/types";
import type { ViewMode } from "@/components/dashboard/ModeTabs";
import { TopRankRows } from "@/components/dashboard/TopRankList";

const ATT_DESC = "해당 상권에서 평균 대비 유독 많이 나타나는 주목할만한 관심사입니다.";
const VISIT_DESC = "방문 규모와 점유율을 종합적으로 고려한 주요 관심사입니다.";

export function TopSegmentRankToggle(props: {
  market: Market;
  view: ViewMode;
  selectedSegmentId: string | null;
  rankedAttention: TopSegment[];
  rankedVisitSummary: TopSegment[];
}) {
  const [tab, setTab] = React.useState<"attention" | "visit">("attention");

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("attention")}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              tab === "attention"
                ? "border-violet-400/40 bg-violet-500/20 text-white"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
            )}
          >
            주목 세그먼트
          </button>
          <button
            type="button"
            onClick={() => setTab("visit")}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              tab === "visit"
                ? "border-violet-400/40 bg-violet-500/20 text-white"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
            )}
          >
            방문 종합 세그먼트
          </button>
        </div>
        <div className="text-xs text-white/60 max-w-xl sm:text-right">
          {tab === "attention" ? ATT_DESC : VISIT_DESC}
        </div>
      </div>

      <TopRankRows
        listKind={tab}
        items={tab === "attention" ? props.rankedAttention : props.rankedVisitSummary}
        selectedSegmentId={props.selectedSegmentId}
        market={props.market}
        view={props.view}
      />
    </div>
  );
}
