import {
  QUEUE_NAMES,
  streamHelpers,
  redisClient,
  createOrderSchema,
  type CreateOrder,
  type Order,
} from "@repo/common";
import type { Request, Response } from "express";

// Place a new trade order
export const openOrder = async (req: Request, res: Response) => {
  const userEmail = req.user?.email;

  if (!userEmail) {
    res.status(401).json({
      success: false,
      error: "User not authenticated",
    });
    return;
  }

  try {
    const validation = createOrderSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(411).json({
        success: false,
        error: `Invalid input: ${validation.error}`,
      });
      return;
    }

    const order: CreateOrder = validation.data!;

    // Validate order type specific fields
    if (order.orderType === "limit" && !order.limitPrice) {
      res.status(400).json({
        success: false,
        error: "Limit price required for limit orders",
      });
      return;
    }

    // Generate unique order ID
    const orderId = `order_${Date.now()}_${crypto.randomUUID()}`;
    const reqId = Date.now().toString() + crypto.randomUUID();

    // Create order object
    const orderData: Order = {
      orderId,
      emailId: userEmail,
      asset: order.asset,
      side: order.side, // "buy" or "sell"
      orderType: order.orderType, // "market" or "limit"
      size: BigInt(order.size), // Convert to string for Redis
      leverage: order.leverage,
      limitPrice: order.limitPrice ? BigInt(order.limitPrice) : undefined,
      status: "pending",
      timestamp: Date.now(),
    };

    // Send order to trade_receive stream for processing by engine
    await streamHelpers.addToStream(QUEUE_NAMES.REQUEST_QUEUE, {
      reqId: reqId,
      type: "trade-open",
      data: orderData,
    });

    console.log(`Order ${orderId} submitted to trade stream`);

    // Return immediate response with order ID
    res.status(200).json({
      success: true,
      data: {
        orderId,
        status: "submitted",
        message: "Order submitted for processing",
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({
      success: false,
      error: `Error placing order: ${error}`,
    });
  }
};

// Get user's order history
export const getOrderHistory = async (req: Request, res: Response) => {
  const userEmail = req.user?.email;

  if (!userEmail) {
    res.status(401).json({
      success: false,
      error: "User not authenticated",
    });
    return;
  }

  try {
    // Query order history from Redis
    const ordersKey = `user_orders:${userEmail}`;
    const orders = await redisClient.lrange(ordersKey, 0, -1);

    const orderHistory = orders.map((order) => JSON.parse(order));

    res.status(200).json({
      success: true,
      data: {
        orders: orderHistory,
        count: orderHistory.length,
      },
    });
  } catch (error) {
    console.error("Error getting order history:", error);
    res.status(500).json({
      success: false,
      error: `Error getting order history: ${error}`,
    });
  }
};

// Get user's positions
export const getPositions = async (req: Request, res: Response) => {
  const userEmail = req.user?.email;

  if (!userEmail) {
    res.status(401).json({
      success: false,
      error: "User not authenticated",
    });
    return;
  }

  try {
    // Query positions from Redis
    const positionsKey = `user_positions:${userEmail}`;
    const positions = await redisClient.lrange(positionsKey, 0, -1);

    const userPositions = positions.map((pos) => JSON.parse(pos));

    res.status(200).json({
      success: true,
      data: {
        positions: userPositions,
        count: userPositions.length,
      },
    });
  } catch (error) {
    console.error("Error getting positions:", error);
    res.status(500).json({
      success: false,
      error: `Error getting positions: ${error}`,
    });
  }
};

export const cancelPendingOrder = async (req: Request, res: Response) => {
  const userEmail = req.user?.email;

  if (!userEmail) {
    res.status(401).json({
      success: false,
      error: "User not authenticated",
    });
    return;
  }

  try {
    const { orderId } = req.params;

    if (!orderId) {
      res.status(400).json({
        success: false,
        error: "Order ID is required",
      });
      return;
    }

    const reqId = Date.now.toString() + crypto.randomUUID();

    await streamHelpers.addToStream(QUEUE_NAMES.REQUEST_QUEUE, {
      reqId,
      type: "order-cancel",
      data: { emailId: userEmail, orderId },
    });

    console.log(`cancel order req for ${orderId} submitted`);

    res.status(200).json({
      success: true,
      data: {
        orderId,
        status: "submitted",
        message: "Cancel order submitted for processing",
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.log("Error in cancelling the order: ", error);
    res.status(500).json({
      success: false,
      error: `Error cancelling order: ${error}`,
    });
  }
};

// Close a position
export const closePosition = async (req: Request, res: Response) => {
  const userEmail = req.user?.email;
  const { positionId } = req.params;

  if (!userEmail) {
    res.status(401).json({
      success: false,
      error: "User not authenticated",
    });
    return;
  }

  try {
    if (!positionId) {
      res.status(400).json({
        success: false,
        error: "Position ID required",
      });
      return;
    }

    // Generate close order
    const reqId = Date.now().toString() + crypto.randomUUID();

    // Send close order to trade_receive stream
    await streamHelpers.addToStream(QUEUE_NAMES.REQUEST_QUEUE, {
      type: "position-close",
      reqId,
      data: { emailId: userEmail, positionId },
    });

    console.log(`Close position req submitted for position ${positionId}`);

    res.status(200).json({
      success: true,
      data: {
        positionId,
        status: "submitted",
        message: "close position submitted for processing",
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error("Error closing position:", error);
    res.status(500).json({
      success: false,
      error: `Error closing position: ${error}`,
    });
  }
};
