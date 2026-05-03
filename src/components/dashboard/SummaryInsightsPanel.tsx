import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { DetailAdMetricBadges } from "@/components/dashboard/DetailAdMetricBadges";
import type { SegmentDetailModel } from "@/lib/podomedia/analyze";
import type { Market, MarketInsightNarrative } from "@/lib/podomedia/types";

export function SummaryInsightsPanel(props: {
  marketLabel: Market;
  narrative: MarketInsightNarrative;
  detail: SegmentDetailModel | null;
  /** 교차 분석 카드 안에 넣을 때 바깥 Card 없이 구분선만 사용 */
  embedded?: boolean;
}) {
  const d = props.detail;
  const embedded = props.embedded ?? false;

  const paragraphs = (
    <div className="space-y-3 text-sm text-white/80 leading-relaxed">
      <p>{props.narrative.genderParagraph}</p>
      <p>{props.narrative.ageParagraph}</p>
    </div>
  );

  const detailBlocks =
    d !== null ? (
      <>
        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <Badge variant="secondary" className="bg-white/10 text-white/80">
            상권: {props.marketLabel}
          </Badge>
          <Badge variant="secondary" className="bg-white/10 text-white/80">
            세그: {d.segmentName}
          </Badge>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
          <div className="text-xs font-medium text-white/70">이 세그가 선택된 이유</div>
          <p className="text-sm text-white/80 leading-relaxed">{d.headline}</p>
          {d.adScore !== null && d.adScoreTopPercentLabel ? (
            <p className="text-xs text-white/50">
              같은 상권에서 비슷한 방식으로 묶어 본 상대적 강도는{" "}
              <span className="text-white/70">{d.adScoreTopPercentLabel}</span> 수준이에요(참고용, 정렬 지표).
            </p>
          ) : d.adScore === null ? (
            <p className="text-xs text-white/50">방문 종합 정렬용 지표를 만들 데이터가 일부 없어요.</p>
          ) : null}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-white/60 mb-2">지표 한눈에 보기</div>
          <DetailAdMetricBadges
            market={props.marketLabel}
            segmentName={d.segmentName}
            ls={d.ls}
            rl={d.rl}
            sa={d.sa}
            segmentCount={d.segmentCount}
          />
        </div>
      </>
    ) : (
      <p className="text-sm text-white/55 border-t border-white/10 pt-4">
        세그를 선택하면 문장형 요약·지표 배지가 함께 표시돼요.
      </p>
    );

  if (embedded) {
    return (
      <div className="border-t border-white/10 pt-6 mt-2 space-y-5">
        <div>
          <div className="text-base font-semibold text-white">요약 및 인사이트</div>
          <div className="text-xs text-white/55 pt-1">
            상권 인사이트 문장과 선택 세그의 연령 맥락을 한곳에서 확인할 수 있어요.
          </div>
        </div>
        {paragraphs}
        {detailBlocks}
      </div>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-base">요약 및 인사이트</CardTitle>
        <div className="text-xs text-white/55 pt-1">
          상권 인사이트 문장과 선택 세그의 연령 맥락을 한곳에서 확인할 수 있어요.
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {paragraphs}
        {detailBlocks}
      </CardContent>
    </Card>
  );
}
