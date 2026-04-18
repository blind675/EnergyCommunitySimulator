import type { CSSProperties } from "react";

interface StatProps {
  label: string;
  value: string;
  colorClass?: string;
  style?: CSSProperties;
}

export function Stat({ label, value, colorClass, style }: StatProps) {
  return (
    <div className="bg-black/30 rounded-md px-2 py-1.5">
      <div className="text-[10px] text-slate-300 mb-0.5 uppercase tracking-[0.06em]">{label}</div>
      <div className={`text-[13px] font-bold ${colorClass || "text-slate-100"}`} style={style}>{value}</div>
    </div>
  );
}
