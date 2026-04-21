"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ComboOption = { value: string; label: string; keywords?: string };

export function Combobox(props: {
  value: string | null;
  onChange: (value: string) => void;
  placeholder: string;
  options: ComboOption[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = props.options.find((o) => o.value === props.value) ?? null;

  const selectValue = (v: string) => {
    // 선택이 “반응 없는” 상태로 보이지 않도록, 여기서 확실히 상태 변경을 호출
    props.onChange(v);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* NOTE: Base UI PopoverTrigger는 Radix처럼 asChild를 지원하지 않습니다. */}
      <PopoverTrigger
        role="combobox"
        aria-expanded={open}
        className={cn(
          "inline-flex h-10 w-[260px] items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400/50",
          props.className,
        )}
      >
        <span className="truncate text-left">
          {selected ? selected.label : props.placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-70" />
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-0 bg-zinc-950/80 backdrop-blur border-white/10">
        <Command>
          <CommandInput placeholder="검색…" className="text-white" />
          <CommandList>
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
            <CommandGroup>
              {props.options.map((o) => (
                <CommandItem
                  key={o.value}
                  // cmdk 검색은 value 기반이므로 label+keywords를 넣고,
                  // 실제 선택값은 o.value를 사용한다.
                  value={`${o.label} ${o.keywords ?? ""}`.trim()}
                  onSelect={() => selectValue(o.value)}
                  onClick={() => selectValue(o.value)}
                  className="text-white/90"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      props.value === o.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

