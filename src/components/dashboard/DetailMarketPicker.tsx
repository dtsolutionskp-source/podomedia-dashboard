"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Combobox } from "@/components/dashboard/Combobox";
import { buildDashboardSearchParams } from "@/lib/dashboard-nav";
import { MARKETS, type Market } from "@/lib/podomedia/types";

export function DetailMarketPicker(props: {
  market: Market;
  segment: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const options = MARKETS.map((m) => ({ value: m, label: m }));

  return (
    <Combobox
      value={props.market}
      placeholder="상권 비교"
      options={options}
      onChange={(v) => {
        const next = buildDashboardSearchParams({
          market: v as Market,
          view: "segment",
          segment: props.segment,
          existing: sp,
        });
        const qs = next.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
        router.refresh();
      }}
      className="w-[200px]"
    />
  );
}

