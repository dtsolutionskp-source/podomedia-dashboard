import { NextResponse } from "next/server";

import { getDashboardExportSnapshot } from "@/lib/podomedia/analyze";
import { buildMetricsExcelBuffer } from "@/lib/podomedia/metrics-excel";
import { MARKETS, type Market } from "@/lib/podomedia/types";

export const dynamic = "force-dynamic";

function asMarketParam(v: string | null): Market {
  if (v === "노량진") return "여의도";
  if (v && (MARKETS as readonly string[]).includes(v)) return v as Market;
  return "코엑스";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const market = asMarketParam(searchParams.get("market"));
  const snapshot = await getDashboardExportSnapshot(market);
  const buf = await buildMetricsExcelBuffer(snapshot);
  const date = snapshot.generatedAt.slice(0, 10);
  const filename = `podomedia_metrics_${market}_${date}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
