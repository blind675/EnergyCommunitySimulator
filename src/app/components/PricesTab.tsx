import type { PriceConfig } from "../types";
import { PRICE_GRID, PRICE_INJECT, PRICE_COMMUNITY } from "../constants";

interface PricesTabProps {
  prices: PriceConfig;
  onChange: (prices: PriceConfig) => void;
}

export function PricesTab({ prices, onChange }: PricesTabProps) {
  const update = (key: keyof PriceConfig, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onChange({ ...prices, [key]: num });
    }
  };

  const reset = () => {
    onChange({ priceGrid: PRICE_GRID, priceInject: PRICE_INJECT, priceCommunity: PRICE_COMMUNITY });
  };

  const fields: { key: keyof PriceConfig; label: string; description: string; color: string }[] = [
    {
      key: "priceGrid",
      label: "Preț rețea națională",
      description: "Prețul pe care consumatorii îl plătesc furnizorului pentru energia din rețeaua națională.",
      color: "text-red-400",
    },
    {
      key: "priceInject",
      label: "Preț injectare în rețea",
      description: "Prețul pe care prosumatorii îl primesc pentru energia injectată în rețeaua națională (fără comunitate).",
      color: "text-slate-300",
    },
    {
      key: "priceCommunity",
      label: "Preț intern comunitate",
      description: "Prețul la care se tranzacționează energia între membrii comunității. Trebuie să fie între prețul de injectare și cel al rețelei.",
      color: "text-green-400",
    },
  ];

  const isValid = prices.priceInject < prices.priceCommunity && prices.priceCommunity < prices.priceGrid;

  return (
    <div>
      <div className="mb-4 text-xs text-slate-300 leading-relaxed">
        Configurează prețurile energiei (lei/kWh). Prețul intern al comunității trebuie să fie
        între prețul de injectare și cel al rețelei pentru ca toți membrii să beneficieze.
      </div>

      <div className="grid gap-4 max-w-lg">
        {fields.map(({ key, label, description, color }) => (
          <div key={key} className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3">
            <label className="flex items-center justify-between gap-4">
              <div>
                <div className={`text-[13px] font-bold ${color}`}>{label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{description}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={prices[key]}
                  onChange={e => update(key, e.target.value)}
                  className="bg-black/50 border border-green-400/30 rounded-md px-3 py-1.5 text-slate-100 text-[14px] font-bold w-24 text-right"
                />
                <span className="text-[11px] text-slate-400">lei/kWh</span>
              </div>
            </label>
          </div>
        ))}
      </div>

      {!isValid && (
        <div className="mt-4 bg-red-400/10 border border-red-400/30 rounded-lg px-4 py-3 text-[11px] text-red-300">
          ⚠️ Prețul intern al comunității ({prices.priceCommunity} lei) trebuie să fie mai mare decât
          prețul de injectare ({prices.priceInject} lei) și mai mic decât prețul rețelei ({prices.priceGrid} lei).
        </div>
      )}

      {isValid && (
        <div className="mt-4 bg-green-400/5 border border-green-400/15 rounded-lg px-4 py-3 text-[11px] text-slate-300">
          <span className="text-green-400">✓</span> Prețurile sunt coerente.
          Prosumatorii câștigă <span className="text-green-400 font-bold">{(prices.priceCommunity - prices.priceInject).toFixed(2)} lei/kWh</span> în
          plus vânzând în comunitate vs. rețea.
          Consumatorii economisesc <span className="text-green-400 font-bold">{(prices.priceGrid - prices.priceCommunity).toFixed(2)} lei/kWh</span> cumpărând
          din comunitate vs. rețea.
        </div>
      )}

      <button
        onClick={reset}
        className="mt-4 bg-white/[0.04] border border-white/[0.08] rounded-md px-4 py-1.5 text-slate-400 text-xs cursor-pointer hover:bg-white/[0.08] transition-colors"
      >↩ Resetează la valorile implicite ({PRICE_GRID} / {PRICE_INJECT} / {PRICE_COMMUNITY})</button>
    </div>
  );
}
