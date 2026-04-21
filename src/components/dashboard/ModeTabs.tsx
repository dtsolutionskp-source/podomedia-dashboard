"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildDashboardSearchParams } from "@/lib/dashboard-nav";

import type { Market } from "@/lib/podomedia/types";

export type ViewMode = "market" | "segment";

export function ModeTabs(props: {
  mode: ViewMode;
  market: Market;
  segment: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const pushMode = (mode: ViewMode) => {
    const next = buildDashboardSearchParams({
      market: props.market,
      view: mode,
      segment: props.segment,
      existing: sp,
    });
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    router.refresh();
  };

  return (
    <Tabs value={props.mode}>
      <TabsList className="bg-white/5 border border-white/10">
        <TabsTrigger value="market" onClick={() => pushMode("market")}>
          상권 기준 보기
        </TabsTrigger>
        <TabsTrigger value="segment" onClick={() => pushMode("segment")}>
          세그먼트 기준 보기
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

