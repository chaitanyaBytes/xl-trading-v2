export type Trade = {
  e: string; // Event type
  E: number; // Event time in microseconds
  s: string; // Symbol
  a: string; // Inside ask price
  A: string; // Inside ask quantity
  b: string; // Inside bid price
  B: string; // Inside bid quantity
  u: string; // Update ID of event
  T: number; // Engine timestamp in microseconds
};

export type LivePriceFeed = {
  asset: string;
  bidPrice: bigint;
  askPrice: bigint;
  marketPrice: bigint;
  decimal: number;
  spreadBP: bigint;
};
