"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";

import type { TopSegmentListSignal } from "@/lib/podomedia/types";

export type SegmentMarketInsightCard = {
  market: string;
  attentionReason: string;
  attentionListSignals: TopSegmentListSignal[];
  attentionAuxListSignals: TopSegmentListSignal[];
  visitReason: string;
  visitListSignals: TopSegmentListSignal[];
  visitAuxListSignals: TopSegmentListSignal[];
  visitSelectionReason: string;
};

export function TopMarketList(props: {
  title: string;
  /** 주목(집중도) vs 방문 종합(점유·규모) — 카드에 쓰는 문장·배지 축 */
  variant: "attention" | "visit";
  items: SegmentMarketInsightCard[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const MEDALS = ["🥇", "🥈", "🥉"] as const;

  const selectMarket = (market: string) => {
    const next = new URLSearchParams(sp);
    next.set("view", "segment");
    next.set("market", market);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    router.refresh();
  };

  if (!props.items.length) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-white/75">{props.title}</div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/55">
          이 기준으로 비교할 만한 상권이 없거나, 데이터가 부족합니다.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-white/75">{props.title}</div>
      <div className="grid gap-3 md:grid-cols-3">
      {props.items.slice(0, 3).map((x, idx) => {
        const rank = idx + 1;
        const medal = MEDALS[idx] ?? `${rank}위`;
        const isAttention = props.variant === "attention";
        const badges = isAttention ? x.attentionListSignals : x.visitListSignals;
        const aux = isAttention ? x.attentionAuxListSignals : x.visitAuxListSignals;
        return (
          <button
            key={x.market}
            type="button"
            onClick={() => selectMarket(x.market)}
            className="rounded-lg border border-white/10 bg-white/5 p-3 text-left hover:bg-white/8 transition-colors"
          >
            <div className="flex items-center gap-2 font-medium text-white">
              <span className="text-2xl leading-none select-none" title={`${rank}위`} aria-hidden>
                {medal}
              </span>
              <span>{x.market}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {badges.map((s, i) => (
                <Badge
                  key={`${x.market}-b-${i}`}
                  variant="outline"
                  className={
                    s.tier === "strong"
                      ? "border-violet-400/35 text-violet-100"
                      : "border-white/15 text-white/75"
                  }
                >
                  {s.badge}
                </Badge>
              ))}
              {aux.map((s, i) => (
                <Badge
                  key={`${x.market}-a-${i}`}
                  variant="outline"
                  className="border-white/10 text-white/55 text-[10px]"
                >
                  {s.badge}
                </Badge>
              ))}
            </div>
            {isAttention ? (
              <p className="mt-2 text-xs text-white/70 leading-relaxed line-clamp-4">{x.attentionReason}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-white/70 leading-relaxed line-clamp-3">{x.visitReason}</p>
                <p className="mt-2 text-xs text-white/55 leading-relaxed line-clamp-4 border-t border-white/10 pt-2">
                  이 상권이 두드러지는 이유: {x.visitSelectionReason}
                </p>
              </>
            )}
          </button>
        );
      })}
      </div>
    </div>
  );
}
