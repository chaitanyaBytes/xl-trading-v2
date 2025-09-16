import type { Asset, AssetPrice } from "@repo/common";

export const DECIMALS = 6;

export const latestAssetPrice: Record<Asset, AssetPrice> = {
  SOL_USDC: {
    askPrice: 0n,
    bidPrice: 0n,
    decimals: DECIMALS,
  },
  BTC_USDC: {
    askPrice: 0n,
    bidPrice: 0n,
    decimals: DECIMALS,
  },
  ETH_USDC: {
    askPrice: 0n,
    bidPrice: 0n,
    decimals: DECIMALS,
  },
};
