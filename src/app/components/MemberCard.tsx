import type { Member, MemberResult } from "../types";
import { fmt, fmtLei } from "../lib/format";
import { Stat } from "./Stat";

interface MemberCardProps {
  member: Member;
  result: MemberResult;
}

export function MemberCard({ member, result }: MemberCardProps) {
  const isProd = member.type === "prosumator";
  return (
    <div
      className="bg-white/[0.04] rounded-lg px-4 py-3.5 mb-2.5"
      style={{ border: `1px solid ${member.color}33`, borderLeft: `3px solid ${member.color}` }}
    >
      <div className="flex justify-between items-start mb-2.5">
        <div>
          <div className="text-[13px] font-bold text-slate-100 tracking-[0.02em]">{member.name}</div>
          <div className="text-[11px] uppercase tracking-[0.08em] mt-0.5" style={{ color: member.color }}>
            {isProd ? "⚡ Prosumator" : "🔌 Consumator"}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-extrabold ${result.savings >= 0 ? "text-green-400" : "text-red-400"}`}>
            {result.savings >= 0 ? "-" : "+"}{fmtLei(Math.abs(result.savings))}
          </div>
          <div className="text-[11px] text-slate-300">economii/lună</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {isProd && (
          <Stat label="Produs" value={`${fmt(result.totalProduced)} kWh`} colorClass="text-amber-400" />
        )}
        <Stat label="Consumat" value={`${fmt(result.totalConsumed)} kWh`} colorClass="text-slate-300" />
        <Stat label="Din comunitate" value={`${fmt(result.sharedReceived)} kWh`} style={{ color: member.color }} />
        <Stat label="Din rețea" value={`${fmt(result.gridConsumed)} kWh`} colorClass="text-slate-300" />
        {isProd && (
          <Stat label="Surplus rețea" value={`${fmt(result.surplusToGrid)} kWh`} colorClass="text-slate-300" />
        )}
        <Stat label="Economii %" value={`${fmt(result.savingsPct)}%`} colorClass="text-green-400" />
      </div>

      <div className="mt-2.5 flex gap-1.5 items-center">
        <div className="text-[11px] text-slate-300">
          Factură fără comunitate: <span className="text-slate-300">{fmtLei(result.billWithoutCommunity)}</span>
        </div>
        <div className="text-[11px] text-slate-300">→</div>
        <div className="text-[11px] text-slate-300">
          Cu comunitate: <span className="text-green-400 font-bold">{fmtLei(result.billWithCommunity)}</span>
        </div>
      </div>
    </div>
  );
}
