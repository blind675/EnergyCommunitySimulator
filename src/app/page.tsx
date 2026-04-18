"use client";

import { useState, useMemo } from "react";
import type { Member, Algorithm, TabKey, PriceConfig } from "./types";
import { MONTHS, ALGO_LABELS, PRICE_GRID, PRICE_INJECT, PRICE_COMMUNITY, DEFAULT_MEMBERS, COLORS } from "./constants";
import { simulate } from "./lib/simulate";
import { fmt, fmtLei } from "./lib/format";
import { generateResultsPdf } from "./lib/generatePdf";
import { ResultsTab } from "./components/ResultsTab";
import { ConfigTab } from "./components/ConfigTab";
import { ChartTab } from "./components/ChartTab";
import { PricesTab } from "./components/PricesTab";

export default function Page() {
  const [members, setMembers] = useState<Member[]>(DEFAULT_MEMBERS);
  const [monthIdx, setMonthIdx] = useState(3); // Aprilie
  const [algorithm, setAlgorithm] = useState<Algorithm>("proportional");
  const [tab, setTab] = useState<TabKey>("results");
  const [communityName, setCommunityName] = useState("Comunitatea Altringen");
  const [prices, setPrices] = useState<PriceConfig>({ priceGrid: PRICE_GRID, priceInject: PRICE_INJECT, priceCommunity: PRICE_COMMUNITY });

  const results = useMemo(() => simulate(members, monthIdx, algorithm, prices), [members, monthIdx, algorithm, prices]);

  const totalSavings = results.members.reduce((s, r) => s + r.savings, 0);
  const totalBillBefore = results.members.reduce((s, r) => s + r.billWithoutCommunity, 0);

  const addMember = () => {
    const id = Math.max(...members.map(m => m.id)) + 1;
    setMembers([...members, {
      id, name: `Membru ${id}`, type: "consumator",
      peakKw: 0, profileKey: "household", avgDailyKwh: 8,
      color: COLORS[id % COLORS.length]
    }]);
  };

  const updateMember = (id: number, updated: Member) => setMembers(members.map(m => m.id === id ? updated : m));
  const deleteMember = (id: number) => setMembers(members.filter(m => m.id !== id));

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#0a0f1e_0%,#0d1a2e_50%,#0a1a0a_100%)] font-mono text-slate-100 pb-10">
      {/* Header */}
      <div className="bg-[linear-gradient(90deg,rgba(74,222,128,0.08)_0%,rgba(96,165,250,0.05)_100%)] border-b border-green-400/15 px-6 pt-5 pb-4">
        <div className="flex items-baseline gap-3 flex-wrap">
          <div>
            <div className="text-[11px] text-green-400 tracking-[0.15em] uppercase mb-1">
              ⚡ Simulator Partajare Energie
            </div>
            <input
              value={communityName}
              onChange={e => setCommunityName(e.target.value)}
              className="text-[22px] font-extrabold text-slate-100 -tracking-[0.02em] bg-transparent border-none outline-none w-auto cursor-text hover:text-white/80 focus:border-b focus:border-green-400/30 transition-colors"
              style={{ width: `${Math.max(communityName.length, 1)}ch` }}
            />
          </div>
          <div className="ml-auto flex gap-4 flex-wrap">
            <div className="text-center">
              <div className="text-[22px] font-extrabold text-green-400">{fmtLei(totalSavings)}</div>
              <div className="text-[10px] text-slate-300 uppercase tracking-[0.08em]">Economii totale/lună</div>
            </div>
            <div className="text-center">
              <div className="text-[22px] font-extrabold text-blue-400">{fmt(results.selfSufficiency)}%</div>
              <div className="text-[10px] text-slate-300 uppercase tracking-[0.08em]">Autoconsum local</div>
            </div>
            <div className="text-center">
              <div className="text-[22px] font-extrabold text-amber-400">{fmt(results.totalShared)} kWh</div>
              <div className="text-[10px] text-slate-300 uppercase tracking-[0.08em]">Energie partajată</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mt-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-300 uppercase tracking-[0.08em]">Lună</label>
            <select
              value={monthIdx}
              onChange={e => setMonthIdx(parseInt(e.target.value))}
              className="bg-black/50 border border-green-400/30 rounded-md px-3 py-1.5 text-slate-100 text-[13px]"
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m.name} (factor solar: {m.solarFactor})</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-300 uppercase tracking-[0.08em]">Algoritm partajare</label>
            <select
              value={algorithm}
              onChange={e => setAlgorithm(e.target.value as Algorithm)}
              className="bg-black/50 border border-green-400/30 rounded-md px-3 py-1.5 text-slate-100 text-[13px]"
            >
              {Object.entries(ALGO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-300 uppercase tracking-[0.08em]">Prețuri (lei/kWh)</label>
            <div className="flex gap-2 text-[11px] text-slate-300 items-center py-1.5">
              <span>Rețea națională: <span className="text-red-400">{prices.priceGrid}</span></span>
              <span>Injectare: <span className="text-slate-300">{prices.priceInject}</span></span>
              <span>Intern comunitate: <span className="text-green-400">{prices.priceCommunity}</span></span>
            </div>
          </div>
          <div className="flex flex-col gap-1 ml-auto justify-end">
            <button
              onClick={() => generateResultsPdf(members, results, monthIdx, totalSavings, totalBillBefore, communityName, prices)}
              className="bg-green-400/10 border border-green-400/30 rounded-md px-4 py-1.5 text-green-400 text-xs cursor-pointer hover:bg-green-400/20 transition-colors tracking-[0.04em]"
            >📄 Descarcă PDF</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mt-4">
          {([["results", "📊 Rezultate"], ["config", "⚙️ Configurare membri"], ["prices", "💰 Prețuri"], ["chart", "📈 Profil zilnic"]] as [TabKey, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`border rounded-t-md px-4 py-1.5 text-xs cursor-pointer tracking-[0.04em] ${tab === key
                ? "bg-green-400/15 border-green-400/40 text-green-400"
                : "bg-transparent border-white/[0.08] text-slate-300"
                }`}
            >{label}</button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        {tab === "results" && (
          <ResultsTab
            members={members}
            results={results}
            monthIdx={monthIdx}
            totalSavings={totalSavings}
            totalBillBefore={totalBillBefore}
            prices={prices}
          />
        )}
        {tab === "config" && (
          <ConfigTab
            members={members}
            onUpdate={updateMember}
            onDelete={deleteMember}
            onAdd={addMember}
          />
        )}
        {tab === "prices" && (
          <PricesTab prices={prices} onChange={setPrices} />
        )}
        {tab === "chart" && (
          <ChartTab
            members={members}
            monthIdx={monthIdx}
            algorithm={algorithm}
            prices={prices}
          />
        )}
      </div>
    </div>
  );
}
