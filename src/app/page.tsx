import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { unstable_noStore as noStore } from "next/cache";

import { Header } from "@/components/dashboard/Header";
import { ModeTabs, type ViewMode } from "@/components/dashboard/ModeTabs";
import { FiltersBar } from "@/components/dashboard/FiltersBar";
import { SummaryInsightsPanel } from "@/components/dashboard/SummaryInsightsPanel";
import { TopSegmentRankToggle } from "@/components/dashboard/TopSegmentRankToggle";
import { AgeLineCompareChart } from "@/components/dashboard/charts";
import { GenderPieCompare } from "@/components/dashboard/GenderPie";
import { DetailSegmentPicker } from "@/components/dashboard/DetailSegmentPicker";
import { DetailMarketPicker } from "@/components/dashboard/DetailMarketPicker";
import { TopMarketList } from "@/components/dashboard/TopMarketList";

import { getDashboardModel, getSegmentDetailModel, getSegmentMarketRanking } from "@/lib/podomedia/analyze";
import { loadSegmentForMarket } from "@/lib/podomedia/load";
import { MARKETS, type Market } from "@/lib/podomedia/types";
import { DetailAdMetricBadges } from "@/components/dashboard/DetailAdMetricBadges";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function asMarket(v: string | null): Market {
  if (v && (MARKETS as readonly string[]).includes(v)) return v as Market;
  return "코엑스";
}

function wholeSegmentPreferTotal(seg: Awaited<ReturnType<typeof loadSegmentForMarket>>): number | null {
  if (seg.status.age === "ok" && seg.age) return seg.age.total;
  if (seg.status.gender === "ok" && seg.gender) return seg.gender.total;
  return null;
}

export default async function Home(props: {
  searchParams?: Promise<{ market?: string; segment?: string; view?: string }> | { market?: string; segment?: string; view?: string };
}) {
  // 쿼리스트링(view/market/segment) 변경 시 화면이 고정되는 문제를 막기 위해
  // 이 페이지를 항상 동적으로 계산하도록 캐시를 끈다.
  noStore();

  // Next.js(App Router)에서는 searchParams가 Promise로 들어오는 경우가 있어
  // 항상 await 형태로 안전하게 읽는다.
  const sp = (await Promise.resolve(props.searchParams)) ?? {};
  const mode = (sp.view === "segment" ? "segment" : "market") as ViewMode;
  const market = asMarket(sp.market ?? null);
  const selectedSegment = sp.segment ?? null;
  const dashboard = await getDashboardModel(market, selectedSegment);
  const detail = selectedSegment ? await getSegmentDetailModel(market, selectedSegment) : null;
  const segmentRanking = selectedSegment ? await getSegmentMarketRanking(selectedSegment) : null;
  const segWhole =
    mode === "segment" && selectedSegment ? await loadSegmentForMarket(selectedSegment, "전체") : null;

  return (
    <div className="flex-1 dash-bg">
      <Header />

      <main className="w-full px-8 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <ModeTabs mode={mode} market={market} segment={selectedSegment} />
            {mode === "market" ? (
              <FiltersBar
                market={market}
                markets={MARKETS.map((m) => ({ value: m, label: m }))}
                segment={null}
                segments={[]}
                view={mode}
              />
            ) : (
              <FiltersBar
                market={market}
                markets={MARKETS.map((m) => ({ value: m, label: m }))}
                segment={selectedSegment}
                segments={dashboard.segments}
                view={mode}
                showMarketPicker={false}
              />
            )}
          </div>
          {dashboard.segments.length > 0 ? (
            <Badge variant="outline" className="border-white/10 text-white/80">
              관심사 {dashboard.segments.length.toLocaleString()}개
            </Badge>
          ) : null}
        </div>

        {mode === "market" ? (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-base">상권 기본 분석</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-3 space-y-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">상권 규모(3개 상권 합 대비)</div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {dashboard.selectedMarketSharePct === null
                      ? "—"
                      : `${dashboard.selectedMarketSharePct.toFixed(1)}%`}
                  </div>
                  <div className="mt-1 text-xs text-white/60">
                    기준: 상권 정보 파일의 총 모수(연령 합 우선, 없으면 성별 합)
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">성별(원형)</div>
                  <div className="mt-2">
                    <GenderPieCompare baseline={dashboard.baseline.gender} />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-9 rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60 mb-2">연령 분포(전체폭)</div>
                <AgeLineCompareChart baseline={dashboard.baseline.age} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-base">세그먼트 기본 분석</CardTitle>
                <div className="text-xs text-white/55 pt-1">
                  선택한 세그먼트의 <span className="text-white/75">전체(3상권 합)</span> 파일 기준 분포입니다. 상권별
                  비교는 아래 「추천 상권」과 하단 상세에서 이어집니다.
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-12">
                {segWhole ? (
                  <>
                    <div className="lg:col-span-3 space-y-3">
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-white/60">관심 모수 (전체·연령 합 우선)</div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {wholeSegmentPreferTotal(segWhole) === null
                            ? "—"
                            : wholeSegmentPreferTotal(segWhole)!.toLocaleString()}
                        </div>
                        <div className="mt-1 text-xs text-white/60">
                          세그먼트: <span className="text-white/80">{segWhole.segmentName}</span>
                        </div>
                        {segWhole.status.gender !== "ok" || segWhole.status.age !== "ok" ? (
                          <div className="mt-2 text-xs text-white/50">
                            일부 항목은 데이터가 없어 차트가 비어 있을 수 있습니다.
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-white/60">성별(원형)</div>
                        <div className="mt-2">
                          {segWhole.status.gender === "ok" && segWhole.gender ? (
                            <GenderPieCompare segment={segWhole.gender} />
                          ) : (
                            <div className="text-sm text-white/70">성별 데이터가 없습니다.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-9 rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-white/60 mb-2">연령 분포 (전체·전체폭)</div>
                      {segWhole.status.age === "ok" && segWhole.age ? (
                        <AgeLineCompareChart
                          segment={segWhole.age}
                          segmentOnlyLabel="세그먼트 (전체)"
                        />
                      ) : (
                        <div className="text-sm text-white/70">연령 데이터가 없습니다.</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="lg:col-span-12 text-sm text-white/70">
                    상단 필터에서 세그먼트를 선택하면, 전체 기준 성별·연령 기본 분석이 표시됩니다.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-base">추천 상권</CardTitle>
                <div className="text-xs text-white/55 pt-1">
                  주목(집중도)과 방문 종합(내부 정렬)을 나눠 상위 상권을 골랐습니다. 두 순위는 서로 다른 기준입니다.
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {segmentRanking ? (
                  <>
                    <TopMarketList
                      title="주목 상권 · 집중도 TOP 3"
                      variant="attention"
                      items={segmentRanking.attentionTop3}
                    />
                    <TopMarketList
                      title="방문 종합 상권 TOP 3"
                      variant="visit"
                      items={segmentRanking.visitTop3}
                    />
                  </>
                ) : (
                  <div className="text-sm text-white/70">세그먼트를 선택하면 상권별 순위가 표시됩니다.</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {mode === "market" ? (
          <TopSegmentRankToggle
            market={market}
            view={mode}
            selectedSegmentId={selectedSegment}
            top5Attention={dashboard.top5Attention}
            top5VisitSummary={dashboard.top5VisitSummary}
          />
        ) : null}

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-base">하단 상세 분석 (전체폭)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!detail ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-white/70">
                    {mode === "market"
                      ? "TOP5를 누르지 않아도, 오른쪽 드롭박스에서 세그먼트를 선택해 교차 분석을 시작할 수 있습니다."
                      : "상권 카드를 누르거나, 오른쪽에서 상권을 바꿔 가며 상권 인사이트를 비교할 수 있습니다."}
                  </div>
                  {mode === "market" ? (
                    <DetailSegmentPicker
                      segment={selectedSegment}
                      segments={dashboard.segments}
                      market={market}
                      view={mode}
                    />
                  ) : (
                    <DetailMarketPicker market={market} segment={selectedSegment} />
                  )}
                </div>
                <SummaryInsightsPanel
                  marketLabel={market}
                  narrative={dashboard.marketInsightNarrative}
                  detail={null}
                />

              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-white">
                      {market} · {detail.segmentName}
                    </div>
                    <div className="mt-1 text-sm text-white/70">
                      {detail.headline}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DetailAdMetricBadges
                      market={market}
                      segmentName={detail.segmentName}
                      ls={detail.ls}
                      rl={detail.rl}
                      sa={detail.sa}
                      segmentCount={detail.segmentCount}
                    />
                    {mode === "market" ? (
                      <div className="ml-2">
                        <DetailSegmentPicker
                          segment={selectedSegment}
                          segments={dashboard.segments}
                          market={market}
                          view={mode}
                        />
                      </div>
                    ) : (
                      <div className="ml-2">
                        <DetailMarketPicker market={market} segment={selectedSegment} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-12">
                  {/* 왼쪽: 인사이트(성별) */}
                  <div className="lg:col-span-4 space-y-4">
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-sm">인사이트: 성별 비교</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <GenderPieCompare baseline={detail.baseline.gender} segment={detail.segMarket.gender} />
                      </CardContent>
                    </Card>
                  </div>

                  {/* 오른쪽: 연령 전체폭 */}
                  <Card className="bg-white/5 border-white/10 lg:col-span-8">
                    <CardHeader>
                      <CardTitle className="text-sm">인사이트: 연령 비교 (상권 정보 vs 세그먼트)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AgeLineCompareChart baseline={detail.baseline.age} segment={detail.segMarket.age} />
                    </CardContent>
                  </Card>
                </div>

                <SummaryInsightsPanel
                  marketLabel={market}
                  narrative={dashboard.marketInsightNarrative}
                  detail={detail}
                />

              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
