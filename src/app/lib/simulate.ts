import type { Member, MemberResult, Algorithm, SimulationResult, PriceConfig } from "../types";
import { MONTHS, SOLAR_CURVE, PROFILES } from "../constants";

export function simulate(members: Member[], monthIdx: number, algorithm: Algorithm, prices: PriceConfig): SimulationResult {
  const { priceGrid, priceInject, priceCommunity } = prices;
  const month = MONTHS[monthIdx];
  const { days, solarFactor } = month;

  // Per-member accumulators
  const acc: MemberResult[] = members.map(m => ({
    id: m.id, name: m.name, color: m.color, type: m.type,
    totalProduced: 0,
    totalConsumed: 0,
    selfConsumed: 0,
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
      // Production per prosumer this hour (kWh for 1-hour interval)
      const productions = members.map(m => {
        if (m.type !== "prosumator") return 0;
        return m.peakKw * SOLAR_CURVE[hour] * solarFactor;
      });

      // Consumption per member this hour
      const consumptions = members.map(m => {
        const profile = PROFILES[m.profileKey];
        // Scale profile to match avg daily consumption
        const profileSum = profile.reduce((a: number, b: number) => a + b, 0);
        return (profile[hour] / profileSum) * m.avgDailyKwh;
      });

      // Self-consumption: prosumers use their own production first (behind the meter)
      const selfCons = members.map((m, i) => {
        if (m.type !== "prosumator") return 0;
        return Math.min(productions[i], consumptions[i]);
      });

      // Net surplus available for community sharing (after self-consumption)
      const netSurplus = members.map((_, i) => Math.max(0, productions[i] - selfCons[i]));
      // Net demand remaining after self-consumption
      const netDemand = members.map((_, i) => consumptions[i] - selfCons[i]);

      const totalNetSurplus = netSurplus.reduce((a, b) => a + b, 0);
      const totalNetDemand = netDemand.reduce((a, b) => a + b, 0);
      const sharedEnergy = Math.min(totalNetSurplus, totalNetDemand);
      const gridSurplus = Math.max(0, totalNetSurplus - totalNetDemand);

      // Allocate shared energy to members with net demand based on algorithm
      let allocations: number[];

      if (algorithm === "proportional") {
        allocations = netDemand.map(d =>
          totalNetDemand > 0 ? sharedEnergy * (d / totalNetDemand) : 0
        );
      } else if (algorithm === "equal") {
        // Equal shares, capped at each member's actual demand, with redistribution
        allocations = new Array(members.length).fill(0);
        let remaining = sharedEnergy;
        const demandLeft = [...netDemand];
        let activeCount = demandLeft.filter(d => d > 0).length;

        while (remaining > 0.001 && activeCount > 0) {
          const share = remaining / activeCount;
          let distributed = 0;
          let newActive = 0;
          demandLeft.forEach((d, i) => {
            if (d > 0) {
              const give = Math.min(d, share);
              allocations[i] += give;
              demandLeft[i] -= give;
              distributed += give;
              if (demandLeft[i] > 0.001) newActive++;
            }
          });
          remaining -= distributed;
          if (distributed < 0.001) break; // no progress
          activeCount = newActive;
        }
      } else if (algorithm === "priority") {
        // Priority by order in list — greedy allocation
        allocations = new Array(members.length).fill(0);
        let remaining = sharedEnergy;
        for (let j = 0; j < members.length; j++) {
          if (netDemand[j] > 0 && remaining > 0) {
            const give = Math.min(netDemand[j], remaining);
            allocations[j] = give;
            remaining -= give;
          }
        }
      } else {
        allocations = new Array(members.length).fill(0);
      }

      // Accumulate
      members.forEach((m, i) => {
        acc[i].totalProduced += productions[i];
        acc[i].totalConsumed += consumptions[i];
        acc[i].selfConsumed += selfCons[i];
        acc[i].sharedReceived += allocations[i];
        acc[i].gridConsumed += Math.max(0, netDemand[i] - allocations[i]);
        if (m.type === "prosumator") {
          const contribution = totalNetSurplus > 0 ? netSurplus[i] / totalNetSurplus : 0;
          acc[i].sharedSent += sharedEnergy * contribution;
          acc[i].surplusToGrid += gridSurplus * contribution;
        }
      });
    }
  }

  // Financial calculations
  acc.forEach(a => {
    const m = members.find(x => x.id === a.id)!;
    if (m.type === "prosumator") {
      // Without community: prosumer self-consumes, sells surplus to grid
      const gridImportStandalone = a.totalConsumed - a.selfConsumed;
      const gridExportStandalone = a.totalProduced - a.selfConsumed;
      a.billWithoutCommunity = (gridImportStandalone * priceGrid) - (gridExportStandalone * priceInject);
      // With community: pay grid, earn from selling to community, pay for community energy received
      a.billWithCommunity = (a.gridConsumed * priceGrid)
        - (a.surplusToGrid * priceInject)
        - (a.sharedSent * priceCommunity)
        + (a.sharedReceived * priceCommunity);
    } else {
      a.billWithoutCommunity = a.totalConsumed * priceGrid;
      a.billWithCommunity = (a.gridConsumed * priceGrid) + (a.sharedReceived * priceCommunity);
    }
    a.savings = a.billWithoutCommunity - a.billWithCommunity;
    a.savingsPct = a.billWithoutCommunity !== 0 ? (a.savings / Math.abs(a.billWithoutCommunity)) * 100 : 0;
  });

  const totalShared = acc.reduce((s, a) => s + a.sharedReceived, 0);
  const totalProduced = acc.reduce((s, a) => s + a.totalProduced, 0);
  const totalConsumed = acc.reduce((s, a) => s + a.totalConsumed, 0);
  const totalSurplus = acc.reduce((s, a) => s + a.surplusToGrid, 0);
  const totalSelfConsumed = acc.reduce((s, a) => s + a.selfConsumed, 0);
  // Self-sufficiency: what % of total consumption is covered by local production
  const selfSufficiency = totalConsumed > 0
    ? ((totalSelfConsumed + totalShared) / totalConsumed) * 100
    : 0;

  return { members: acc, totalShared, totalProduced, totalSurplus, selfSufficiency };
}
