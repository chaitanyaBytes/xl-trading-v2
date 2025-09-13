import express from "express";
import {
  openOrder,
  getOrderHistory,
  getPositions,
  closePosition,
} from "../controllers/trade";
import { authMiddleware } from "../middleware/authMiddlware";

const tradeRouter = express.Router();

tradeRouter.use(authMiddleware);

tradeRouter.post("/order", openOrder);

tradeRouter.get("/orders", getOrderHistory);

tradeRouter.get("/positions", getPositions);

tradeRouter.post("/positions/:positionId/close", closePosition);

export default tradeRouter;
