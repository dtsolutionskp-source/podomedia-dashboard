"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Market } from "@/lib/podomedia/types";

export function ExportMetricsButton(props: { market: Market }) {
  const [busy, setBusy] = React.useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const qs = new URLSearchParams({ market: props.market });
      const res = await fetch(`/api/export-metrics?${qs.toString()}`);
      if (!res.ok) throw new Error(`내보내기 실패 (${res.status})`);
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      let name = `podomedia_metrics_${props.market}.xlsx`;
      const m = cd?.match(/filename\*=UTF-8''([^;]+)/);
      if (m?.[1]) name = decodeURIComponent(m[1]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "엑셀 내보내기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={onClick}
      className="border-white/15 bg-white/5 text-white/90 hover:bg-white/10 hover:text-white"
    >
      <Download className="size-3.5 opacity-90" />
      {busy ? "생성 중…" : "엑셀 내보내기"}
    </Button>
  );
}
