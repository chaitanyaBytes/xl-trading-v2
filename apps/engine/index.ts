import { UserBalanceStore, PositionStore, OrderStore } from "./store";
import {
  QUEUE_NAMES,
  CONSUMER_GROUPS,
  streamHelpers,
  redisClient,
  type RiskConfig,
  type Asset,
  type AssetPrice,
} from "@repo/common";
import { fieldsToObjects, type StreamRead } from "./utils";

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

  private readonly DECIMALS = 6;

  private latestAssetPrice: Record<Asset, AssetPrice> = {
    SOL_USDC: {
      askPrice: 0n,
      bidPrice: 0n,
      decimals: this.DECIMALS,
    },
    BTC_USDC: {
      askPrice: 0n,
      bidPrice: 0n,
      decimals: this.DECIMALS,
    },
    ETH_USDC: {
      askPrice: 0n,
      bidPrice: 0n,
      decimals: this.DECIMALS,
    },
  };

  private lastSnapshot: number = Date.now();
  private readonly dbName = "xltraiding-snapshot";
  private readonly streamKey = "";

  constructor() {
    this.userBalanceStore = new UserBalanceStore();
    this.positionStore = new PositionStore(this.userBalanceStore, riskConfig);
    this.orderStore = new OrderStore(this.positionStore, riskConfig);

    console.log("All stores are initialzed successfully");
  }

  async start() {
    this.isRunning = true;
    console.log("Trading engine started");

    await this.initializeConsumerGroups();

    await this.processRequestStream();

    // await Promise.all([
    //   this.proccessPriceStream(),
    //   this.processTradeStream(),
    //   this.processWalletStream(),
    // ]);
  }

  private async initializeConsumerGroups() {
    console.log("Initialising consumer group..");

    await streamHelpers.createConsumerGroup(
      QUEUE_NAMES.REQUEST_QUEUE,
      CONSUMER_GROUPS.ENGINE
    );

    console.log("Consumer group initialized");
  }

  async stop() {
    this.isRunning = false;
    console.log("Tradnig engine stopped");
  }

  private async processRequestStream() {
    const consumerName = `engine-${Date.now()}`;

    while (this.isRunning) {
      console.log("waiting for incoming request");
      try {
        const result = (await streamHelpers.readFromStreamGroup(
          QUEUE_NAMES.REQUEST_QUEUE,
          CONSUMER_GROUPS.ENGINE,
          consumerName,
          1,
          1000
        )) as StreamRead | null;

        if (!result || result.length === 0) continue;

        for (const [, entries] of result) {
          for (const [id, fields] of entries) {
            try {
              const kv = fieldsToObjects(fields);
              const type = kv["type"];
              const reqId = kv["reqId"];
              const data = kv["data"];
              const parsedData = JSON.parse(data!);

              console.log("reqId", reqId, "type:", type);
              switch (type!) {
                case "price-update":
                  console.log("price data: ", parsedData);
                  // await this.handlePriceUpdate(priceData);
                  break;
                default:
                  console.log("data: ", parsedData);
                  break;
              }

              await streamHelpers.ackMessage(
                QUEUE_NAMES.REQUEST_QUEUE,
                CONSUMER_GROUPS.ENGINE,
                id
              );
            } catch (error) {
              console.error("Error processing message:", error);
            }
          }
        }
      } catch (error) {
        console.log("Error reading request from request stream");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private async executeTrade(trade: any) {
    try {
      console.log(
        `Executing ${trade.side} ${trade.quantity} ${trade.asset} at ${trade.price}`
      );

      const validation = this.orderStore.validateOrder(
        trade,
        BigInt(trade.userBalance || 0)
      );

      if (!validation.valid) {
        console.error(`Order Validation failed: ${validation.error}`);
        return;
      }

      const execution = this.orderStore.executeOrder(
        trade,
        BigInt(trade.price || 0)
      );

      if (!execution.success) {
        console.error(`Order execution failed: ${execution.error}`);
        return;
      }

      // Persist order and position data to Redis
      if (execution.position) {
        await this.persistPositionToRedis(execution.position);
      }
      await this.persistOrderToRedis(trade);

      await streamHelpers.addToStream(QUEUE_NAMES.RESPONSE_QUEUE, {
        type: "trade_result",
        tradeId: trade.orderId,
        status: "executed",
        position: execution.position,
        timestamp: Date.now(),
      });

      console.log("Trade executed successfully");
    } catch (error) {
      console.error("Error Executing Trade: ", error);
    }
  }

  private async updateWallet(wallet: any) {
    try {
      console.log(
        `updating wallet: ${wallet.emailId} balance ${wallet.balance}`
      );

      // Initialize or update user balance
      if (wallet.type === "deposit") {
        const balance = this.userBalanceStore.initializeUserBalance(
          wallet.emailId,
          BigInt(wallet.amount)
        );

        // Persist to Redis for server queries
        await this.persistBalanceToRedis(balance);
      } else if (wallet.type === "update") {
        // Handle balance updates
        const currentBalance = this.userBalanceStore.getBalance(wallet.emailId);
        if (currentBalance) {
          console.log(`Current balance: ${currentBalance.availableBalance}`);
          await this.persistBalanceToRedis(currentBalance);
        }
      }
    } catch (error) {
      console.error("error updating wallet: ", error);
    }
  }

  // Helper method to persist balance data to Redis
  private async persistBalanceToRedis(balance: any) {
    try {
      const balanceKey = `user_balance:${balance.emailId}`;
      await redisClient.hset(balanceKey, {
        availableBalance: balance.availableBalance.toString(),
        lockedMargin: balance.lockedMargin.toString(),
        totalBalance: balance.totalBalance.toString(),
        lastUpdated: balance.lastUpdated.toString(),
      });

      // Set expiration (optional) - 24 hours
      await redisClient.expire(balanceKey, 86400);

      console.log(`Balance persisted to Redis for ${balance.emailId}`);
    } catch (error) {
      console.error("Error persisting balance to Redis:", error);
    }
  }

  // Helper method to persist order data to Redis
  private async persistOrderToRedis(order: any) {
    try {
      const ordersKey = `user_orders:${order.emailId}`;

      // Add order to user's order list (most recent first)
      await redisClient.lpush(
        ordersKey,
        JSON.stringify({
          orderId: order.orderId,
          asset: order.asset,
          side: order.side,
          orderType: order.orderType,
          size: order.size,
          leverage: order.leverage,
          executedPrice: order.executedPrice?.toString(),
          status: order.status,
          timestamp: order.timestamp,
          executedAt: order.executedAt,
        })
      );

      // Keep only last 100 orders
      await redisClient.ltrim(ordersKey, 0, 99);

      // Set expiration - 30 days
      await redisClient.expire(ordersKey, 2592000);

      console.log(`Order ${order.orderId} persisted to Redis`);
    } catch (error) {
      console.error("Error persisting order to Redis:", error);
    }
  }

  // Helper method to persist position data to Redis
  private async persistPositionToRedis(position: any) {
    try {
      const positionsKey = `user_positions:${position.emailId}`;

      // Store position data
      const positionData = {
        positionId: position.positionId,
        asset: position.asset,
        side: position.side,
        size: position.size.toString(),
        openPrice: position.openPrice.toString(),
        leverage: position.leverage,
        margin: position.margin.toString(),
        status: position.status,
        realizedPnl: position.realizedPnl.toString(),
        openedAt: position.openedAt,
        closedAt: position.closedAt,
        closedPrice: position.closedPrice?.toString(),
        liquidationPrice: position.liquidationPrice.toString(),
      };

      if (position.status === "open") {
        // Add to active positions
        await redisClient.lpush(positionsKey, JSON.stringify(positionData));
      } else {
        // Update existing position when closed
        const positions = await redisClient.lrange(positionsKey, 0, -1);

        for (let i = 0; i < positions.length; i++) {
          const pos = JSON.parse(positions[i]!);
          if (pos.positionId === position.positionId) {
            await redisClient.lset(
              positionsKey,
              i,
              JSON.stringify(positionData)
            );
            break;
          }
        }
      }

      // Set expiration - 30 days
      await redisClient.expire(positionsKey, 2592000);

      console.log(`Position ${position.positionId} persisted to Redis`);
    } catch (error) {
      console.error("Error persisting position to Redis:", error);
    }
  }

  private async handlePriceUpdate(priceData: any) {
    try {
      // Check if any pending orders should be triggered or positions liquidated
      for (const update of priceData) {
        const price = BigInt(update.price);
        console.log(
          `${update.asset}: $${Number(price) / 10 ** update.decimals}`
        );

        // TODO: Check for liquidations using position store
        // TODO: Trigger limit orders
        // TODO: Update unrealized PnL
      }
    } catch (error) {
      console.error("Error handling price update:", error);
    }
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
