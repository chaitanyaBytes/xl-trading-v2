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
import { fieldsToObjects, type StreamRead } from "./utils";
import { th } from "zod/locales";
import { resolve } from "bun";

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

  private async initializeConsumerGroups() {
    console.log("Initialising consumer groups...");

    await streamHelpers.createConsumerGroup(
      QUEUE_NAMES.TRADE_RECEIVE,
      CONSUMER_GROUPS.ENGINE
    );

    await streamHelpers.createConsumerGroup(
      QUEUE_NAMES.WALLET_RECEIVE,
      CONSUMER_GROUPS.ENGINE
    );
    await streamHelpers.createConsumerGroup(
      QUEUE_NAMES.PRICE_UPDATES,
      CONSUMER_GROUPS.ENGINE
    );

    console.log("Consumer groups initialized");
  }

  async stop() {
    this.isRunning = false;
    console.log("Tradnig engine stopped");
  }

  private async processTradeStream() {
    const consumerName = `engine-trade-${Date.now()}`;

    while (this.isRunning) {
      try {
        const result = (await streamHelpers.readFromStreamGroup(
          QUEUE_NAMES.TRADE_RECEIVE,
          CONSUMER_GROUPS.ENGINE,
          consumerName,
          1,
          5000
        )) as StreamRead | null;

        if (!result || result.length === 0) continue;

        for (const [, entries] of result) {
          for (const [id, fields] of entries) {
            try {
              const kv = fieldsToObjects(fields);
              const payload = kv["data"] ?? "{}";
              const tradeData = JSON.parse(payload);

              console.log("Processing trade: ", tradeData);

              await this.executeTrade(tradeData);

              await streamHelpers.ackMessage(
                QUEUE_NAMES.TRADE_RECEIVE,
                CONSUMER_GROUPS.ENGINE,
                id
              );

              console.log(`Trade ${id} processed and acknowledged`);
            } catch (error) {
              console.error(`Error in processing trade ${id}: `, error);
            }
          }
        }
      } catch (error) {
        console.error("Error reading trade stream: ", error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private async processWalletStream() {
    const consumerName = `engine-wallet-${Date.now()}`;

    while (this.isRunning) {
      try {
        const result = (await streamHelpers.readFromStreamGroup(
          QUEUE_NAMES.WALLET_RECEIVE,
          CONSUMER_GROUPS.ENGINE,
          consumerName,
          1,
          5000
        )) as StreamRead | null;

        if (!result || result.length === 0) continue;

        for (const [, entries] of result) {
          for (const [id, fields] of entries) {
            try {
              const kv = fieldsToObjects(fields);
              const payload = kv["data"] ?? "{}";
              const walletData = JSON.parse(payload);

              console.log("Processing wallet update: ", walletData);

              await this.updateWallet(walletData);

              await streamHelpers.ackMessage(
                QUEUE_NAMES.WALLET_RECEIVE,
                CONSUMER_GROUPS.ENGINE,
                id
              );

              console.log(`Wallet update ${id} processed`);
            } catch (error) {
              console.log(`Error processing wallet ${id}: ${error}`);
            }
          }
        }
      } catch (error) {
        console.error("Error reading trade stream: ", error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private async proccessPriceStream() {
    let lastId = "$";

    while (this.isRunning) {
      try {
        const result = (await streamHelpers.readFromStream(
          QUEUE_NAMES.PRICE_UPDATES,
          lastId,
          10
        )) as StreamRead;

        if (result && result.length > 0) {
          for (const [, entries] of result) {
            for (const [id, fields] of entries) {
              const kv = fieldsToObjects(fields);
              const payload = kv["data"] ?? "{}";
              const priceData = JSON.parse(payload);

              console.log("Price Data: ", priceData);

              await this.handlePriceUpdate(priceData);
              lastId = id;
            }
          }
        } else {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error("Error in processing price stream: ", error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private async executeTrade(trade: any) {
    try {
      console.log(
        `Executing ${trade.side} ${trade.quantity} ${trade.symbol} at ${trade.price}`
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

      await streamHelpers.addToStream(QUEUE_NAMES.SENDER, {
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
        this.userBalanceStore.initializeUserBalance(
          wallet.emailId,
          BigInt(wallet.amount)
        );
      } else if (wallet.type === "update") {
        // Handle balance updates
        const currentBalance = this.userBalanceStore.getBalance(wallet.emailId);
        if (currentBalance) {
          console.log(`Current balance: ${currentBalance.availableBalance}`);
        }
      }
    } catch (error) {
      console.error("error updating wallet: ", error);
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
