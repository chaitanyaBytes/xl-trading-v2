import type { Order, Position, RiskConfig } from "@repo/common/types";
import { PositionStore } from "./positions";

export class OrderStore {
  private userOrders = new Map<string, Order[]>(); // userId -> orders[]
  private allOrders = new Map<string, Order>(); // orderId -> order

  constructor(
    private positions: PositionStore,
    private riskConfig: RiskConfig
  ) {}

  validateOrder(
    order: Order,
    userBalance: bigint
  ): { valid: boolean; error?: string } {
    if (order.leverage > this.riskConfig.maxLeverage) {
      return {
        valid: false,
        error: `Leverage exceeds ${this.riskConfig.maxLeverage}x`,
      };
    }
    if (order.size < this.riskConfig.minPositionSize) {
      return { valid: false, error: "Position size too small" };
    }
    if (order.size > this.riskConfig.maxPositionSize) {
      return { valid: false, error: "Position size too large" };
    }
    if (order.type === "open" && order.executedPrice) {
      const requiredMargin =
        (order.size * order.executedPrice) / BigInt(order.leverage);
      if (userBalance < requiredMargin) {
        return { valid: false, error: "Insufficient margin" };
      }
    }
    return { valid: true };
  }

  executeOrder(
    order: Order,
    executionPrice: bigint
  ): { success: boolean; position?: Position; error?: string } {
    order.executedPrice = executionPrice;
    order.executedAt = Date.now();
    order.status = "filled";
    this.allOrders.set(order.orderId, order);

    if (order.type === "open") {
      const margin = (order.size * executionPrice) / BigInt(order.leverage);

      const position: Position = {
        positionId: crypto.randomUUID(),
        emailId: order.emailId,
        asset: order.asset,
        side: order.side,
        size: order.size,
        openPrice: executionPrice,
        leverage: order.leverage,
        margin,
        status: "open",
        openedAt: Date.now(),
        realizedPnl: 0n,
        liquidationPrice: 0n,
      };

      const opened = this.positions.openPosition(position);
      if (!opened) return { success: false, error: "Insufficient margin" };

      return { success: true, position };
    }

    // TODO: implement close orders
    return {
      success: false,
      error: "Close order execution not implemented yet",
    };
  }
}
