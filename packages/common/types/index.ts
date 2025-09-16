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

export interface AssetPrice {
  askPrice: bigint;
  bidPrice: bigint;
  decimals: number;
}

export type Asset = "SOL_USDC" | "ETH_USDC" | "BTC_USDC";

export interface UserBalance {
  email: string;
  availableBalance: bigint;
  lockedMargin: bigint;
  totalBalance: bigint; // available + locked
  lastUpdated: number;
}

export interface Order {
  orderId: string;
  emailId: string;
  asset: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  size: bigint;
  leverage: number;
  limitPrice?: bigint;
  executedPrice?: bigint;
  status: "pending" | "filled" | "cancelled" | "rejected";
  timestamp: number;
  executedAt?: number;
}

export interface Position {
  positionId: string;
  emailId: string;
  asset: string;
  side: "buy" | "sell";
  size: bigint;
  openPrice: bigint;
  leverage: number;
  margin: bigint;
  status: "open" | "closed";
  realizedPnl: bigint;
  openedAt: number;
  closedAt?: number;
  closedPrice?: bigint;

  stopLoss?: bigint;
  takeProfit?: bigint;
  liquidationPrice: bigint;
}

export interface RiskConfig {
  maxLeverage: number;
  maintenanceMarginRate: number;
  minPositionSize: bigint;
  maxPositionSize: bigint;
}

export type EngineResponseType = {
  type: string;
  reqId: string;
  data: any;
};
