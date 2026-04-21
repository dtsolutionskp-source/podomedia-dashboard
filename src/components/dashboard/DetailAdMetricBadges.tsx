"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { Market } from "@/lib/podomedia/types";

type Props = {
  market: Market;
  segmentName: string;
  ls: number | null;
  rl: number | null;
  sa: number | null;
  segmentCount: number | null;
};

function wrapBadge(tooltip: string, label: ReactNode) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="outline" className="cursor-help border-white/10 text-white/80">
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-sm leading-snug">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function DetailAdMetricBadges(props: Props) {
  const { market, segmentName } = props;

  const lsPct = props.ls !== null ? (props.ls * 100).toFixed(2) : null;
  const saPct = props.sa !== null ? (props.sa * 100).toFixed(2) : null;
  const rlPp = props.rl !== null ? (props.rl * 100).toFixed(2) : null;

  const lsTip =
    props.ls === null
      ? "LS 데이터가 없어요."
      : `${market} 상권에서 ${segmentName}의 비율(LS)은 ${lsPct}%였어요.`;

  let rlTip = "RL 데이터가 없어요.";
  if (props.rl !== null && rlPp !== null) {
    const abs = Math.abs(Number(rlPp)).toFixed(2);
    if (props.rl > 0) {
      rlTip = `타 상권(나머지 상권) 평균과 비교하면, ${market}에서 ${segmentName}의 LS가 약 ${abs}%p 더 높게 나타났어요.`;
    } else if (props.rl < 0) {
      rlTip = `타 상권(나머지 상권) 평균과 비교하면, ${market}에서 ${segmentName}의 LS가 약 ${abs}%p 더 낮게 나타났어요.`;
    } else {
      rlTip = `타 상권 평균과 비교해 ${market}에서 ${segmentName}의 LS 차이는 거의 없었어요.`;
    }
  }

  const saTip =
    props.sa === null
      ? "SA 데이터가 없습니다."
      : `${segmentName} 관심 고객의 ${saPct}%는 ${market}에 방문한 것으로 집계됐어요.`;

  const countTip =
    props.segmentCount === null
      ? "모수 데이터가 없습니다."
      : `${market}에 방문한 고객 중 ${segmentName} 관심 고객은 ${props.segmentCount.toLocaleString()}명이에요.`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {wrapBadge(lsTip, <>LS {props.ls === null ? "—" : `${lsPct}%`}</>)}
      {wrapBadge(rlTip, <>RL {props.rl === null ? "—" : `${rlPp}%p`}</>)}
      {wrapBadge(saTip, <>SA {props.sa === null ? "—" : `${saPct}%`}</>)}
      {wrapBadge(
        countTip,
        <>모수 {props.segmentCount === null ? "데이터 없음" : props.segmentCount.toLocaleString()}</>,
      )}
    </div>
  );
}
