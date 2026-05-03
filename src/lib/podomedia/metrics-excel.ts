import ExcelJS from "exceljs";

import type { DashboardExportSnapshot } from "@/lib/podomedia/analyze";
import { MARKETS } from "@/lib/podomedia/types";

const ATT_DESC =
  "주목 = (LS÷GS)×LOG10(N_세그)  ※ GS는 상호 호환되는 상권별 LS 평균, 최소 모수·호환 실패 시 대시보드와 동일하게 주목 제외";
const VISIT_DESC =
  "방문종합 = 0.35×LS + 0.3×RL + 0.2×SA + 0.15×LOG10(N_세그+1)  ※ RL·SA·scale 부재 시 앱과 동일하게 점수 없음";

/** LS·Lift·주목·SA·scale·방문종합은 엑셀 수식, RL·GS·입력 모수는 앱과 동일한 값 */
export async function buildMetricsExcelBuffer(snapshot: DashboardExportSnapshot): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "podomedia-dashboard";

  const info = wb.addWorksheet("안내", {
    views: [{ state: "frozen", ySplit: 0 }],
  });
  info.getColumn(1).width = 22;
  info.getColumn(2).width = 44;
  info.getCell("A1").value = "Podomedia 상권·세그먼트 지표";
  info.getCell("A1").font = { bold: true, size: 14 };
  info.getCell("A2").value = "선택 상권";
  info.getCell("B2").value = snapshot.market;
  info.getCell("A3").value = "생성 시각(UTC)";
  info.getCell("B3").value = snapshot.generatedAt;
  info.getCell("A4").value = "기준 상권 모수(연령 우선 합)";
  info.getCell("B4").value = MARKETS.map((m) => `${m}: ${snapshot.baselineTotals[m]?.toLocaleString?.() ?? snapshot.baselineTotals[m]}`).join(
    " | ",
  );
  info.getCell("A6").value = "열 설명";
  info.getCell("A6").font = { bold: true };
  info.getCell("A7").value =
    "LS = N_세그÷N_상권(선택 상권), Lift = LS÷GS, 주목 = Lift×LOG10(N_세그), SA = N_세그÷N_전체세그, RL은 타 상권 LS 평균과의 차(앱 계산값)";
  info.getCell("A8").value = ATT_DESC;
  info.getCell("A9").value = VISIT_DESC;

  const ws = wb.addWorksheet("세그먼트별", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  const headers = [
    "세그먼트명",
    "N_세그(선택상권)",
    "N_상권전체",
    "LS",
    "GS",
    "Lift(LS/GS)",
    "주목점수",
    "RL(앱값)",
    "LS_코엑스",
    "LS_명동",
    "LS_여의도",
    "N_전체세그",
    "SA",
    "scale",
    "방문종합",
    "주목_수식",
    "방문종합_수식",
  ];

  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
    headerRow.getCell(i + 1).font = { bold: true };
  });

  ws.getRow(1).getCell(1).value = `선택 상권: ${snapshot.market}`;
  ws.getRow(1).getCell(1).font = { bold: true };
  ws.getRow(2).getCell(1).value = "수식 열(D,F,G,M,N,O)은 파일을 열면 값으로 표시됩니다. 수식은 셀을 선택하면 수식 입력줄에서 확인할 수 있어요.";

  let r = 4;
  for (const row of snapshot.rows) {
    ws.getCell(`A${r}`).value = row.segmentName;
    ws.getCell(`B${r}`).value = row.nSeg ?? undefined;
    ws.getCell(`C${r}`).value = row.nMkt ?? undefined;
    ws.getCell(`D${r}`).value = {
      formula: `IF(AND(ISNUMBER(B${r}),ISNUMBER(C${r}),C${r}<>0),B${r}/C${r},"")`,
      result: row.ls ?? undefined,
    };
    ws.getCell(`E${r}`).value = row.gs ?? undefined;
    ws.getCell(`F${r}`).value = {
      formula: `IF(AND(ISNUMBER(D${r}),ISNUMBER(E${r}),E${r}<>0),D${r}/E${r},"")`,
      result: row.liftRatio ?? undefined,
    };
    ws.getCell(`G${r}`).value = {
      formula: `IF(AND(ISNUMBER(F${r}),ISNUMBER(B${r}),B${r}>0),F${r}*LOG10(B${r}),"")`,
      result: row.attentionScore ?? undefined,
    };
    ws.getCell(`H${r}`).value = row.rl ?? undefined;
    ws.getCell(`I${r}`).value = row.lsByMarket["코엑스"] ?? undefined;
    ws.getCell(`J${r}`).value = row.lsByMarket["명동"] ?? undefined;
    ws.getCell(`K${r}`).value = row.lsByMarket["여의도"] ?? undefined;
    ws.getCell(`L${r}`).value = row.segmentTotal ?? undefined;
    ws.getCell(`M${r}`).value = {
      formula: `IF(AND(ISNUMBER(B${r}),ISNUMBER(L${r}),L${r}<>0),B${r}/L${r},"")`,
      result: row.sa ?? undefined,
    };
    ws.getCell(`N${r}`).value = {
      formula: `IF(ISNUMBER(B${r}),LOG10(B${r}+1),"")`,
      result: row.scale ?? undefined,
    };
    ws.getCell(`O${r}`).value = {
      formula: `IF(AND(ISNUMBER(D${r}),ISNUMBER(H${r}),ISNUMBER(M${r}),ISNUMBER(N${r})),0.35*D${r}+0.3*H${r}+0.2*M${r}+0.15*N${r},"")`,
      result: row.adScore ?? undefined,
    };
    ws.getCell(`P${r}`).value = ATT_DESC;
    ws.getCell(`Q${r}`).value = VISIT_DESC;
    r++;
  }

  const widths = [18, 14, 12, 10, 10, 12, 12, 12, 11, 11, 11, 12, 10, 10, 12, 44, 44];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
