import { unstable_noStore as noStore } from "next/cache";

import { loadBaselineForMarket, loadSegmentForMarket, listSegments } from "./load";
import { MARKETS, type Market, type MarketInsightNarrative, type TopSegmentListSignal } from "./types";

type BaselineRow = Awaited<ReturnType<typeof loadBaselineForMarket>>;
type SegmentRow = Awaited<ReturnType<typeof loadSegmentForMarket>>;

function pp(x: number): number {
  return x * 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function pickTotalPreferAge(input: {
  status: { gender: "ok" | "missing" | "error"; age: "ok" | "missing" | "error" };
  gender?: { total: number };
  age?: { total: number };
}): number | null {
  if (input.status.age === "ok") return input.age?.total ?? null;
  if (input.status.gender === "ok") return input.gender?.total ?? null;
  return null;
}

/** SA/LS: 연령·성별 혼용 금지 — 둘 다 연령 OK면 연령 합, 아니면 둘 다 성별 OK일 때만 성별 합 */
function pickCompatibleBaselineSegment(
  baseline: BaselineRow,
  seg: SegmentRow,
): { basis: "age" | "gender"; marketTotal: number; segmentCount: number } | null {
  if (baseline.status.age === "ok" && baseline.age && seg.status.age === "ok" && seg.age) {
    return { basis: "age", marketTotal: baseline.age.total, segmentCount: seg.age.total };
  }
  if (baseline.status.gender === "ok" && baseline.gender && seg.status.gender === "ok" && seg.gender) {
    return { basis: "gender", marketTotal: baseline.gender.total, segmentCount: seg.gender.total };
  }
  return null;
}

/** SA 분자·분모: ‘전체’ 파일과 해당 상권 파일이 동일 기준(연령 또는 성별)일 때만 계산 */
function pickCompatibleWholeVsMarket(
  whole: SegmentRow,
  marketSeg: SegmentRow,
): { basis: "age" | "gender"; totalCount: number; marketCount: number } | null {
  if (whole.status.age === "ok" && whole.age && marketSeg.status.age === "ok" && marketSeg.age) {
    return { basis: "age", totalCount: whole.age.total, marketCount: marketSeg.age.total };
  }
  if (whole.status.gender === "ok" && whole.gender && marketSeg.status.gender === "ok" && marketSeg.gender) {
    return { basis: "gender", totalCount: whole.gender.total, marketCount: marketSeg.gender.total };
  }
  return null;
}

async function computeAdScorePartsForSegmentAtMarket(
  market: Market,
  segmentId: string,
): Promise<ReturnType<typeof computeAdScoreParts> | null> {
  const baseline = await loadBaselineForMarket(market);
  const segMarket = await loadSegmentForMarket(segmentId, market);
  const segTotal = await loadSegmentForMarket(segmentId, "전체");

  const curPair = pickCompatibleBaselineSegment(baseline, segMarket);
  const marketTotal = curPair?.marketTotal ?? null;
  const segmentCount = curPair?.segmentCount ?? null;
  const ls =
    marketTotal !== null && marketTotal > 0 && segmentCount !== null ? segmentCount / marketTotal : null;

  const wholePair = pickCompatibleWholeVsMarket(segTotal, segMarket);
  let sa: number | null = null;
  if (wholePair && wholePair.totalCount > 0) {
    sa = clamp(wholePair.marketCount / wholePair.totalCount, 0, 1);
  }

  const otherMarkets = MARKETS.filter((m) => m !== market);
  const otherLsList = await Promise.all(
    otherMarkets.map(async (om) => {
      const b = await loadBaselineForMarket(om);
      const d = await loadSegmentForMarket(segmentId, om);
      const p = pickCompatibleBaselineSegment(b, d);
      if (!p || p.marketTotal <= 0) return null;
      return p.segmentCount / p.marketTotal;
    }),
  );
  const otherLsAvg = (() => {
    const xs = otherLsList.filter((x): x is number => x !== null);
    if (!xs.length) return null;
    return xs.reduce((a, x) => a + x, 0) / xs.length;
  })();
  const rl = ls !== null && otherLsAvg !== null ? ls - otherLsAvg : null;
  const scale = segmentCount !== null ? Math.log10(segmentCount + 1) : null;

  if (ls === null || rl === null || sa === null || scale === null) return null;
  return computeAdScoreParts({ ls, rl, sa, scale });
}

function computeAdScoreParts(opts: {
  ls: number; // 0..1
  rl: number; // -1..1
  sa: number; // 0..1
  scale: number; // 0..(대략 6~7)
}) {
  const wLS = 0.35;
  const wRL = 0.3;
  const wSA = 0.2;
  const wScale = 0.15;

  const partLS = wLS * opts.ls;
  const partRL = wRL * opts.rl;
  const partSA = wSA * opts.sa;
  const partScale = wScale * opts.scale;
  const adScore = clamp(partLS + partRL + partSA + partScale, -999, 9999);

  return {
    weights: { ls: wLS, rl: wRL, sa: wSA, scale: wScale },
    parts: { partLS, partRL, partSA, partScale },
    adScore,
  };
}

function tvDistancePp(a: { ratio: number }[], b: { ratio: number }[]): number {
  // Total Variation Distance = 0.5 * sum |p-q|
  const len = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < len; i++) s += Math.abs(a[i]!.ratio - b[i]!.ratio);
  return pp(0.5 * s);
}

function genderLiftPp(
  baseline: { items: { 여성: { ratio: number } } } | undefined,
  seg: { items: { 여성: { ratio: number } } } | undefined,
): number {
  if (!baseline || !seg) return 0;
  return Math.abs(pp(seg.items.여성.ratio - baseline.items.여성.ratio));
}

function ageLiftPp(
  baseline: { items: { ratio: number }[] } | undefined,
  seg: { items: { ratio: number }[] } | undefined,
): number {
  if (!baseline || !seg) return 0;
  return tvDistancePp(baseline.items, seg.items);
}

function summarizeLiftPp(opts: {
  baselineGender?: { items: { 여성: { ratio: number } } };
  segGender?: { items: { 여성: { ratio: number } } };
  baselineAge?: { items: { ratio: number }[] };
  segAge?: { items: { ratio: number }[] };
}): number {
  const g = genderLiftPp(opts.baselineGender, opts.segGender);
  const a = ageLiftPp(opts.baselineAge, opts.segAge);
  // 유동인구가 큰 상권이 무조건 유리해지지 않도록 "변화" 중심으로
  return 0.45 * g + 0.55 * a;
}

// NOTE: 기존 "변화/반응" 점수는 추천(광고용)에서 제거됨.

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return `${n}`;
}

function makeAdReason(opts: {
  segmentName: string;
  ls: number; // 0..1
  rl: number; // -1..1
  sa: number; // 0..1
  segmentCount: number;
}): string {
  const size = formatCount(opts.segmentCount);
  const rlPp = pp(opts.rl);
  const rlPhrase =
    rlPp >= 1 ? "타 상권 대비 이 상권에서의 비중 우위가 뚜렷하고" : rlPp <= -1 ? "타 상권 대비 이 상권 비중은 낮게 잡히지만" : "타 상권 대비 이 상권 비중은 비슷한 편이며";

  return `${opts.segmentName}는 이 상권 방문객 가운데 약 ${pp(opts.ls).toFixed(1)}%가 이 관심사에 해당하고, ${rlPhrase} 같은 관심사를 가진 사람들 중 이 상권에 모인 비중은 약 ${pp(opts.sa).toFixed(1)}%로 잡혀요. 관심 모수는 약 ${size}명입니다.`;
}

/** 주목 세그 TOP5: 시간축 없이 “전체 상권 평균 대비 집중도” */
const MIN_SEGMENT_COUNT_FOR_ATTENTION = 5000;
const MIN_COUNT_FOR_STRONG_SCALE = 15_000;

function shortAgeLabelForInsight(label: string): string {
  const s = label.replaceAll(" ", "");
  const plus = s.match(/^(\d+)세이상$/);
  if (plus) return `${plus[1]}+`;
  const m = s.match(/^(\d+)세~(\d+)세$/);
  if (m) return `${m[1]}-${m[2]}`;
  return label;
}

function computeOtherMarketsLsAvg(opts: {
  segmentId: string;
  excludeMarket: Market;
  baselineByMarket: Record<Market, BaselineRow>;
  bySegMarket: Map<string, SegmentRow>;
}): number | null {
  const vals: number[] = [];
  for (const m of MARKETS) {
    if (m === opts.excludeMarket) continue;
    const b = opts.baselineByMarket[m];
    const d = opts.bySegMarket.get(`${opts.segmentId}::${m}`);
    if (!d) continue;
    const p = pickCompatibleBaselineSegment(b, d);
    if (p && p.marketTotal > 0) vals.push(p.segmentCount / p.marketTotal);
  }
  if (!vals.length) return null;
  return vals.reduce((a, x) => a + x, 0) / vals.length;
}

function collectGsFromCompatibleLs(opts: {
  segmentId: string;
  baselineByMarket: Record<Market, BaselineRow>;
  bySegMarket: Map<string, SegmentRow>;
}): { gs: number | null } {
  const values: number[] = [];
  for (const m of MARKETS) {
    const b = opts.baselineByMarket[m];
    const d = opts.bySegMarket.get(`${opts.segmentId}::${m}`);
    if (!d) continue;
    const pair = pickCompatibleBaselineSegment(b, d);
    if (pair && pair.marketTotal > 0) {
      values.push(pair.segmentCount / pair.marketTotal);
    }
  }
  const gs = values.length ? values.reduce((a, x) => a + x, 0) / values.length : null;
  return { gs };
}

/** 1=최우수. 동점이면 동일 순위 부여 후 다음 순위 건너뜀 */
function denseRankDescending(values: { id: string; v: number }[], id: string): number | null {
  const row = values.find((x) => x.id === id);
  if (!row) return null;
  const sorted = [...new Set(values.map((x) => x.v))].sort((a, b) => b - a);
  const idx = sorted.indexOf(row.v);
  return idx < 0 ? null : idx + 1;
}

/**
 * 선택 상권에서, 호환 모수가 있는 모든 세그의 관심 모수(원 카운트)를 비교한 순위.
 * (3개 상권 간 절대 모수 비교는 상권 규모 편향이 커서, TOP5 배지에는 사용하지 않음)
 */
function computeInMarketSegmentCountRank(opts: {
  segmentId: string;
  market: Market;
  segments: { segmentId: string }[];
  baselineByMarket: Record<Market, BaselineRow>;
  bySegMarket: Map<string, SegmentRow>;
}): number | null {
  const b = opts.baselineByMarket[opts.market];
  const vals: { id: string; v: number }[] = [];
  for (const s of opts.segments) {
    const d = opts.bySegMarket.get(`${s.segmentId}::${opts.market}`);
    if (!d) continue;
    const p = pickCompatibleBaselineSegment(b, d);
    if (p) vals.push({ id: s.segmentId, v: p.segmentCount });
  }
  if (vals.length < 2) return null;
  return denseRankDescending(vals, opts.segmentId);
}

/** 상권 내 LS(세그/상권) 순위 — 방문 종합 문구용 */
function computeInMarketLsRank(opts: {
  segmentId: string;
  market: Market;
  segments: { segmentId: string }[];
  baselineByMarket: Record<Market, BaselineRow>;
  bySegMarket: Map<string, SegmentRow>;
}): number | null {
  const b = opts.baselineByMarket[opts.market];
  const vals: { id: string; v: number }[] = [];
  for (const s of opts.segments) {
    const d = opts.bySegMarket.get(`${s.segmentId}::${opts.market}`);
    if (!d) continue;
    const p = pickCompatibleBaselineSegment(b, d);
    if (p && p.marketTotal > 0) vals.push({ id: s.segmentId, v: p.segmentCount / p.marketTotal });
  }
  if (vals.length < 2) return null;
  return denseRankDescending(vals, opts.segmentId);
}

function computeCrossMarketLsRank(opts: {
  segmentId: string;
  market: Market;
  baselineByMarket: Record<Market, BaselineRow>;
  bySegMarket: Map<string, SegmentRow>;
}): number | null {
  const vals: { id: string; v: number }[] = [];
  for (const m of MARKETS) {
    const b = opts.baselineByMarket[m];
    const d = opts.bySegMarket.get(`${opts.segmentId}::${m}`);
    if (!d) continue;
    const p = pickCompatibleBaselineSegment(b, d);
    if (p && p.marketTotal > 0) vals.push({ id: m, v: p.segmentCount / p.marketTotal });
  }
  if (vals.length < 2) return null;
  return denseRankDescending(vals, opts.market);
}

function appendAuxLsCount(ls: number, segmentCount: number, skipLsPct: boolean): TopSegmentListSignal[] {
  const aux: TopSegmentListSignal[] = [];
  const lsPct = pp(ls);
  if (!skipLsPct && lsPct >= 0.5) {
    aux.push({
      badge: `LS ${lsPct.toFixed(1)}%`,
      line: `상권 내 점유율 약 ${lsPct.toFixed(1)}%`,
      tier: "soft",
    });
  }
  if (segmentCount >= 1_000) {
    aux.push({
      badge: `모수 ${formatCount(segmentCount)}`,
      line: `관심 모수 약 ${segmentCount.toLocaleString()}명`,
      tier: "soft",
    });
  }
  return aux;
}

/** 주목(Attention): 집중도·차별성만 — 한 문장·배지 1~2개 */
function pickAttentionListSignals(opts: {
  marketLabel: string;
  segmentName: string;
  lsCrossRank: number | null;
  liftRatio: number;
  rl: number | null;
  ls: number;
  segmentCount: number;
}): { listSignals: TopSegmentListSignal[]; aux: TopSegmentListSignal[]; reason: string } {
  const rlPp = opts.rl !== null ? opts.rl * 100 : 0;
  const badges: TopSegmentListSignal[] = [];
  let reason = "";

  if (opts.lsCrossRank === 1) {
    badges.push({ badge: "이 상권에서 특히 반응이 높은 관심사", line: "", tier: "strong" });
    reason = `타 상권 대비 ${opts.marketLabel}에서 ${opts.segmentName} 관심사가 점유하는 비율이 가장 높습니다.`;
  } else if (opts.liftRatio >= 1.5) {
    badges.push({ badge: `${opts.liftRatio.toFixed(1)}배`, line: "", tier: "strong" });
    reason = `3개 상권 평균 대비 약 ${opts.liftRatio.toFixed(1)}배 높은 집중도로 유독 두드러져요.`;
  } else if (opts.lsCrossRank === 2 && opts.liftRatio > 1.2) {
    badges.push({ badge: "타상권 2위", line: "", tier: "strong" });
    reason = "3개 상권 중 LS가 2위이면서, 평균 대비 집중도도 꽤 높은 편이에요.";
  } else if (opts.liftRatio > 1.2) {
    badges.push({ badge: `${opts.liftRatio.toFixed(1)}배`, line: "", tier: "soft" });
    reason = `평균 대비 약 ${opts.liftRatio.toFixed(1)}배로, 다른 관심사보다 상대적으로 잘 보여요.`;
  } else if (rlPp >= 3 && opts.lsCrossRank !== null && opts.lsCrossRank <= 2) {
    badges.push({ badge: "타상권 우위", line: "", tier: "strong" });
    reason = "다른 상권보다 이 상권에서 비중 차이가 눈에 띄게 큽니다.";
  }

  if (!reason) {
    reason = "해당 상권에서 평균 대비 유독 많이 나타나는 주목할만한 관심사입니다.";
    if (opts.liftRatio > 1.05) {
      badges.push({ badge: "집중", line: "", tier: "soft" });
    }
  }

  const listSignals = badges.slice(0, 2);
  const skipLs = listSignals.some((b) => b.badge.includes("%"));
  const aux = appendAuxLsCount(opts.ls, opts.segmentCount, skipLs);
  return { listSignals, aux, reason };
}

/** 방문 종합(Ad 정렬용 표시): 점유·규모 중심 — 상권 내부 기준만 */
function pickVisitSummaryListSignals(opts: {
  visitRank: number | null;
  lsInMarketRank: number | null;
  ls: number;
  segmentCount: number;
}): { listSignals: TopSegmentListSignal[]; aux: TopSegmentListSignal[]; reason: string } {
  const lsPct = pp(opts.ls);
  const listSignals: TopSegmentListSignal[] = [];
  let reason = "";

  if (opts.visitRank !== null && opts.visitRank <= 2) {
    listSignals.push({ badge: `상권 ${opts.visitRank}위`, line: "", tier: "strong" });
    reason = `관심 모수 기준 이 상권 안에서 상위 ${opts.visitRank}위 규모의 핵심 세그예요.`;
  } else if (opts.lsInMarketRank !== null && opts.lsInMarketRank <= 2) {
    listSignals.push({ badge: `점유 ${opts.lsInMarketRank}위`, line: "", tier: "strong" });
    reason = `상권 내 점유율(LS) 순위가 위쪽이라, 방문 구조에서 비중이 큰 관심사예요.`;
  } else if (opts.segmentCount >= MIN_COUNT_FOR_STRONG_SCALE) {
    listSignals.push({ badge: `${formatCount(opts.segmentCount)}`, line: "", tier: "strong" });
    reason = `약 ${formatCount(opts.segmentCount)} 규모로, 상권 안에서 체감 규모가 큰 타겟이에요.`;
  } else if (lsPct >= 3) {
    listSignals.push({ badge: `점유 ${lsPct.toFixed(1)}%`, line: "", tier: "strong" });
    reason = `상권 내 점유율이 ${lsPct.toFixed(1)}%로 두드러져요.`;
  }

  if (!reason) {
    reason = "방문 규모와 점유율을 종합적으로 고려한 주요 관심사입니다.";
  }

  const skipLs = listSignals.some((b) => b.badge.includes("%"));
  const aux = appendAuxLsCount(opts.ls, opts.segmentCount, skipLs);
  return { listSignals, aux, reason };
}

function buildMarketInsightNarrative(opts: {
  market: Market;
  baselineByMarket: Record<Market, BaselineRow>;
  bySegMarket: Map<string, SegmentRow>;
  selectedSegmentId: string | null;
  segments: { segmentId: string; segmentName: string }[];
}): MarketInsightNarrative {
  const cur = opts.baselineByMarket[opts.market];
  const avgFemRatios = MARKETS.map((m) => opts.baselineByMarket[m])
    .filter((b) => b.status.gender === "ok" && b.gender)
    .map((b) => b.gender!.items.여성.ratio);
  const avgFem = avgFemRatios.length ? avgFemRatios.reduce((a, x) => a + x, 0) / avgFemRatios.length : null;
  const mFem = cur.status.gender === "ok" && cur.gender ? cur.gender.items.여성.ratio : null;

  let genderParagraph = "";
  if (avgFem === null || mFem === null) {
    genderParagraph =
      "3개 상권 또는 선택 상권의 성별(상권 정보) 데이터가 일부 없어 성비 비교 문장을 만들기 어렵습니다.";
  } else {
    const segRow = opts.selectedSegmentId
      ? opts.bySegMarket.get(`${opts.selectedSegmentId}::${opts.market}`)
      : null;
    const segName = opts.segments.find((s) => s.segmentId === opts.selectedSegmentId)?.segmentName ?? "선택 세그먼트";
    const sFem =
      opts.selectedSegmentId && segRow?.status.gender === "ok" && segRow.gender
        ? segRow.gender.items.여성.ratio
        : null;

    const avgFemP = pp(avgFem);
    const mFemP = pp(mFem);
    const avgMalP = pp(1 - avgFem);
    const mMalP = pp(1 - mFem);

    if (sFem !== null) {
      const sFemP = pp(sFem);
      const sMalP = pp(1 - sFem);
      const vsM = sFemP - mFemP;

      if (Math.abs(vsM) < 1.5) {
        if (vsM >= 0) {
          genderParagraph = `3개 상권 평균 기준 여성 비중은 약 ${avgFemP.toFixed(1)}%이고, ${opts.market} 상권 정보 기준은 약 ${mFemP.toFixed(1)}%예요. 선택한 ${segName}은 상권 기본과 비슷한 수준이에요(여성 약 ${sFemP.toFixed(1)}%).`;
        } else {
          genderParagraph = `3개 상권 평균 기준 남성 비중은 약 ${avgMalP.toFixed(1)}%이고, ${opts.market} 상권 정보 기준은 약 ${mMalP.toFixed(1)}%예요. 선택한 ${segName}은 상권 기본과 비슷한 수준이에요(남성 약 ${sMalP.toFixed(1)}%).`;
        }
      } else if (vsM > 0) {
        genderParagraph = `3개 상권 평균 기준 여성 비중은 약 ${avgFemP.toFixed(1)}%이고, ${opts.market} 상권 정보 기준은 약 ${mFemP.toFixed(1)}%예요. 선택한 ${segName}에서는 상권 기본 대비 여성 비중이 다소 확대된 편이에요(여성 약 ${sFemP.toFixed(1)}%).`;
      } else {
        genderParagraph = `3개 상권 평균 기준 남성 비중은 약 ${avgMalP.toFixed(1)}%이고, ${opts.market} 상권 정보 기준은 약 ${mMalP.toFixed(1)}%예요. 선택한 ${segName}에서는 상권 기본 대비 남성 비중이 상대적으로 높아진 편이에요(남성 약 ${sMalP.toFixed(1)}%).`;
      }
    } else {
      genderParagraph = `3개 상권 평균 기준 여성 비중은 약 ${avgFemP.toFixed(1)}%이고, ${opts.market} 상권 정보 기준은 약 ${mFemP.toFixed(1)}%예요. 세그먼트를 선택하면 같은 기준으로 남성·여성 중 어디가 두드러지는지 이어서 풀어 드릴게요.`;
    }
  }

  const avgAgeTop = (() => {
    const bases = MARKETS.map((m) => opts.baselineByMarket[m]).filter((b) => b.status.age === "ok" && b.age);
    if (!bases.length) return null;
    const head = bases[0];
    if (!head?.age?.items.length) return null;
    const keys = head.age.items.map((x) => x.key);
    let bestKey = keys[0];
    if (bestKey === undefined) return null;
    let bestAvg = -1;
    for (const k of keys) {
      const rs = bases
        .map((b) => b.age!.items.find((x) => x.key === k)?.ratio)
        .filter((x): x is number => x !== undefined);
      if (!rs.length) continue;
      const a = rs.reduce((x, y) => x + y, 0) / rs.length;
      if (a > bestAvg) {
        bestAvg = a;
        bestKey = k;
      }
    }
    return { key: bestKey, label: shortAgeLabelForInsight(bestKey), ratio: bestAvg };
  })();

  const mAgeTop =
    cur.status.age === "ok" && cur.age
      ? (() => {
          const t = topAgeItems(cur.age, 1)[0];
          return t ? { key: t.key, label: shortAgeLabelForInsight(t.key), ratio: t.ratio } : null;
        })()
      : null;

  const sAgeTop =
    opts.selectedSegmentId
      ? (() => {
          const row = opts.bySegMarket.get(`${opts.selectedSegmentId}::${opts.market}`);
          if (!row?.age || row.status.age !== "ok") return null;
          const t = topAgeItems(row.age, 1)[0];
          return t ? { key: t.key, label: shortAgeLabelForInsight(t.key), ratio: t.ratio } : null;
        })()
      : null;

  let ageParagraph = "";
  if (!avgAgeTop || !mAgeTop) {
    ageParagraph =
      "연령(상권 정보) 데이터가 일부 없어 연령대 비교 문장을 만들기 어렵습니다.";
  } else {
    ageParagraph = `3개 상권 평균 기준으로는 ${avgAgeTop.label} 구간 비중이 상대적으로 두드러지고, ${opts.market} 상권 정보에서는 ${mAgeTop.label} 구간이 상대적으로 두드러져요.`;
    if (sAgeTop) {
      if (sAgeTop.key === mAgeTop.key) {
        ageParagraph += ` 선택 세그도 같은 구간(${sAgeTop.label})에서 비중이 높게 나타났어요.`;
      } else {
        ageParagraph += ` 선택 세그에서는 ${sAgeTop.label} 구간 비중이 더 두드러지는 편이에요.`;
      }
    } else {
      ageParagraph += " 세그를 선택하면 관심사 기준 주요 연령대를 상권 기본과 비교해 설명할게요.";
    }
  }

  return { genderParagraph, ageParagraph };
}

function makeAttentionInsights(opts: {
  segmentName: string;
  marketLabel: string;
  gs: number;
  ls: number;
  liftRatio: number;
}): { interpretation: string; adUse: string } {
  const interpretation = `${opts.segmentName}는 3개 상권 기준 평균 비중이 약 ${(opts.gs * 100).toFixed(2)}%인데, ${opts.marketLabel}에서는 약 ${(opts.ls * 100).toFixed(2)}%로 나타나 전체 평균 대비 약 ${opts.liftRatio.toFixed(1)}배 집중되어 있습니다.`;
  const adUse = `같은 관심사라도 상권마다 두드러짐이 다릅니다. 주목(집중도)과 방문 종합(점유·규모) 카드를 함께 보면 이 상권의 관심사 구조를 빠르게 파악할 수 있어요.`;
  return { interpretation: interpretation, adUse: adUse };
}

function topAgeItems(dist: { items: { key: string; ratio: number }[] } | undefined, n = 4) {
  if (!dist) return [];
  return dist.items
    .slice()
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, n)
    .map((x) => ({ key: x.key, ratio: x.ratio }));
}

function genderDeltaPp(
  baseline: { items: { 남성: { ratio: number }; 여성: { ratio: number } } } | undefined,
  seg: { items: { 남성: { ratio: number }; 여성: { ratio: number } } } | undefined,
) {
  if (!baseline || !seg) return null;
  return {
    남성: pp(seg.items.남성.ratio - baseline.items.남성.ratio),
    여성: pp(seg.items.여성.ratio - baseline.items.여성.ratio),
  };
}

export type DashboardModel = Awaited<ReturnType<typeof getDashboardModel>>;
export type SegmentDetailModel = Awaited<ReturnType<typeof getSegmentDetailModel>>;

export async function getDashboardModel(market: Market, selectedSegmentId: string | null = null) {
  // URL(searchParams) 변경 시에도 결과가 고정되지 않도록 캐시 비활성화
  noStore();
  const segments = await listSegments();

  const baselines = await Promise.all(MARKETS.map((m) => loadBaselineForMarket(m)));
  const baselineByMarket = Object.fromEntries(baselines.map((b) => [b.market, b])) as Record<
    Market,
    (typeof baselines)[number]
  >;

  // 세그먼트 × 상권 데이터 로딩 (누락 파일은 내부에서 missingFiles로 수집)
  const segmentMarketData = await Promise.all(
    segments.flatMap((s) => MARKETS.map((m) => loadSegmentForMarket(s.segmentId, m))),
  );

  // 빠른 조회용 인덱스
  const bySegMarket = new Map<string, (typeof segmentMarketData)[number]>();
  for (const d of segmentMarketData) bySegMarket.set(`${d.segmentId}::${d.market}`, d);

  const segmentTotals = await Promise.all(segments.map((s) => loadSegmentForMarket(s.segmentId, "전체")));
  const totalBySegmentId = new Map(segmentTotals.map((x) => [x.segmentId, x] as const));

  const scores = segments.map((s) => {
    const thisData = bySegMarket.get(`${s.segmentId}::${market}`);
    const thisBaseline = baselineByMarket[market];
    const thisTotal = totalBySegmentId.get(s.segmentId);

    const curPair =
      thisData && thisBaseline ? pickCompatibleBaselineSegment(thisBaseline, thisData) : null;
    const marketTotal = curPair?.marketTotal ?? null;
    const segmentCount = curPair?.segmentCount ?? null;
    const countBasis = curPair?.basis ?? null;

    const wholePair =
      thisData && thisTotal ? pickCompatibleWholeVsMarket(thisTotal, thisData) : null;
    let sa: number | null = null;
    let segmentTotal: number | null = null;
    if (wholePair && wholePair.totalCount > 0) {
      segmentTotal = wholePair.totalCount;
      sa = clamp(wholePair.marketCount / wholePair.totalCount, 0, 1);
    }

    const { gs } = collectGsFromCompatibleLs({
      segmentId: s.segmentId,
      baselineByMarket,
      bySegMarket,
    });

    const ls =
      marketTotal !== null && marketTotal > 0 && segmentCount !== null ? segmentCount / marketTotal : null;

    if (
      segmentCount === null ||
      segmentCount < MIN_SEGMENT_COUNT_FOR_ATTENTION ||
      ls === null ||
      gs === null ||
      gs <= 0
    ) {
      return {
        segmentId: s.segmentId,
        segmentName: s.segmentName,
        segmentCount,
        marketTotal,
        segmentTotal,
        countBasis,
        sa,
        ls,
        rl: null,
        adScore: null,
        gs,
        liftRatio: null,
        attentionScore: null,
        listSignals: [] as TopSegmentListSignal[],
        auxListSignals: [] as TopSegmentListSignal[],
        visitListSignals: [] as TopSegmentListSignal[],
        visitAuxListSignals: [] as TopSegmentListSignal[],
        visitReason: "",
        reason:
          segmentCount !== null && segmentCount < MIN_SEGMENT_COUNT_FOR_ATTENTION
            ? `${s.segmentName}: 모수 ${MIN_SEGMENT_COUNT_FOR_ATTENTION.toLocaleString()}명 미만으로 주목 후보에서 제외`
            : `${s.segmentName}: 데이터 없음(주목 점수 계산 제외)`,
        insightAveragePct: gs !== null ? pp(gs) : null,
        insightMarketPct: ls !== null ? pp(ls) : null,
        insightInterpretation: "데이터가 부족하거나 최소 모수 기준을 충족하지 못해 인사이트를 생성하지 않았습니다.",
        insightAdUse: "모수·파일 상태를 확인한 뒤 다시 검토해 주세요.",
      };
    }

    const liftRatio = ls / gs;
    const attentionScore = liftRatio * Math.log10(segmentCount);
    const otherLsAvg = computeOtherMarketsLsAvg({
      segmentId: s.segmentId,
      excludeMarket: market,
      baselineByMarket,
      bySegMarket,
    });
    const rl = otherLsAvg !== null ? ls - otherLsAvg : null;
    const scale = Math.log10(segmentCount + 1);
    const adParts =
      rl !== null && sa !== null ? computeAdScoreParts({ ls, rl, sa, scale }) : null;
    const adScore = adParts?.adScore ?? null;
    const { interpretation, adUse } = makeAttentionInsights({
      segmentName: s.segmentName,
      marketLabel: market,
      gs,
      ls,
      liftRatio,
    });

    return {
      segmentId: s.segmentId,
      segmentName: s.segmentName,
      segmentCount,
      marketTotal,
      segmentTotal,
      countBasis,
      sa,
      ls,
      rl,
      adScore,
      gs,
      liftRatio,
      attentionScore,
      listSignals: [] as TopSegmentListSignal[],
      auxListSignals: [] as TopSegmentListSignal[],
      visitListSignals: [] as TopSegmentListSignal[],
      visitAuxListSignals: [] as TopSegmentListSignal[],
      visitReason: "",
      reason: "",
      insightAveragePct: pp(gs),
      insightMarketPct: pp(ls),
      insightInterpretation: interpretation,
      insightAdUse: adUse,
    };
  });

  const eligible = scores.filter((x) => x.attentionScore !== null && x.ls !== null && x.segmentCount !== null);
  const lsRankInput = eligible.map((x) => ({ id: x.segmentId, v: x.ls! }));

  const scoresWithSignals = scores.map((row) => {
    if (row.attentionScore === null || row.ls === null || row.segmentCount === null || row.liftRatio === null) {
      return row;
    }
    const visitRank = computeInMarketSegmentCountRank({
      segmentId: row.segmentId,
      market,
      segments,
      baselineByMarket,
      bySegMarket,
    });
    const lsCrossRank = computeCrossMarketLsRank({
      segmentId: row.segmentId,
      market,
      baselineByMarket,
      bySegMarket,
    });
    const lsInMarketRank = denseRankDescending(lsRankInput, row.segmentId);
    const att = pickAttentionListSignals({
      marketLabel: market,
      segmentName: row.segmentName,
      lsCrossRank,
      liftRatio: row.liftRatio,
      rl: row.rl,
      ls: row.ls,
      segmentCount: row.segmentCount,
    });
    const vis =
      row.adScore !== null
        ? pickVisitSummaryListSignals({
            visitRank,
            lsInMarketRank,
            ls: row.ls,
            segmentCount: row.segmentCount,
          })
        : {
            listSignals: [] as TopSegmentListSignal[],
            aux: [] as TopSegmentListSignal[],
            reason: "방문 종합 점수를 만들 지표가 일부 없어 이 카드에서는 제외됐어요.",
          };
    return {
      ...row,
      listSignals: att.listSignals,
      auxListSignals: att.aux,
      reason: att.reason,
      visitListSignals: vis.listSignals,
      visitAuxListSignals: vis.aux,
      visitReason: vis.reason,
    };
  });

  const byAttention = (a: (typeof scoresWithSignals)[number], b: (typeof scoresWithSignals)[number]) => {
    const da = (b.attentionScore ?? 0) - (a.attentionScore ?? 0);
    if (da !== 0) return da;
    return a.segmentId.localeCompare(b.segmentId);
  };
  const byVisitAd = (a: (typeof scoresWithSignals)[number], b: (typeof scoresWithSignals)[number]) => {
    const da = (b.adScore ?? 0) - (a.adScore ?? 0);
    if (da !== 0) return da;
    return a.segmentId.localeCompare(b.segmentId);
  };

  const top5Attention = scoresWithSignals.filter((x) => x.attentionScore !== null).sort(byAttention).slice(0, 5);

  const top5VisitSummary = scoresWithSignals
    .filter((x) => x.adScore !== null)
    .sort(byVisitAd)
    .slice(0, 5);

  const baselineTotalsByMarket = Object.fromEntries(
    MARKETS.map((m) => {
      const b = baselineByMarket[m];
      // 기준은 하나로 통일: 연령 합(가능하면) → 성별 합(대체)
      const total = pickTotalPreferAge(b) ?? 0;
      return [m, total] as const;
    }),
  ) as Record<Market, number>;
  const sumTotals = Object.values(baselineTotalsByMarket).reduce((a, x) => a + x, 0);
  const selectedTotal = baselineTotalsByMarket[market] ?? 0;
  const selectedSharePct = sumTotals > 0 ? (selectedTotal / sumTotals) * 100 : null;

  const marketInsightNarrative = buildMarketInsightNarrative({
    market,
    baselineByMarket,
    bySegMarket,
    selectedSegmentId,
    segments,
  });

  return {
    market,
    segments,
    baseline: baselineByMarket[market],
    baselineTotalsByMarket,
    selectedMarketTotal: selectedTotal,
    selectedMarketSharePct: selectedSharePct,
    top5Attention,
    top5VisitSummary,
    allScores: scoresWithSignals,
    marketInsightNarrative,
  };
}

export async function getSegmentDetailModel(market: Market, segmentId: string) {
  noStore();
  const baseline = await loadBaselineForMarket(market);
  const segMarket = await loadSegmentForMarket(segmentId, market);
  const segTotal = await loadSegmentForMarket(segmentId, "전체");

  // --------------------------
  // Ad Score (동일 상권 내 세그 비교용)
  // --------------------------
  const curPair = pickCompatibleBaselineSegment(baseline, segMarket);
  const marketTotal = curPair?.marketTotal ?? null;
  const segmentCount = curPair?.segmentCount ?? null;

  const ls =
    marketTotal !== null && marketTotal > 0 && segmentCount !== null ? segmentCount / marketTotal : null;

  const wholePair = pickCompatibleWholeVsMarket(segTotal, segMarket);
  let segmentTotal: number | null = null;
  let sa: number | null = null;
  if (wholePair && wholePair.totalCount > 0) {
    segmentTotal = wholePair.totalCount;
    sa = clamp(wholePair.marketCount / wholePair.totalCount, 0, 1);
  }

  const otherMarkets = MARKETS.filter((m) => m !== market);
  const otherLsList = await Promise.all(
    otherMarkets.map(async (om) => {
      const b = await loadBaselineForMarket(om);
      const d = await loadSegmentForMarket(segmentId, om);
      const p = pickCompatibleBaselineSegment(b, d);
      if (!p || p.marketTotal <= 0) return null;
      return p.segmentCount / p.marketTotal;
    }),
  );
  const otherLsAvg = (() => {
    const xs = otherLsList.filter((x): x is number => x !== null);
    if (!xs.length) return null;
    return xs.reduce((a, x) => a + x, 0) / xs.length;
  })();
  const rl = ls !== null && otherLsAvg !== null ? ls - otherLsAvg : null;
  const scale = segmentCount !== null ? Math.log10(segmentCount + 1) : null;

  const explain =
    ls !== null && rl !== null && sa !== null && scale !== null
      ? computeAdScoreParts({ ls, rl, sa, scale })
      : null;
  const adScore = explain ? explain.adScore : null;

  const segmentsForRank = await listSegments();
  const peerScores = await Promise.all(
    segmentsForRank.map(async (s) => ({
      id: s.segmentId,
      score: (await computeAdScorePartsForSegmentAtMarket(market, s.segmentId))?.adScore ?? null,
    })),
  );
  const validPeers = peerScores.filter((x): x is { id: string; score: number } => x.score !== null);
  const adScorePeerCount = validPeers.length;
  let adScoreTopPercentLabel: string | null = null;
  if (adScore !== null && validPeers.length >= 2) {
    const better = validPeers.filter((x) => x.score > adScore).length;
    const rank = better + 1;
    const topPct = (rank / validPeers.length) * 100;
    if (topPct < 50) {
      adScoreTopPercentLabel = `상위 ${Math.max(1, Math.round(topPct))}%`;
    }
  }

  const headline =
    ls !== null && rl !== null && sa !== null && segmentCount !== null
      ? makeAdReason({ segmentName: segMarket.segmentName, ls, rl, sa, segmentCount })
      : `${segMarket.segmentName}: 데이터 없음(방문 종합 지표 계산 제외)`;

  const ageDeltaTop = (() => {
    if (!baseline.age || !segMarket.age) return [];
    const keys = baseline.age.items.map((x) => x.key);
    const deltas = keys.map((k) => {
      const b = baseline.age!.items.find((x) => x.key === k)?.ratio ?? 0;
      const s = segMarket.age!.items.find((x) => x.key === k)?.ratio ?? 0;
      const deltaPp = pp(s - b);
      return { key: k, deltaPp };
    });
    return deltas
      .slice()
      .sort((a, b) => Math.abs(b.deltaPp) - Math.abs(a.deltaPp))
      .slice(0, 3);
  })();

  const warnings: string[] = [];
  if (segMarket.status.gender !== "ok" && segMarket.status.age !== "ok") {
    warnings.push("해당 상권·세그먼트 조합의 일부 데이터를 불러오지 못했습니다.");
  }
  if (segMarket.status.gender === "error") warnings.push("성별 분포 데이터 형식을 확인할 수 없습니다.");
  if (segMarket.status.age === "error") warnings.push("연령 분포 데이터 형식을 확인할 수 없습니다.");

  return {
    market,
    segmentId,
    segmentName: segMarket.segmentName,
    baseline,
    segMarket,
    segTotal,
    marketTotal,
    segmentTotal,
    segmentCount,
    ls,
    rl,
    sa,
    scale,
    adScore,
    adScorePeerCount,
    adScoreTopPercentLabel,
    explain,
    headline,
    breakdown: {
      genderDeltaPp: genderDeltaPp(baseline.gender, segMarket.gender),
      baselineTopAges: topAgeItems(baseline.age),
      segmentTopAges: topAgeItems(segMarket.age),
      ageDeltaTop,
    },
    warnings,
  };
}

export async function getSegmentMarketRanking(segmentId: string) {
  noStore();
  const segTotal = await loadSegmentForMarket(segmentId, "전체");
  const baselines = await Promise.all(MARKETS.map((m) => loadBaselineForMarket(m)));
  const baselineByMarket = Object.fromEntries(MARKETS.map((m, i) => [m, baselines[i]!])) as Record<
    Market,
    BaselineRow
  >;
  const segmentRows = await Promise.all(MARKETS.map((m) => loadSegmentForMarket(segmentId, m)));
  const bySegMarket = new Map<string, SegmentRow>();
  for (let i = 0; i < MARKETS.length; i++) {
    const m = MARKETS[i]!;
    bySegMarket.set(`${segmentId}::${m}`, segmentRows[i]!);
  }

  const { gs } = collectGsFromCompatibleLs({ segmentId, baselineByMarket, bySegMarket });
  const segmentsList = await listSegments();

  const byMarket = MARKETS.map((m, idx) => {
    const baseline = baselineByMarket[m];
    const segMarket = segmentRows[idx]!;
    const pair = pickCompatibleBaselineSegment(baseline, segMarket);
    const marketTotal = pair?.marketTotal ?? null;
    const segmentCount = pair?.segmentCount ?? null;

    const ls =
      marketTotal !== null && marketTotal > 0 && segmentCount !== null ? segmentCount / marketTotal : null;

    const otherLsAvg = computeOtherMarketsLsAvg({ segmentId, excludeMarket: m, baselineByMarket, bySegMarket });
    const rl = ls !== null && otherLsAvg !== null ? ls - otherLsAvg : null;

    const wholePair = pickCompatibleWholeVsMarket(segTotal, segMarket);
    let segmentTotal: number | null = null;
    let sa: number | null = null;
    if (wholePair && wholePair.totalCount > 0) {
      segmentTotal = wholePair.totalCount;
      sa = clamp(wholePair.marketCount / wholePair.totalCount, 0, 1);
    }
    const scale = segmentCount !== null ? Math.log10(segmentCount + 1) : null;

    const explain =
      ls !== null && rl !== null && sa !== null && scale !== null
        ? computeAdScoreParts({ ls, rl, sa, scale })
        : null;
    const adScore = explain ? explain.adScore : null;

    let liftRatio: number | null = null;
    let attentionScore: number | null = null;
    if (
      segmentCount !== null &&
      segmentCount >= MIN_SEGMENT_COUNT_FOR_ATTENTION &&
      ls !== null &&
      gs !== null &&
      gs > 0
    ) {
      liftRatio = ls / gs;
      attentionScore = liftRatio * Math.log10(segmentCount);
    }

    const lsCrossRank = computeCrossMarketLsRank({
      segmentId,
      market: m,
      baselineByMarket,
      bySegMarket,
    });
    const visitRank = computeInMarketSegmentCountRank({
      segmentId,
      market: m,
      segments: segmentsList,
      baselineByMarket,
      bySegMarket,
    });
    const lsInMarketRank = computeInMarketLsRank({
      segmentId,
      market: m,
      segments: segmentsList,
      baselineByMarket,
      bySegMarket,
    });

    const att =
      attentionScore !== null && liftRatio !== null && ls !== null && segmentCount !== null
        ? pickAttentionListSignals({
            marketLabel: m,
            segmentName: segTotal.segmentName,
            lsCrossRank,
            liftRatio,
            rl,
            ls,
            segmentCount,
          })
        : { listSignals: [] as TopSegmentListSignal[], aux: [] as TopSegmentListSignal[], reason: "" };

    const vis =
      adScore !== null && ls !== null && segmentCount !== null
        ? pickVisitSummaryListSignals({ visitRank, lsInMarketRank, ls, segmentCount })
        : { listSignals: [] as TopSegmentListSignal[], aux: [] as TopSegmentListSignal[], reason: "" };

    const visitSelectionReason =
      ls !== null && rl !== null && sa !== null && segmentCount !== null
        ? makeAdReason({ segmentName: segTotal.segmentName, ls, rl, sa, segmentCount })
        : "이 상권 조합은 방문 종합 비교를 위한 지표가 일부 없어요.";

    return {
      market: m,
      marketTotal,
      segmentTotal,
      segmentCount,
      ls,
      rl,
      sa,
      scale,
      adScore,
      liftRatio,
      attentionScore,
      attentionReason: att.reason || "해당 상권에서 평균 대비 유독 많이 나타나는 주목할만한 관심사입니다.",
      attentionListSignals: att.listSignals,
      attentionAuxListSignals: att.aux,
      visitReason: vis.reason,
      visitListSignals: vis.listSignals,
      visitAuxListSignals: vis.aux,
      visitSelectionReason,
      dataStatus: {
        baseline: baseline.status,
        segment: segMarket.status,
        missingFiles: segMarket.missingFiles,
      },
    };
  });

  const byAttention = (a: (typeof byMarket)[number], b: (typeof byMarket)[number]) => {
    const da = (b.attentionScore ?? -Infinity) - (a.attentionScore ?? -Infinity);
    if (da !== 0) return da;
    return a.market.localeCompare(b.market);
  };
  const byVisitAd = (a: (typeof byMarket)[number], b: (typeof byMarket)[number]) => {
    const da = (b.adScore ?? -Infinity) - (a.adScore ?? -Infinity);
    if (da !== 0) return da;
    return a.market.localeCompare(b.market);
  };

  const attentionTop3 = byMarket
    .filter((x) => x.attentionScore !== null)
    .slice()
    .sort(byAttention)
    .slice(0, 3);

  const visitTop3 = byMarket
    .filter((x) => x.adScore !== null)
    .slice()
    .sort(byVisitAd)
    .slice(0, 3);

  return {
    segmentId,
    segmentName: segTotal.segmentName,
    byMarket,
    attentionTop3,
    visitTop3,
  };
}

