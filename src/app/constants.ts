import type { Month, ProfileKey, MemberType, Algorithm, Member } from "./types";

export const MONTHS: Month[] = [
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
export const SOLAR_CURVE = [0, 0, 0, 0, 0, 0.02, 0.07, 0.18, 0.35, 0.55, 0.75, 0.90, 0.98, 0.97, 0.88, 0.73, 0.52, 0.28, 0.10, 0.02, 0, 0, 0, 0];

// Consumption profiles (kW) per hour — normalized to 1kW peak
export const PROFILES: Record<ProfileKey, number[]> = {
  household: [0.15, 0.12, 0.10, 0.10, 0.10, 0.18, 0.45, 0.70, 0.55, 0.35, 0.30, 0.32, 0.40, 0.30, 0.28, 0.30, 0.40, 0.65, 0.85, 0.90, 0.80, 0.60, 0.40, 0.22],
  imm: [0.20, 0.15, 0.12, 0.12, 0.15, 0.25, 0.45, 0.70, 0.85, 0.90, 0.92, 0.95, 1.00, 0.95, 0.85, 0.80, 0.82, 0.90, 0.95, 0.88, 0.75, 0.60, 0.40, 0.25],
  public: [0.08, 0.08, 0.08, 0.08, 0.08, 0.10, 0.25, 0.60, 0.85, 0.95, 1.00, 1.00, 1.00, 0.95, 0.90, 0.85, 0.70, 0.45, 0.20, 0.12, 0.10, 0.08, 0.08, 0.08],
  household_small: [0.10, 0.08, 0.07, 0.07, 0.08, 0.12, 0.30, 0.45, 0.35, 0.20, 0.18, 0.20, 0.28, 0.20, 0.18, 0.20, 0.28, 0.45, 0.60, 0.65, 0.55, 0.40, 0.25, 0.14],
};

export const MEMBER_TYPES: MemberType[] = ["prosumator", "consumator"];
export const PROFILE_LABELS: Record<ProfileKey, string> = { household: "Gospodărie", imm: "IMM (afacere mică)", public: "Instituție publică", household_small: "Gospodărie mică" };
export const ALGO_LABELS: Record<Algorithm, string> = { proportional: "Proporțional (recomandat)", equal: "Cote egale", priority: "Ordine prioritate" };
export const ALGO_DESCRIPTIONS: Record<Algorithm, string> = {
  proportional: "Fiecare membru primește energie proporțional cu consumul său din interval. Echitabil și ușor de explicat — recomandat pentru Altringen.",
  equal: "Energia se împarte în cote egale între consumatorii activi. Potrivit pentru comunități mici cu consum similar între membri.",
  priority: "Membrii au o ordine de prioritate stabilită în statut. Potrivit pentru comunități cu membri vulnerabili energetic.",
};

export const PRICE_GRID = 1.25; // lei/kWh — price consumers pay to supplier
export const PRICE_INJECT = 0.55; // lei/kWh — price producers get for injecting to grid
export const PRICE_COMMUNITY = 0.90; // lei/kWh — internal community transaction price

export const DEFAULT_MEMBERS: Member[] = [
  { id: 1, name: "Membru 1 (Casa)", type: "prosumator", peakKw: 3, profileKey: "household", avgDailyKwh: 2, color: "#4ade80" },
  { id: 2, name: "Membru 2 (Casa)", type: "consumator", peakKw: 0, profileKey: "household", avgDailyKwh: 7, color: "#60a5fa" },
  { id: 3, name: "Membru 3 (Casa)", type: "prosumator", peakKw: 10, profileKey: "household", avgDailyKwh: 8, color: "#f472b6" },
  { id: 4, name: "Membru 4 (Pensiune)", type: "prosumator", peakKw: 15, profileKey: "imm", avgDailyKwh: 35, color: "#fb923c" },
  { id: 5, name: "Membru 5 (Primarie)", type: "consumator", peakKw: 0, profileKey: "public", avgDailyKwh: 60, color: "#a78bfa" },
];

export const COLORS = ["#4ade80", "#60a5fa", "#f472b6", "#fb923c", "#a78bfa", "#34d399", "#fbbf24", "#f87171"];
