"use client";

import { Minus, Plus } from "lucide-react";

export function Stepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="w-7 h-7 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 rounded-md border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Minus size={11} />
      </button>
      <span className="w-8 text-center text-sm font-medium text-white tabular-nums select-none">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
        disabled={disabled || (max !== undefined && value >= max)}
        className="w-7 h-7 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 rounded-md border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Plus size={11} />
      </button>
    </div>
  );
}
