"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import type { Market } from "@/lib/podomedia/types";

export function MarketTabs(props: { value: Market }) {
  const sp = useSearchParams();
  const segment = sp.get("segment");

  const href = (m: Market) => {
    const next = new URLSearchParams();
    next.set("market", m);
    if (segment) next.set("segment", segment);
    return `/?${next.toString()}`;
  };

  const tabClass = (m: Market) =>
    cn(
      "inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
      props.value === m
        ? "border-white/20 bg-white/15 text-white"
        : "border-transparent text-white/70 hover:bg-white/10 hover:text-white",
    );

  return (
    <nav className="inline-flex gap-1 rounded-lg bg-white p-[3px]">
      <Link href={href("코엑스")} className={tabClass("코엑스")}>
        코엑스
      </Link>
      <Link href={href("명동")} className={tabClass("명동")}>
        명동
      </Link>
      <Link href={href("여의도")} className={tabClass("여의도")}>
        여의도
      </Link>
    </nav>
  );
}
