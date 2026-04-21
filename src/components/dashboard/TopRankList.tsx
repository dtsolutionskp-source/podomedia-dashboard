"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buildDashboardSearchParams } from "@/lib/dashboard-nav";

import type { Market, TopSegment } from "@/lib/podomedia/types";
import type { ViewMode } from "@/components/dashboard/ModeTabs";

export function TopRankRows(props: {
  listKind: "attention" | "visit";
  items: TopSegment[];
  selectedSegmentId: string | null;
  market: Market;
  view: ViewMode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const select = (segmentId: string) => {
    const next = buildDashboardSearchParams({
      market: props.market,
      view: props.view,
      segment: segmentId,
      existing: sp,
    });
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    router.refresh();
  };

  return (
    <div className="divide-y divide-white/10">
      {props.items.length === 0 ? (
        <div className="px-4 py-6 text-sm text-white/55">표시할 항목이 없습니다.</div>
      ) : null}
      {props.items.map((t, idx) => {
        const selected = props.selectedSegmentId === t.segmentId;
        const listSignals = props.listKind === "attention" ? t.listSignals : t.visitListSignals;
        const auxListSignals = props.listKind === "attention" ? t.auxListSignals : t.visitAuxListSignals;
        const reason = props.listKind === "attention" ? t.reason : t.visitReason;
        return (
          <button
            key={t.segmentId}
            type="button"
            onClick={() => select(t.segmentId)}
            className={cn(
              "block w-full text-left px-4 py-3 hover:bg-white/8 transition-colors",
              selected && "bg-violet-500/10",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-white/10 text-white/70">
                    {idx + 1}
                  </Badge>
                  <div className="truncate font-medium text-white">{t.segmentName}</div>
                </div>
                <div className="mt-1 text-xs text-white/70 line-clamp-3">{reason}</div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex flex-wrap justify-end gap-2 max-w-[200px]">
                  {listSignals.map((s, i) => (
                    <Badge
                      key={`${t.segmentId}-sig-${i}`}
                      variant="outline"
                      className={
                        s.tier === "strong"
                          ? "border-violet-400/35 text-violet-100 text-[10px] leading-tight text-right whitespace-normal"
                          : "border-white/15 text-white/75 text-[10px] leading-tight text-right whitespace-normal"
                      }
                    >
                      {s.badge}
                    </Badge>
                  ))}
                </div>
                {auxListSignals?.length ? (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {auxListSignals.map((s, i) => (
                      <Badge
                        key={`${t.segmentId}-aux-${i}`}
                        variant="outline"
                        className="border-white/10 text-white/55 text-[10px]"
                      >
                        {s.badge}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function TopRankList(props: {
  title: string;
  listKind: "attention" | "visit";
  description: string;
  items: TopSegment[];
  selectedSegmentId: string | null;
  market: Market;
  view: ViewMode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-sm font-semibold text-white/90">{props.title}</div>
        <div className="text-xs text-white/60 max-w-xl sm:text-right">{props.description}</div>
      </div>
      <TopRankRows
        listKind={props.listKind}
        items={props.items}
        selectedSegmentId={props.selectedSegmentId}
        market={props.market}
        view={props.view}
      />
    </div>
  );
}
