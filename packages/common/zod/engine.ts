import z from "zod";

export const BaseMsg = z.object({
  type: z.string(),
  reqId: z.string(),
  data: z.string(),
});

export const UserAuthMsg = BaseMsg.extend({
  type: z.enum(["user-signin", "user-signup"]),
});

export type UserAuthMsgType = z.infer<typeof UserAuthMsg>;

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

export const Messageschema = z.discriminatedUnion("type", [
  UserAuthMsg,
  OpenOrderMsg,
  CloseOrderMsg,
  GetAssetBalMsg,
  GetUserBalMsg,
  PriceUpdateMsg,
]);

export type MessageType = z.infer<typeof Messageschema>;
