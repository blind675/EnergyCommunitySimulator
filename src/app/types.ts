export interface Month {
  name: string;
  solarFactor: number;
  days: number;
}

export type ProfileKey = "household" | "imm" | "public" | "household_small";
export type MemberType = "prosumator" | "consumator";
export type Algorithm = "proportional" | "equal" | "priority";
export type TabKey = "results" | "config" | "chart" | "prices";

export interface PriceConfig {
  priceGrid: number;
  priceInject: number;
  priceCommunity: number;
}

export interface Member {
  id: number;
  name: string;
  type: MemberType;
  peakKw: number;
  profileKey: ProfileKey;
  avgDailyKwh: number;
  color: string;
}

export interface MemberResult {
  id: number;
  name: string;
  color: string;
  type: MemberType;
  totalProduced: number;
  totalConsumed: number;
  selfConsumed: number;
  sharedReceived: number;
  sharedSent: number;
  surplusToGrid: number;
  gridConsumed: number;
  billWithoutCommunity: number;
  billWithCommunity: number;
  savings: number;
  savingsPct: number;
}

export interface SimulationResult {
  members: MemberResult[];
  totalShared: number;
  totalProduced: number;
  totalSurplus: number;
  selfSufficiency: number;
}
