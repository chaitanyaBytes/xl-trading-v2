import express from "express";
import authRouter from "./auth";
import assetRouter from "./assets";
import balanceRouter from "./balance.ts";
import tradeRouter from "./trade";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/supported-assets", assetRouter);
router.use("/balance", balanceRouter);
router.use("/trade", tradeRouter);

export default router;
