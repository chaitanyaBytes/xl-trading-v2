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
    if (order.executedPrice) {
      const requiredMargin =
        (order.size * order.executedPrice) / BigInt(order.leverage);
      if (userBalance < requiredMargin) {
        return { valid: false, error: "Insufficient margin" };
      }
    }
    return { valid: true };
  }

  addOrder(order: Order): { success: boolean; error?: string } {
    if (this.allOrders.has(order.orderId)) {
      return { success: false, error: "order already exists" };
    }

    if (!order.status) {
      order.status = "pending";
    }

    if (!order.timestamp) {
      order.timestamp = Date.now();
    }

    this.allOrders.set(order.orderId, order);
    this.updateUserOrdersList(order);
    return { success: true };
  }

  executeOrder(
    order: Order,
    executionPrice: bigint
  ): { success: boolean; position?: Position; error?: string } {
    if (order.status !== "pending") {
      return { success: false, error: `Cannot execute ${order.status} order` };
    }

    if (executionPrice <= 0n) {
      return { success: false, error: "Invalid execution price" };
    }

    order.executedPrice = executionPrice;
    order.executedAt = Date.now();
    order.status = "filled";
    this.allOrders.set(order.orderId, order);

    this.updateUserOrdersList(order);

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

  cancelOrder(
    userId: string,
    orderId: string
  ): { success: boolean; error?: string; releasedMargin?: bigint } {
    const order = this.allOrders.get(orderId);

    if (!order) return { success: false, error: "Order not found" };

    if (userId && order.emailId !== userId)
      return { success: false, error: "Unauthorised to cancel" };

    if (order.status !== "pending") {
      return {
        success: false,
        error: "Cannot cancel order with status: " + order.status,
      };
    }

    let releasedMargin = 0n;
    if (order.orderType === "limit" && order.limitPrice) {
      releasedMargin =
        (order.size * order.limitPrice) / (BigInt(order.leverage) * 1000000n);
    }

    order.status = "cancelled";
    order.executedAt = Date.now();
    this.allOrders.set(orderId, order);

    this.updateUserOrdersList(order);

    return {
      success: true,
      releasedMargin: releasedMargin > 0n ? releasedMargin : undefined,
    };
  }

  getOrder(orderId: string): Order | undefined {
    return this.allOrders.get(orderId);
  }

  getUserOrders(userId: string): Order[] {
    return this.userOrders.get(userId) || [];
  }

  private updateUserOrdersList(order: Order): void {
    const userOrders = this.userOrders.get(order.emailId) || [];
    const orderIndex = userOrders?.findIndex(
      (o) => o.orderId === order.orderId
    );

    if (orderIndex !== -1) {
      userOrders[orderIndex] = order;
    } else {
      userOrders.push(order);
    }

    this.userOrders.set(order.emailId, userOrders);
  }
}
