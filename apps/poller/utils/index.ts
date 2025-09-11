const SPREAD_BASIS_POINTS = 100n; // 100 bps = 1%
const DECIMALS = 6;

export function applySpread(price: bigint): { ask: bigint; bid: bigint } {
  // ask = price * (1 + spread/2)
  // bid = price * (1 - spread/2)

  const halfSpread = SPREAD_BASIS_POINTS / 2n; // 100 bps = 1%
  const ask = (price * (10_000n + halfSpread)) / 10_000n;
  const bid = (price * (10_000n - halfSpread)) / 10_000n;

  return { ask, bid };
}
