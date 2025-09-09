export const DECIMALS = 6;

export interface AssetPrice {
  price: bigint;
  decimals: number;
}

export type Asset = "SOL_USDC" | "ETH_USDC" | "BTC_USDC";

export const latestAssetPrice: Record<Asset, AssetPrice> = {
  SOL_USDC: {
    price: 0n,
    decimals: DECIMALS,
  },
  BTC_USDC: {
    price: 0n,
    decimals: DECIMALS,
  },
  ETH_USDC: {
    price: 0n,
    decimals: DECIMALS,
  },
};
