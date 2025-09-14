export interface AssetPrice {
  askPrice: bigint;
  bidPrice: bigint;
  decimals: number;
}

export type Asset = "SOL_USDC" | "ETH_USDC" | "BTC_USDC";

export interface UserBalance {
  emailId: string;
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
