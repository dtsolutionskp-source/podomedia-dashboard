import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DeltaBadge(props: { valuePp: number | null | undefined; label?: string }) {
  if (props.valuePp === null || props.valuePp === undefined) {
    return (
      <Badge variant="outline" className="border-white/10 text-white/70">
        {props.label ? `${props.label}: ` : ""}데이터 없음
      </Badge>
    );
  }
  const v = props.valuePp;
  const sign = v > 0 ? "+" : "";
  const cls =
    v >= 0
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/20"
      : "bg-rose-500/15 text-rose-200 border-rose-400/20";
  return (
    <Badge variant="outline" className={cn("border-white/10", cls)}>
      {props.label ? `${props.label}: ` : ""}
      {sign}
      {v.toFixed(1)}%p
    </Badge>
  );
}

