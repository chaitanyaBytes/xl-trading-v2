import express, { type Request, type Response } from "express";

const assetRouter = express.Router();

assetRouter.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    assets: [
      {
        symbol: "SOL_USDC",
        name: "solana",
        decimals: 6,
      },
      {
        symbol: "BTC_USDC",
        name: "bitcoin",
        decimals: 6,
      },
      {
        symbol: "ETH_USDC",
        name: "etheruem",
        decimals: 6,
      },
    ],
  });
});

export default assetRouter;
