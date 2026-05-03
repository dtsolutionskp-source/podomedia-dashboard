"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { buildDashboardSearchParams } from "@/lib/dashboard-nav";
import type { Market } from "@/lib/podomedia/types";
import type { ViewMode } from "@/components/dashboard/ModeTabs";

/** 선택 세그를 해제하고 상권 기본 분석 화면으로 돌아갑니다. */
export function ClearSegmentSelection(props: { market: Market; view: ViewMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
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
      className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
    >
      기본 상권 분석으로
    </Button>
  );
}
