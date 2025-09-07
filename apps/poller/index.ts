import { pricePoller } from "./lib/backpack";

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
