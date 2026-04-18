import type { Member, SimulationResult, PriceConfig } from "../types";
import { MONTHS } from "../constants";
import { fmt, fmtLei } from "../lib/format";
import { MemberCard } from "./MemberCard";

interface ResultsTabProps {
  members: Member[];
  results: SimulationResult;
  monthIdx: number;
  totalSavings: number;
  totalBillBefore: number;
  prices: PriceConfig;
}

export function ResultsTab({ members, results, monthIdx, totalSavings, totalBillBefore, prices }: ResultsTabProps) {
  return (
    <div>
      {/* Summary bar */}
      <div className="bg-green-400/[0.06] border border-green-400/15 rounded-lg px-4 py-3 mb-5 flex gap-6 flex-wrap">
        <div>
          <span className="text-[11px] text-slate-300">Total produs în comunitate: </span>
          <span className="text-amber-400 font-bold">{fmt(results.totalProduced)} kWh</span>
        </div>
        <div>
          <span className="text-[11px] text-slate-300">Energie partajată intern: </span>
          <span className="text-green-400 font-bold">{fmt(results.totalShared)} kWh</span>
        </div>
        <div>
          <span className="text-[11px] text-slate-300">Surplus injectat în rețea: </span>
          <span className="text-slate-300 font-bold">{fmt(results.totalSurplus)} kWh</span>
        </div>
        <div>
          <span className="text-[11px] text-slate-300">Economii totale vs. fără comunitate: </span>
          <span className="text-green-400 font-bold">
            {fmtLei(totalSavings)} ({fmt(totalSavings / totalBillBefore * 100)}%)
          </span>
        </div>
      </div>

      {/* Member cards */}
      {members.map((m, i) => (
        <MemberCard key={m.id} member={m} result={results.members[i]} />
      ))}

      {/* Notes */}
      <div className="mt-5 bg-blue-400/5 border border-blue-400/15 rounded-lg px-4 py-3 text-[11px] text-slate-300 leading-relaxed">
        <div className="text-blue-400 font-bold mb-1.5 text-xs">📌 Note metodologice</div>
        <div>• Producția solară estimată pentru județul Timiș, factor iradiere {MONTHS[monthIdx].solarFactor} (luna {MONTHS[monthIdx].name})</div>
        <div>• Intervalele de 15 min (SED) simulate ca ore pentru simplitate — producția reală vine de la operatorul de distribuție</div>
        <div>• Prețul intern comunitate ({prices.priceCommunity} lei/kWh) este stabilit de regulamentul intern — poate fi ajustat</div>
        <div>• Factura finală a fiecărui membru = energie din rețea × {prices.priceGrid} lei + energie din comunitate × {prices.priceCommunity} lei</div>
        <div>• Prosumatorii primesc {prices.priceCommunity} lei/kWh pentru energia vândută în comunitate vs. {prices.priceInject} lei/kWh injectat în rețea</div>
      </div>
    </div>
  );
}
