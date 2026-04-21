"use client";

import * as React from "react";
import { Sparkles, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { GenderPieCompare } from "@/components/dashboard/GenderPie";
import { AgeLineCompareChart } from "@/components/dashboard/charts";
import type { SegmentDetailModel } from "@/lib/podomedia/analyze";
import type { TopSegment } from "@/lib/podomedia/types";

function fmt(n: number): string {
  return n.toLocaleString();
}

function toneFromTopSegment(t: TopSegment): { label: string; color: string } {
  const lr = t.liftRatio;
  if (lr !== null && lr >= 2.5) {
    return { label: "집중도 매우 높음", color: "bg-violet-500/20 text-violet-100 border-violet-300/20" };
  }
  if (lr !== null && lr >= 1.5) {
    return { label: "집중도 높음", color: "bg-indigo-500/20 text-indigo-100 border-indigo-300/20" };
  }
  if (lr !== null && lr > 1) {
    return { label: "평균 대비 우위", color: "bg-sky-500/15 text-sky-100 border-sky-300/20" };
  }
  if (t.listSignals.some((s) => s.tier === "strong")) {
    return { label: "주목 신호", color: "bg-emerald-500/15 text-emerald-100 border-emerald-300/20" };
  }
  return { label: "주목 후보", color: "bg-white/10 text-white/80 border-white/15" };
}

export function Top5Cards(props: {
  marketLabel: string;
  top5: TopSegment[];
  detailsBySegmentId: Record<string, SegmentDetailModel | undefined>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {props.top5.map((t, idx) => {
        const detail = props.detailsBySegmentId[t.segmentId];
        const tone = toneFromTopSegment(t);
        return (
          <Sheet key={t.segmentId}>
            <SheetTrigger>
              <button type="button" className="text-left w-full">
                <Card className="h-full bg-white/5 border-white/10 hover:bg-white/8 transition-colors">
                  <CardHeader className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm font-semibold truncate">{t.segmentName}</CardTitle>
                      <Badge variant="outline" className="border-white/10 text-white/70">
                        #{idx + 1}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="outline" className={tone.color}>
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        {tone.label}
                      </Badge>
                      <Badge variant="outline" className="border-white/10 text-white/80">
                        <Users className="mr-1 h-3.5 w-3.5" />
                        {t.segmentCount === null ? "데이터 없음" : fmt(t.segmentCount)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {t.listSignals.length ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap gap-2">
                          {t.listSignals.map((s, i) => (
                            <Badge
                              key={`${t.segmentId}-lsig-${i}`}
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
                        </div>
                        {t.auxListSignals.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {t.auxListSignals.map((s, i) => (
                              <Badge
                                key={`${t.segmentId}-aux-${i}`}
                                variant="outline"
                                className="border-white/10 text-white/50 text-[10px]"
                              >
                                {s.badge}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="text-xs text-white/70 line-clamp-3">{t.reason}</div>
                  </CardContent>
                </Card>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-[680px] bg-zinc-950/90 backdrop-blur border-white/10 text-white">
              <SheetHeader>
                <SheetTitle className="text-white">{t.segmentName} 상세</SheetTitle>
              </SheetHeader>

              {!detail ? (
                <div className="mt-4 text-sm text-white/70">상세 데이터 로딩에 실패했습니다(파일 누락/에러 가능).</div>
              ) : (
                <div className="mt-4 space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-white/10 text-white/80">
                      <TrendingUp className="mr-1 h-3.5 w-3.5" />
                      Lift {t.liftRatio === null ? "—" : `${t.liftRatio.toFixed(2)}배`}
                    </Badge>
                    <Badge variant="outline" className="border-white/10 text-white/80">
                      LS {t.ls === null ? "—" : `${(t.ls * 100).toFixed(2)}%`}
                    </Badge>
                    <Badge variant="outline" className="border-white/10 text-white/80">
                      GS {t.gs === null ? "—" : `${(t.gs * 100).toFixed(2)}%`}
                    </Badge>
                    <Badge variant="outline" className="border-white/10 text-white/80">
                      SA {t.sa === null ? "—" : `${(t.sa * 100).toFixed(2)}%`}
                    </Badge>
                    <Badge variant="outline" className="border-white/10 text-white/80">
                      Attention {t.attentionScore === null ? "—" : t.attentionScore.toFixed(2)}
                    </Badge>
                    <Badge variant="outline" className="border-white/10 text-white/80">
                      모수 {t.segmentCount === null ? "데이터 없음" : fmt(t.segmentCount)}
                    </Badge>
                  </div>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-sm">주목 근거 (평균 대비 집중도)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-white/80">
                      <div>
                        전체 상권 평균 비중(GS):{" "}
                        {t.insightAveragePct === null ? "—" : `${t.insightAveragePct.toFixed(2)}%`}
                      </div>
                      <div>
                        이 상권 비중(LS): {t.insightMarketPct === null ? "—" : `${t.insightMarketPct.toFixed(2)}%`}
                      </div>
                      <div>증가 배수(Lift): {t.liftRatio === null ? "—" : `${t.liftRatio.toFixed(2)}배`}</div>
                      <div className="text-white/70">{t.insightInterpretation}</div>
                      <div className="text-white/90">{t.insightAdUse}</div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-sm">인사이트: 성별 비교</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <GenderPieCompare baseline={detail.baseline.gender} segment={detail.segMarket.gender} />
                      </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-sm">인사이트: 연령 비교</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AgeLineCompareChart baseline={detail.baseline.age} segment={detail.segMarket.age} />
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-sm">이 세그가 선택된 이유</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-white/85">
                      {detail.headline}
                      <div className="mt-2 text-white/70">
                        상권·세그 분포를 함께 보면, 이 관심사가 이 상권에서 어떻게 두드러지는지 맥락을 잡을 수 있어요.
                      </div>
                    </CardContent>
                  </Card>

                  {(detail.baseline.missingFiles.length ||
                    detail.segMarket.missingFiles.length ||
                    detail.segTotal.missingFiles.length) && (
                    <Card className="bg-amber-500/10 border-amber-300/20">
                      <CardHeader>
                        <CardTitle className="text-sm text-amber-200">데이터 안내</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-amber-100/90">
                        일부 지표는 원본 데이터가 없어 표시되지 않을 수 있습니다.
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </SheetContent>
          </Sheet>
        );
      })}
    </div>
  );
}

