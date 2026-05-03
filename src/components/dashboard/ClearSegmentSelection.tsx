"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildDashboardSearchParams } from "@/lib/dashboard-nav";
import type { Market } from "@/lib/podomedia/types";
import type { ViewMode } from "@/components/dashboard/ModeTabs";

/** 선택 세그를 해제하고 상권 기본 분석 화면으로 돌아갑니다. */
export function ClearSegmentSelection(props: { market: Market; view: ViewMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  return (
    <button
      type="button"
      onClick={() => {
        const next = buildDashboardSearchParams({
          market: props.market,
          view: props.view,
          segment: null,
          existing: sp,
        });
        const qs = next.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
        router.refresh();
      }}
      className="text-xs text-white/55 underline-offset-2 hover:text-white/85 hover:underline"
    >
      기본 상권 분석으로
    </button>
  );
}
