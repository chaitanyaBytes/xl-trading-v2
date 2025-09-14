import express from "express";
import { authMiddleware } from "../middleware/authMiddlware";
import {
  getUsdcBalance,
  getAssetBalance,
  depositUsdc,
} from "../controllers/balance";

const balanceRouter = express.Router();

balanceRouter.use(authMiddleware);
balanceRouter.get("/usdc", getUsdcBalance);
balanceRouter.get("/", getAssetBalance);
balanceRouter.post("/deposit", depositUsdc);

export default balanceRouter;
