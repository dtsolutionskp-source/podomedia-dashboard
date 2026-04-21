export const MARKETS = ["코엑스", "명동", "노량진"] as const;
export type Market = (typeof MARKETS)[number];

export const DIMENSIONS = ["성별", "연령"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export type SegmentId = string;

export type GenderKey = "남성" | "여성";

export type RatioCount = {
  key: string;
  count: number;
  ratio: number; // 0..1
};

export type GenderDistribution = {
  total: number;
  items: Record<GenderKey, RatioCount>;
};

export type AgeDistribution = {
  total: number;
  // keep order for charts
  items: RatioCount[];
};

export type SegmentMarketData = {
  segmentId: SegmentId;
  segmentName: string;
  market: Market | "전체";
  gender?: GenderDistribution;
  age?: AgeDistribution;
  sourceFiles: { gender?: string; age?: string };
  status: { gender: "ok" | "missing" | "error"; age: "ok" | "missing" | "error" };
  parseNotes: string[];
  missingFiles: string[];
};

export type BaselineMarketData = {
  market: Market;
  gender?: GenderDistribution;
  age?: AgeDistribution;
  sourceFiles: { gender?: string; age?: string };
  status: { gender: "ok" | "missing" | "error"; age: "ok" | "missing" | "error" };
  parseNotes: string[];
  missingFiles: string[];
};

export type TopSegmentListSignal = {
  badge: string;
  line: string;
  /** strong: 주된 강조, soft: 보조(예: Lift 1.2~1.5배) */
  tier: "strong" | "soft";
};

export type TopSegment = {
  segmentId: SegmentId;
  segmentName: string;
  /** 연령·성별 중 동일 기준으로 맞춘 상권 내 세그 모수(원 카운트) */
  segmentCount: number | null;
  /** 동일 기준 상권 전체 모수 */
  marketTotal: number | null;
  /** 동일 기준 ‘전체’ 세그 모수 — SA 분모 */
  segmentTotal: number | null;
  /** 모수 산출 기준: age | gender (연령·성별 혼용 금지) */
  countBasis: "age" | "gender" | null;
  /** 해당 상권 내 세그 비율 LS = 세그 모수 / 상권 전체 모수 */
  ls: number | null;
  /** 타 상권 평균 LS 대비 차이(RL), Ad Score·방문 종합 문구용 */
  rl: number | null;
  /** 방문 종합 정렬용(화면에는 최소만) */
  adScore: number | null;
  /** 전체 상권 평균 세그 비율 GS = 각 상권별 LS의 평균(데이터 있는 상권만) */
  gs: number | null;
  /** 세그 전체 중 이 상권 비중 SA = 상권 세그 모수 / 전체 세그 모수 (0~1) */
  sa: number | null;
  /** Lift Ratio = LS / GS (전체 평균 대비 몇 배) */
  liftRatio: number | null;
  /** Attention Score = (LS / GS) × log10(세그 모수) */
  attentionScore: number | null;
  /** 주목(Attention): 집중도·차별성 배지(최대 2) */
  listSignals: TopSegmentListSignal[];
  /** 주목 보조 배지 */
  auxListSignals: TopSegmentListSignal[];
  /** 주목: 한 줄 요약(선택 이유 문장형) */
  reason: string;
  /** 방문 종합(Ad Score 정렬과 동일 축): 점유·규모 중심 배지 */
  visitListSignals: TopSegmentListSignal[];
  visitAuxListSignals: TopSegmentListSignal[];
  /** 방문 종합: 한 줄 요약 */
  visitReason: string;
  /** 인사이트: 평균 비율·해당 상권 비율·배수·해석 */
  insightAveragePct: number | null;
  insightMarketPct: number | null;
  insightInterpretation: string;
  insightAdUse: string;
};

/** 상권 인사이트(항상 문장형) — 정렬 점수와 무관 */
export type MarketInsightNarrative = {
  genderParagraph: string;
  ageParagraph: string;
};

