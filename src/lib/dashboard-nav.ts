import type { ReadonlyURLSearchParams } from "next/navigation";

import type { Market } from "@/lib/podomedia/types";

export type DashboardView = "market" | "segment";

/**
 * App Router에서 useSearchParams()가 비는 경우가 있어,
 * 상위(서버)에서 내려준 market·view·segment를 항상 쿼리에 포함시킵니다.
 */
export function buildDashboardSearchParams(opts: {
  market: Market;
  view: DashboardView;
  segment: string | null;
  /** 그 외 쿼리 키만 보존 (market/view/segment는 opts가 우선) */
  existing?: URLSearchParams | ReadonlyURLSearchParams | null;
}): URLSearchParams {
  const next = new URLSearchParams();
  next.set("market", opts.market);
  next.set("view", opts.view);
  if (opts.segment) next.set("segment", opts.segment);
  if (opts.existing) {
    opts.existing.forEach((v: string, k: string) => {
      if (k === "market" || k === "view" || k === "segment") return;
      if (!next.has(k)) next.set(k, v);
    });
  }
  return next;
}
