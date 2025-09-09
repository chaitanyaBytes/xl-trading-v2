import {
  UserBalanceStore,
  PositionStore,
  OrderStore,
  type RiskConfig,
} from "./store";
import {
  QUEUE_NAMES,
  CONSUMER_GROUPS,
  streamHelpers,
  redisClient,
} from "@repo/common";

const riskConfig: RiskConfig = {
  maxLeverage: 100,
  maintenanceMarginRate: 0.005, // 0.5%
  minPositionSize: 1000000n,
  maxPositionSize: 1000000000000n,
};

class TradingEngine {
  private isRunning = false;

  private userBalanceStore: UserBalanceStore;
  private positionStore: PositionStore;
  private orderStore: OrderStore;

  constructor() {
    this.userBalanceStore = new UserBalanceStore();
    this.positionStore = new PositionStore(this.userBalanceStore, riskConfig);
    this.orderStore = new OrderStore(this.positionStore, riskConfig);

    console.log("All stores are initialzed successfully");
  }

  async start() {
    this.isRunning = true;
    console.log("Trading engin started");
  }

  async stop() {
    this.isRunning = false;
    console.log("Tradnig engine stopped");
  }

  public getUserBalanceStore(): UserBalanceStore {
    return this.userBalanceStore;
  }

  public getPositionStore(): PositionStore {
    return this.positionStore;
  }

  public getOrderStore(): OrderStore {
    return this.orderStore;
  }
}

const engine = new TradingEngine();

process.on("SIGTERM", async () => {
  console.log("recieved SIGTERM, shutting down gracefully");
  await engine.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("recieved SIGINT, shutting down gracefully");
  await engine.stop();
  process.exit(0);
});

engine.start().catch(console.error);
