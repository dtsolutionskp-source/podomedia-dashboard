"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SegmentSelect(props: {
  segments: { segmentId: string; segmentName: string }[];
  value: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  return (
    <Select
      value={props.value ?? ""}
      onValueChange={(v) => {
        const next = new URLSearchParams(sp);
        if (v) next.set("segment", v);
        else next.delete("segment");
        router.push(`${pathname}?${next.toString()}`);
      }}
    >
      <SelectTrigger className="w-[280px] bg-white">
        <SelectValue placeholder="세그먼트 선택" />
      </SelectTrigger>
      <SelectContent>
        {props.segments.map((s) => (
          <SelectItem key={s.segmentId} value={s.segmentId}>
            {s.segmentName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

