"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Combobox } from "@/components/dashboard/Combobox";
import type { ViewMode } from "@/components/dashboard/ModeTabs";
import { buildDashboardSearchParams } from "@/lib/dashboard-nav";

import type { Market } from "@/lib/podomedia/types";

export function DetailSegmentPicker(props: {
  segment: string | null;
  segments: { segmentId: string; segmentName: string }[];
  market: Market;
  view: ViewMode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const options = props.segments.map((s) => ({
    value: s.segmentId,
    label: s.segmentName,
    keywords: s.segmentId.replaceAll("_", " "),
  }));

  return (
    <Combobox
      value={props.segment}
      placeholder="세그먼트 검색·변경"
      options={options}
      onChange={(v) => {
        const next = buildDashboardSearchParams({
          market: props.market,
          view: props.view,
          segment: v,
          existing: sp,
        });
        const qs = next.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
        router.refresh();
      }}
      className="w-[320px]"
    />
  );
}

