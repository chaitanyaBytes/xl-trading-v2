import z from "zod";

export const BaseMsg = z.object({
  type: z.string(),
  reqId: z.string(),
  data: z.string(),
});

export const PriceUpdateMsg = BaseMsg.extend({
  type: z.literal("price-update"),
});

export type PriceUpdateMsgType = z.infer<typeof PriceUpdateMsg>;

export const OpenOrderMsg = BaseMsg.extend({
  type: z.literal("open-order"),
});

export type OpenOrderMsgType = z.infer<typeof OpenOrderMsg>;

export const CloseOrderMsg = BaseMsg.extend({
  type: z.literal("close-order"),
});

export type CloseOrderMsgType = z.infer<typeof CloseOrderMsg>;

export const GetAssetBalMsg = BaseMsg.extend({
  type: z.literal("get-asset-bal"),
});

export type GetAssetBalMsgType = z.infer<typeof GetAssetBalMsg>;

export const GetUserBalMsg = BaseMsg.extend({
  type: z.literal("get-user-bal"),
});

export type GetUserBalMsgType = z.infer<typeof GetAssetBalMsg>;

export const UserDepositMsg = BaseMsg.extend({
  type: z.literal("user-deposit"),
});

export type UserDepositMsgType = z.infer<typeof UserDepositMsg>;

export const Messageschema = z.discriminatedUnion("type", [
  UserDepositMsg,
  OpenOrderMsg,
  CloseOrderMsg,
  GetAssetBalMsg,
  GetUserBalMsg,
  PriceUpdateMsg,
]);

export type MessageType = z.infer<typeof Messageschema>;
