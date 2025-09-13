import z from "zod";

export const ASSETS = ["SOL_USDC", "BTC_USDC", "ETH_USDC"];

export const createOrderSchema = z
  .object({
    asset: z.enum(ASSETS),
    side: z.enum(["buy", "sell"]),
    orderType: z.enum(["market", "limit"]),
    size: z.string().refine((val) => {
      try {
        BigInt(val);
        return true;
      } catch {
        return false;
      }
    }, "Invalid bigint"),
    leverage: z
      .number()
      .min(1, "Leverage must be at least 1x")
      .max(100, "Leverage cannot exceed 100x")
      .int("Leverage must be a whole number"),
    limitPrice: z
      .string()
      .optional()
      .refine((val) => {
        if (!val) return true;
        try {
          const price = BigInt(val);
          return price > 0n;
        } catch {
          return false;
        }
      }, "Limit price must be a valid positive number"),
  })
  .refine(
    (data) => {
      if (data.orderType === "limit" && !data.limitPrice) {
        return false;
      }
      return true;
    },
    {
      message: "Limit price is required for limit orders",
      path: ["limitPrice"],
    }
  );

export type CreateOrder = z.infer<typeof createOrderSchema>;

export const closeOrderSchema = z.object({ orderId: z.string() });

export type CloseOrder = z.infer<typeof closeOrderSchema>;

export const closePositionSchema = z.object({ positionId: z.string() });

export type ClosePosition = z.infer<typeof closePositionSchema>;
