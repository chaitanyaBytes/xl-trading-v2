import {
  depositSchema,
  QUEUE_NAMES,
  redisClient,
  streamHelpers,
} from "@repo/common";
import type { Request, Response } from "express";

// Get user's asset balance (synchronous query)
export const getAssetBalance = async (req: Request, res: Response) => {
  const userEmail = req.user?.email;

  if (!userEmail) {
    res.status(401).json({
      success: false,
      error: "User not authenticated",
    });
    return;
  }

  try {
    // Query the engine's balance store via Redis hash or direct API call
    const balanceKey = `user_balance:${userEmail}`;
    const balanceData = await redisClient.hgetall(balanceKey);

    if (!balanceData || Object.keys(balanceData).length === 0) {
      // Initialize user with zero balance if not found
      res.status(200).json({
        success: true,
        data: {
          emailId: userEmail,
          availableBalance: "0",
          lockedMargin: "0",
          totalBalance: "0",
          lastUpdated: Date.now(),
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        emailId: userEmail,
        availableBalance: balanceData.availableBalance || "0",
        lockedMargin: balanceData.lockedMargin || "0",
        totalBalance: balanceData.totalBalance || "0",
        lastUpdated: parseInt(balanceData.lastUpdated || "0"),
      },
    });
  } catch (error) {
    console.log("Error in getting user asset balance: ", error);
    res.status(500).json({
      success: false,
      error: `Error in getting user asset balance: ${error}`,
    });
  }
};

// Get user's USDC balance specifically
export const getUsdcBalance = async (req: Request, res: Response) => {
  const userEmail = req.user?.email;

  if (!userEmail) {
    res.status(401).json({
      success: false,
      error: "User not authenticated",
    });
    return;
  }

  try {
    const balanceKey = `user_balance:${userEmail}`;
    const availableBalance = await redisClient.hget(
      balanceKey,
      "availableBalance"
    );

    res.status(200).json({
      success: true,
      data: {
        asset: "USDC",
        balance: availableBalance || "0",
        decimals: 6,
      },
    });
  } catch (error) {
    console.log("Error in getting USDC balance: ", error);
    res.status(500).json({
      success: false,
      error: `Error in getting USDC balance: ${error}`,
    });
  }
};

export const depositUsdc = async (req: Request, res: Response) => {
  const userEmail = req.user?.email;

  if (!userEmail) {
    res.status(401).json({
      success: false,
      error: "User not authenticated",
    });
    return;
  }

  try {
    const validation = depositSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: "Invalid deposit amount: " + validation.error,
      });
      return;
    }

    const { amount } = validation.data;

    const reqId = Date.now().toString() + crypto.randomUUID();

    const data = {
      asset: "USDC",
      amount: BigInt(Math.round(amount * 1000000)).toString(),
      decimals: 6,
    };

    await streamHelpers.addToStream(QUEUE_NAMES.REQUEST_QUEUE, {
      type: "deposit",
      reqId,
      data: { emailId: userEmail, data },
    });

    console.log(`Deposit request ${reqId} submitted to wallet stream`);

    res.status(200).json({
      success: true,
      data: {
        reqId,
        amount,
        asset: "USDC",
        status: "submitted",
        message: "Deposit request submitted for processing",
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.log("error in depositing usdc: ", error);
    res.status(500).json({
      success: false,
      error: "Error in depositing usdc",
    });
  }
};
