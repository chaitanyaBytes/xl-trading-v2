import {
  QUEUE_NAMES,
  streamHelpers,
  redisClient,
  createOrderSchema,
  type CreateOrder,
} from "@repo/common";
import type { Request, Response } from "express";
import { responseLoopObj } from "../utils/responseLoop";

// place market or limit order
export const openOrder = async (req: Request, res: Response) => {
  const startTime = Date.now();
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

    const orderData: CreateOrder = validation.data!;

    if (orderData.orderType === "limit" && !orderData.limitPrice) {
      res.status(400).json({
        success: false,
        error: "Limit price required for limit orders",
      });
      return;
    }

    const reqId = Date.now().toString() + crypto.randomUUID();

    await streamHelpers.addToStream(QUEUE_NAMES.REQUEST_QUEUE, {
      reqId: reqId,
      type: "open-order",
      data: { userId: userEmail, orderData },
    });

    console.log(`Order ${reqId} submitted to trade stream`);

    const response = await responseLoopObj.waitForResposne(reqId);

    const { order, orderId } = JSON.parse(response!);
    console.log(orderId, order);

    res.status(200).json({
      success: true,
      data: {
        status: orderData.orderType === "limit" ? "pending" : "filled",
        message:
          orderData.orderType === "limit"
            ? "limit order placed"
            : "market order placed",
        orderId: orderId,
        order: order,
        timestamp: Date.now(),
        endTime: Date.now() - startTime,
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

// cancel pending limit order
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
      type: "cancel-order",
      data: { emailId: userEmail, orderId },
    });

    console.log(`cancel order req for ${orderId} submitted`);

    const response = await responseLoopObj.waitForResposne(reqId);

    // const {} = JSON.parse(response!);

    res.status(200).json({
      success: true,
      data: {
        orderId,
        message: "Limit Order Cancelled",
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

// Close an open position
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

    const reqId = Date.now().toString() + crypto.randomUUID();

    await streamHelpers.addToStream(QUEUE_NAMES.REQUEST_QUEUE, {
      type: "close-position",
      reqId,
      data: { emailId: userEmail, positionId },
    });

    console.log(`Close position req submitted for position ${positionId}`);

    const response = await responseLoopObj.waitForResposne(reqId);

    res.status(200).json({
      success: true,
      data: {
        positionId,
        message: "Position closed",
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
