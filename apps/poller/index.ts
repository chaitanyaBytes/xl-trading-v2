import { DECIMALS, pricePoller } from "./lib/backpack";
import { redis } from "./lib/redis";
import { latestPrices } from "./store";

const PAIRS = ["BTC_USDC", "SOL_USDC", "ETH_USDC"];

const startPricePoller = async () => {
  try {
    console.log("staring price poller");
    pricePoller(PAIRS);
  } catch (error: any) {
    console.log("Error starting price poller: ", error);
    process.exit(1);
  }
};

process.on("SIGTERM", async () => {
  console.log("\nRecieved SIGTERM. shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("\nRecieved SIGINT. shutting down gracefully");
  process.exit(0);
});

startPricePoller().catch(console.error);

setInterval(async () => {
  const price_updates = Object.entries(latestPrices).map(([symbol, data]) => ({
    asset: symbol.split("_")[0]!,
    price: data.price,
    decimals: DECIMALS,
  }));

  if (price_updates.length > 0) {
    const payload = price_updates;
    console.log("payload: ", payload);

    // pass to redis streams
    await redis.xadd(
      "price_stream",
      "MAXLEN",
      "~",
      "10000",
      "*",
      "data",
      JSON.stringify(payload)
    );
  }
}, 100);
