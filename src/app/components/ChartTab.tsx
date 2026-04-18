import type { Member, Algorithm, PriceConfig } from "../types";
import { MONTHS, SOLAR_CURVE, PROFILES } from "../constants";
import { simulate } from "../lib/simulate";
import { fmt } from "../lib/format";

interface ChartTabProps {
  members: Member[];
  monthIdx: number;
  algorithm: Algorithm;
  prices: PriceConfig;
}

export function ChartTab({ members, monthIdx, algorithm, prices }: ChartTabProps) {
  return (
    <div>
      <div className="mb-4 text-xs text-slate-300">
        Profil orar mediu pentru o zi din {MONTHS[monthIdx].name} — producție vs. consum total în comunitate
      </div>
      <div className="relative h-[220px]">
        {/* Y axis labels */}
        {[0, 25, 50, 75, 100].map(pct => (
          <div
            key={pct}
            className="absolute left-0 text-[9px] text-slate-700 w-[30px] text-right translate-y-1/2"
            style={{ bottom: `${pct}%` }}
          >{pct}%</div>
        ))}
        {/* Grid lines */}
        {[25, 50, 75].map(pct => (
          <div
            key={pct}
            className="absolute left-9 right-0 border-t border-dashed border-white/5"
            style={{ bottom: `${pct}%` }}
          />
        ))}
        {/* Bars */}
        <div className="absolute left-9 right-0 top-0 bottom-0 flex items-end gap-0.5">
          {Array.from({ length: 24 }).map((_, hour) => {
            const prod = members
              .filter(m => m.type === "prosumator")
              .reduce((s, m) => s + m.peakKw * SOLAR_CURVE[hour] * MONTHS[monthIdx].solarFactor, 0);
            const cons = members.reduce((s, m) => {
              const profile = PROFILES[m.profileKey];
              const profileSum = profile.reduce((a, b) => a + b, 0);
              return s + (profile[hour] / profileSum) * m.avgDailyKwh / 24;
            }, 0);
            const maxVal = members.reduce((s, m) => s + m.avgDailyKwh / 12, 0);
            const prodPct = Math.min(100, (prod / maxVal) * 100);
            const consPct = Math.min(100, (cons / maxVal) * 100);
            const sharedPct = Math.min(prodPct, consPct);

            return (
              <div key={hour} className="flex-1 h-full flex flex-col justify-end gap-px">
                {/* Consumption bar */}
                <div
                  className="bg-blue-400/25 rounded-t-sm relative"
                  style={{ height: `${consPct}%` }}
                >
                  {/* Shared portion overlay */}
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-green-400/45 rounded-t-sm"
                    style={{ height: `${consPct > 0 ? (sharedPct / consPct) * 100 : 0}%` }}
                  />
                </div>
                {/* Production line indicator */}
                {prodPct > 0 && (
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-amber-400 opacity-50 pointer-events-none"
                    style={{ bottom: `${prodPct}%` }}
                  />
                )}
                {/* Hour label */}
                {hour % 4 === 0 && (
                  <div className="text-[8px] text-slate-700 text-center mt-0.5">{hour}h</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 mt-4 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-400/25 rounded-sm" />
          Consum total comunitate
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-400/45 rounded-sm" />
          Energie partajată (produs intern)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-amber-400" />
          Nivel producție solar
        </div>
      </div>

      {/* Monthly comparison */}
      <div className="mt-6">
        <div className="text-xs text-slate-300 mb-3">Comparație lunară — energie partajată estimată (kWh)</div>
        <div className="flex items-end gap-1 h-20">
          {MONTHS.map((m, i) => {
            const r = simulate(members, i, algorithm, prices);
            const maxShared = Math.max(...MONTHS.map((_, j) => simulate(members, j, algorithm, prices).totalShared));
            const pct = maxShared > 0 ? (r.totalShared / maxShared) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="text-[9px] text-slate-300">{fmt(r.totalShared, 0)}</div>
                <div
                  className={`w-full rounded-t transition-all duration-200 min-h-[3px] ${i === monthIdx ? "bg-green-400" : "bg-green-400/25"
                    }`}
                  style={{ height: `${pct}%` }}
                />
                <div className={`text-[8px] ${i === monthIdx ? "text-green-400" : "text-slate-700"}`}>{m.name.slice(0, 3)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
