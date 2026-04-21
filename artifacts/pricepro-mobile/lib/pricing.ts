// Pricing/win-rate/margin formulas — verbatim port from artifacts/price-pro/src/pages/QuoteDetails.tsx.

export function baselineWinRate(customerId: number, productId: number): number {
  const hash = ((customerId * 2654435761) ^ (productId * 2246822519)) >>> 0;
  return (hash % 4) + 2;
}

export function calcWinRate(
  multiplier: number,
  customerId: number,
  productId: number,
  quantity: number,
): number {
  const baseline = baselineWinRate(customerId, productId);
  const qtyPenalty = 1 / (1 + 0.002 * quantity);
  const rate = baseline * qtyPenalty * Math.exp(-2.5 * (multiplier - 1.0));
  return Math.max(0.01, Math.min(98, Math.round(rate * 100) / 100));
}

export function optimalMultiplier(
  customerId: number,
  productId: number,
  quantity: number,
): number {
  let bestMult = 1.0;
  let bestVal = 0;
  for (let m = 10000; m <= 20000; m++) {
    const mult = m / 10000;
    const marginPct = (mult - 1) * 100;
    const wr = calcWinRate(mult, customerId, productId, quantity);
    const marginPerDay = marginPct * (wr / 100);
    if (marginPerDay > bestVal) {
      bestVal = marginPerDay;
      bestMult = mult;
    }
  }
  return bestMult;
}

export function winRateColor(rate: number): string {
  if (rate >= 8) return "#10B981";
  if (rate >= 4) return "#F59E0B";
  return "#EF4444";
}

export function winRateLabel(rate: number): string {
  if (rate >= 10) return "Very Likely";
  if (rate >= 6) return "Likely";
  if (rate >= 4) return "Possible";
  if (rate >= 2) return "Unlikely";
  return "Long Shot";
}

export function formatCurrency(val: number | string | null | undefined): string {
  if (val == null || val === "") return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}
