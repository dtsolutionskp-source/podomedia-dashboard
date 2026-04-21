"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Combobox } from "@/components/dashboard/Combobox";
import type { ViewMode } from "@/components/dashboard/ModeTabs";
import { buildDashboardSearchParams } from "@/lib/dashboard-nav";
import { MARKETS, type Market } from "@/lib/podomedia/types";

export function FiltersBar(props: {
  market: Market;
  markets: { value: Market; label: string }[];
  segment: string | null;
  segments: { segmentId: string; segmentName: string }[];
  view: ViewMode;
  /** false이면 상권 콤보만 숨김(세그먼트 기준 보기 상단 등). 상권 변경은 하단 상세에서. */
  showMarketPicker?: boolean;
}) {
  const showMarket = props.showMarketPicker !== false;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const push = (next: URLSearchParams) => {
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    router.refresh();
  };

  const segmentOptions = props.segments.map((s) => ({
    value: s.segmentId,
    label: s.segmentName,
    keywords: s.segmentId.replaceAll("_", " "),
  }));

  return (
    <div className="flex flex-wrap items-center gap-3 relative z-20 pointer-events-auto">
      {showMarket ? (
        <Combobox
          value={props.market}
          placeholder="상권 선택"
          options={props.markets}
          onChange={(v) => {
            const market = (MARKETS as readonly string[]).includes(v) ? (v as Market) : props.market;
            const next = buildDashboardSearchParams({
              market,
              view: props.view,
              segment: props.segment,
              existing: sp,
            });
            push(next);
          }}
          className="w-[220px]"
        />
      ) : null}
      {props.segments.length ? (
        <Combobox
          value={props.segment}
          placeholder="세그먼트 선택"
          options={segmentOptions}
          onChange={(v) => {
            const next = buildDashboardSearchParams({
              market: props.market,
              view: props.view,
              segment: v,
              existing: sp,
            });
            push(next);
          }}
          className="w-[320px]"
        />
      ) : null}
    </div>
  );
}

