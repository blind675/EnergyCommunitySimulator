"use client";

import { useState, useMemo } from "react";

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface Month {
  name: string;
  solarFactor: number;
  days: number;
}

type ProfileKey = "household" | "inn" | "pool" | "household_small";
type MemberType = "prosumator" | "consumator";
type Algorithm = "proportional" | "equal" | "priority";
type TabKey = "results" | "config" | "chart";

interface Member {
  id: number;
  name: string;
  type: MemberType;
  peakKw: number;
  profileKey: ProfileKey;
  avgDailyKwh: number;
  color: string;
}

interface MemberResult {
  id: number;
  name: string;
  color: string;
  type: MemberType;
  totalProduced: number;
  totalConsumed: number;
  sharedReceived: number;
  sharedSent: number;
  surplusToGrid: number;
  gridConsumed: number;
  billWithoutCommunity: number;
  billWithCommunity: number;
  savings: number;
  savingsPct: number;
}

interface SimulationResult {
  members: MemberResult[];
  totalShared: number;
  totalProduced: number;
  totalSurplus: number;
  selfSufficiency: number;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MONTHS: Month[] = [
  { name: "Ianuarie", solarFactor: 0.22, days: 31 },
  { name: "Februarie", solarFactor: 0.33, days: 28 },
  { name: "Martie", solarFactor: 0.50, days: 31 },
  { name: "Aprilie", solarFactor: 0.65, days: 30 },
  { name: "Mai", solarFactor: 0.76, days: 31 },
  { name: "Iunie", solarFactor: 0.82, days: 30 },
  { name: "Iulie", solarFactor: 0.87, days: 31 },
  { name: "August", solarFactor: 0.81, days: 31 },
  { name: "Septembrie", solarFactor: 0.64, days: 30 },
  { name: "Octombrie", solarFactor: 0.44, days: 31 },
  { name: "Noiembrie", solarFactor: 0.27, days: 30 },
  { name: "Decembrie", solarFactor: 0.19, days: 31 },
];

// Normalized solar curve (0-1) per hour, peak summer
const SOLAR_CURVE = [0, 0, 0, 0, 0, 0.02, 0.07, 0.18, 0.35, 0.55, 0.75, 0.90, 0.98, 0.97, 0.88, 0.73, 0.52, 0.28, 0.10, 0.02, 0, 0, 0, 0];

// Consumption profiles (kW) per hour — normalized to 1kW peak
const PROFILES: Record<ProfileKey, number[]> = {
  household: [0.15, 0.12, 0.10, 0.10, 0.10, 0.18, 0.45, 0.70, 0.55, 0.35, 0.30, 0.32, 0.40, 0.30, 0.28, 0.30, 0.40, 0.65, 0.85, 0.90, 0.80, 0.60, 0.40, 0.22],
  inn: [0.20, 0.15, 0.12, 0.12, 0.15, 0.25, 0.45, 0.70, 0.85, 0.90, 0.92, 0.95, 1.00, 0.95, 0.85, 0.80, 0.82, 0.90, 0.95, 0.88, 0.75, 0.60, 0.40, 0.25],
  pool: [0.10, 0.10, 0.10, 0.10, 0.10, 0.15, 0.30, 0.55, 0.80, 0.95, 1.00, 1.00, 1.00, 1.00, 0.98, 0.95, 0.85, 0.70, 0.50, 0.30, 0.20, 0.15, 0.12, 0.10],
  household_small: [0.10, 0.08, 0.07, 0.07, 0.08, 0.12, 0.30, 0.45, 0.35, 0.20, 0.18, 0.20, 0.28, 0.20, 0.18, 0.20, 0.28, 0.45, 0.60, 0.65, 0.55, 0.40, 0.25, 0.14],
};

const MEMBER_TYPES: MemberType[] = ["prosumator", "consumator"];
const PROFILE_LABELS: Record<ProfileKey, string> = { household: "Gospodărie", inn: "Pensiune/Hotel", pool: "Piscină", household_small: "Gospodărie mică" };
const ALGO_LABELS: Record<Algorithm, string> = { proportional: "Proporțional (recomandat)", equal: "Cote egale", priority: "Ordine prioritate" };

const PRICE_GRID = 1.05; // lei/kWh — price consumers pay to supplier
const PRICE_INJECT = 0.35; // lei/kWh — price producers get for injecting to grid
const PRICE_COMMUNITY = 0.70; // lei/kWh — internal community transaction price

const DEFAULT_MEMBERS: Member[] = [
  { id: 1, name: "Tata (Altringen)", type: "prosumator", peakKw: 3.5, profileKey: "household", avgDailyKwh: 8, color: "#4ade80" },
  { id: 2, name: "Vecin Ion", type: "consumator", peakKw: 0, profileKey: "household", avgDailyKwh: 7, color: "#60a5fa" },
  { id: 3, name: "Vecin Maria", type: "consumator", peakKw: 0, profileKey: "household_small", avgDailyKwh: 5, color: "#f472b6" },
  { id: 4, name: "Pensiunea Verde", type: "consumator", peakKw: 0, profileKey: "inn", avgDailyKwh: 35, color: "#fb923c" },
  { id: 5, name: "Piscina Sătească", type: "consumator", peakKw: 0, profileKey: "pool", avgDailyKwh: 28, color: "#a78bfa" },
];

// ─── ENGINE ───────────────────────────────────────────────────────────────────

function simulate(members: Member[], monthIdx: number, algorithm: Algorithm): SimulationResult {
  const month = MONTHS[monthIdx];
  const { days, solarFactor } = month;

  // Per-member accumulators
  const acc: MemberResult[] = members.map(m => ({
    id: m.id, name: m.name, color: m.color, type: m.type,
    totalProduced: 0,
    totalConsumed: 0,
    sharedReceived: 0,
    sharedSent: 0,
    surplusToGrid: 0,
    gridConsumed: 0,
    billWithoutCommunity: 0,
    billWithCommunity: 0,
    savings: 0,
    savingsPct: 0,
  }));

  // Hourly simulation over the month
  for (let day = 0; day < days; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Production per prosumer this hour
      const productions = members.map(m => {
        if (m.type !== "prosumator") return 0;
        return m.peakKw * SOLAR_CURVE[hour] * solarFactor;
      });

      // Consumption per member this hour
      const consumptions = members.map(m => {
        const profile = PROFILES[m.profileKey];
        const dailyKwh = m.avgDailyKwh;
        // Scale profile to match avg daily consumption
        const profileSum = profile.reduce((a, b) => a + b, 0);
        return (profile[hour] / profileSum) * dailyKwh;
      });

      const totalProd = productions.reduce((a, b) => a + b, 0);
      const totalCons = consumptions.reduce((a, b) => a + b, 0);
      const sharedEnergy = Math.min(totalProd, totalCons);
      const surplus = Math.max(0, totalProd - totalCons);

      // Allocate shared energy to consumers based on algorithm
      const allocations = members.map((_, i) => {
        if (consumptions[i] === 0 || totalCons === 0) return 0;
        if (algorithm === "proportional") {
          return sharedEnergy * (consumptions[i] / totalCons);
        } else if (algorithm === "equal") {
          const consumers = members.filter((__, j) => consumptions[j] > 0).length;
          return consumers > 0 ? sharedEnergy / consumers : 0;
        } else if (algorithm === "priority") {
          // Priority by order in list
          let remaining = sharedEnergy;
          const result = new Array(members.length).fill(0);
          for (let j = 0; j < members.length; j++) {
            if (consumptions[j] > 0 && remaining > 0) {
              const give = Math.min(consumptions[j], remaining);
              result[j] = give;
              remaining -= give;
            }
          }
          return result[i];
        }
        return 0;
      });

      // Accumulate
      members.forEach((m, i) => {
        acc[i].totalProduced += productions[i];
        acc[i].totalConsumed += consumptions[i];
        acc[i].sharedReceived += allocations[i];
        acc[i].gridConsumed += Math.max(0, consumptions[i] - allocations[i]);
        if (m.type === "prosumator") {
          const sentThisHour = sharedEnergy * (productions[i] / (totalProd || 1));
          acc[i].sharedSent += sentThisHour;
          acc[i].surplusToGrid += surplus * (productions[i] / (totalProd || 1));
        }
      });
    }
  }

  // Financial calculations
  acc.forEach(a => {
    const m = members.find(x => x.id === a.id)!;
    if (m.type === "prosumator") {
      a.billWithoutCommunity = (a.totalConsumed * PRICE_GRID) - (a.totalProduced * PRICE_INJECT);
      a.billWithCommunity = (a.gridConsumed * PRICE_GRID) - (a.surplusToGrid * PRICE_INJECT) + (a.sharedSent * PRICE_COMMUNITY) - (a.sharedReceived * PRICE_COMMUNITY);
    } else {
      a.billWithoutCommunity = a.totalConsumed * PRICE_GRID;
      a.billWithCommunity = (a.gridConsumed * PRICE_GRID) + (a.sharedReceived * PRICE_COMMUNITY);
    }
    a.savings = a.billWithoutCommunity - a.billWithCommunity;
    a.savingsPct = a.billWithoutCommunity > 0 ? (a.savings / a.billWithoutCommunity) * 100 : 0;
  });

  const totalShared = acc.reduce((s, a) => s + a.sharedReceived, 0);
  const totalProduced = acc.reduce((s, a) => s + a.totalProduced, 0);
  const totalSurplus = acc.reduce((s, a) => s + a.surplusToGrid, 0);
  const selfSufficiency = totalProduced > 0 ? ((totalProduced - totalSurplus) / totalProduced) * 100 : 0;

  return { members: acc, totalShared, totalProduced, totalSurplus, selfSufficiency };
}

// ─── UI COMPONENTS ─────────────────────────────────────────────────────────────

function fmt(n: number, dec = 1) { return n.toFixed(dec).replace(".", ","); }
function fmtLei(n: number) { return fmt(n, 2) + " lei"; }

function MemberCard({ member, result }: { member: Member; result: MemberResult }) {
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

function Stat({ label, value, colorClass, style }: { label: string; value: string; colorClass?: string; style?: React.CSSProperties }) {
  return (
    <div className="bg-black/30 rounded-md px-2 py-1.5">
      <div className="text-[10px] text-slate-300 mb-0.5 uppercase tracking-[0.06em]">{label}</div>
      <div className={`text-[13px] font-bold ${colorClass || "text-slate-100"}`} style={style}>{value}</div>
    </div>
  );
}

function MemberEditor({ member, onChange, onDelete }: { member: Member; onChange: (m: Member) => void; onDelete: () => void }) {
  const inputCls = "bg-black/40 border border-white/10 rounded-md px-2 py-1 text-slate-100 text-[13px]";
  return (
    <div
      className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 mb-2"
      style={{ borderLeft: `3px solid ${member.color}` }}
    >
      <div className="flex gap-2 flex-wrap items-center">
        <input
          value={member.name}
          onChange={e => onChange({ ...member, name: e.target.value })}
          className={`${inputCls} flex-[1_1_160px]`}
          placeholder="Nume membru"
        />
        <select
          value={member.type}
          onChange={e => onChange({ ...member, type: e.target.value as MemberType })}
          className={inputCls}
        >
          {MEMBER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={member.profileKey}
          onChange={e => onChange({ ...member, profileKey: e.target.value as ProfileKey })}
          className={inputCls}
        >
          {Object.entries(PROFILE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {member.type === "prosumator" && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-300">Putere instalată:</span>
            <input
              type="number" min="0" max="20" step="0.5"
              value={member.peakKw}
              onChange={e => onChange({ ...member, peakKw: parseFloat(e.target.value) || 0 })}
              className="w-15 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-amber-400 text-[13px]"
            />
            <span className="text-[11px] text-slate-300">kWp</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-300">Consum zilnic:</span>
          <input
            type="number" min="1" max="200" step="1"
            value={member.avgDailyKwh}
            onChange={e => onChange({ ...member, avgDailyKwh: parseFloat(e.target.value) || 1 })}
            className="w-15 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-blue-400 text-[13px]"
          />
          <span className="text-[11px] text-slate-300">kWh/zi</span>
        </div>
        <button
          onClick={onDelete}
          className="bg-red-500/15 border border-red-500/30 rounded-md px-2.5 py-1 text-red-400 text-xs cursor-pointer"
        >✕</button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

const COLORS = ["#4ade80", "#60a5fa", "#f472b6", "#fb923c", "#a78bfa", "#34d399", "#fbbf24", "#f87171"];

export default function Page() {
  const [members, setMembers] = useState<Member[]>(DEFAULT_MEMBERS);
  const [monthIdx, setMonthIdx] = useState(3); // Aprilie
  const [algorithm, setAlgorithm] = useState<Algorithm>("proportional");
  const [tab, setTab] = useState<TabKey>("results");

  const results = useMemo(() => simulate(members, monthIdx, algorithm), [members, monthIdx, algorithm]);

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
            <div className="text-[22px] font-extrabold text-slate-100 -tracking-[0.02em]">
              Comunitatea Altringen
            </div>
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
              <span>Rețea națională: <span className="text-red-400">{PRICE_GRID}</span></span>
              <span>Injectare: <span className="text-slate-300">{PRICE_INJECT}</span></span>
              <span>Intern comunitate: <span className="text-green-400">{PRICE_COMMUNITY}</span></span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mt-4">
          {([["results", "📊 Rezultate"], ["config", "⚙️ Configurare membri"], ["chart", "📈 Profil zilnic"]] as [TabKey, string][]).map(([key, label]) => (
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

        {/* RESULTS TAB */}
        {tab === "results" && (
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
              <div>• Prețul intern comunitate ({PRICE_COMMUNITY} lei/kWh) este stabilit de regulamentul intern — poate fi ajustat</div>
              <div>• Factura finală a fiecărui membru = energie din rețea × {PRICE_GRID} lei + energie din comunitate × {PRICE_COMMUNITY} lei</div>
              <div>• Prosumatorii primesc {PRICE_COMMUNITY} lei/kWh pentru energia vândută în comunitate vs. {PRICE_INJECT} lei/kWh injectat în rețea</div>
            </div>
          </div>
        )}

        {/* CONFIG TAB */}
        {tab === "config" && (
          <div>
            <div className="mb-4 text-xs text-slate-300 leading-relaxed">
              Configurează membrii comunității. Minimum 5 membri necesari legal.
              Prosumatorii au panouri solare și pot produce energie. Consumatorii doar consumă.
            </div>
            {members.map((m) => (
              <MemberEditor
                key={m.id}
                member={m}
                onChange={updated => updateMember(m.id, updated)}
                onDelete={() => deleteMember(m.id)}
              />
            ))}
            <button
              onClick={addMember}
              className="mt-2 bg-green-400/10 border border-dashed border-green-400/40 rounded-lg px-5 py-2.5 text-green-400 text-[13px] cursor-pointer w-full tracking-[0.04em]"
            >+ Adaugă membru</button>

            <div className="mt-5 bg-amber-400/5 border border-amber-400/20 rounded-lg px-4 py-3 text-[11px] text-slate-300">
              <span className="text-amber-400">⚠️ Atenție:</span> Membrii comunității trebuie să fie racordați la același operator de distribuție
              (Rețele Electrice Banat / PPC pentru județul Timiș). În modelul fără licență, fiecare membru
              păstrează propriul contract de furnizare.
            </div>
          </div>
        )}

        {/* CHART TAB */}
        {tab === "chart" && (
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
                  const r = simulate(members, i, algorithm);
                  const maxShared = Math.max(...MONTHS.map((_, j) => simulate(members, j, algorithm).totalShared));
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
        )}
      </div>
    </div>
  );
}
