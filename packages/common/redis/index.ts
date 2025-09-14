import Redis from "ioredis";
import { config } from "../config";

const REDIS_URL = config.redis.REDIS_URL;

export const redisClient = new Redis(REDIS_URL);

export const blockingClient = new Redis(REDIS_URL);

export const pubSubClient = new Redis(REDIS_URL);

export const QUEUE_NAMES = {
  REQUEST_QUEUE: "stream:app:request",
  RESPONSE_QUEUE: "stream:engine:response",
  // WALLET_RECEIVE: "wallet_receive_stream",
  // PRICE_UPDATES: "price_stream",
} as const;

export const CONSUMER_GROUPS = {
  ENGINE: "engine_group",
  ANALYTICS: "analytics_group",
  LOGGING: "logging_group",
} as const;

export const objectsToFields = (payload: any): (string | number)[] => {
  const fields: (string | number)[] = Object.entries(payload)
    .flat()
    .map((e) =>
      typeof e === "object"
        ? JSON.stringify(e, (k, v) => {
            return typeof v === "bigint" ? v.toString() : v;
          })
        : e
    ) as (string | number)[];

  return fields;
};

export const streamHelpers = {
  addToStream: (streamName: string, payload: any) => {
    const fields: (string | number)[] = objectsToFields(payload);

    return redisClient.xadd(
      streamName,
      "MAXLEN",
      "~",
      "10000", // Keep last 10k messages
      "*",
      ...fields,
      "timestamp",
      Date.now().toString()
    );
  },

  createConsumerGroup: async (streamName: string, groupName: string) => {
    try {
      await redisClient.xgroup(
        "CREATE",
        streamName,
        groupName,
        "0",
        "MKSTREAM"
      );
      console.log(
        `Created consumer group: ${groupName} for stream: ${streamName}`
      );
    } catch (error: any) {
      if (error.message.includes("BUSYGROUP")) {
        console.log(
          `Consumer group ${groupName} already exists for ${streamName}`
        );
      } else {
        console.error(`Error creating consumer group:`, error);
      }
    }
  },

  readFromStreamGroup: (
    streamName: string,
    groupName: string,
    consumerName: string,
    count: number = 1,
    blockTime: number = 1000
  ) =>
    redisClient.xreadgroup(
      "GROUP",
      groupName,
      consumerName,
      "COUNT",
      count,
      "BLOCK",
      blockTime,
      "STREAMS",
      streamName,
      ">"
    ),

  ackMessage: (streamName: string, groupName: string, messageId: string) =>
    redisClient.xack(streamName, groupName, messageId),

  readPendingMessages: (
    streamName: string,
    groupName: string,
    consumerName: string
  ) =>
    redisClient.xreadgroup(
      "GROUP",
      groupName,
      consumerName,
      "COUNT",
      "10",
      "STREAMS",
      streamName,
      "0" // Read from beginning of pending
    ),

  readFromStream: (
    streamName: string,
    lastId: string = "$",
    count: number = 100
  ) => redisClient.xread("COUNT", count, "STREAMS", streamName, lastId),

  getStreamInfo: (streamName: string) =>
    redisClient.xinfo("STREAM", streamName),
};

export const cleanup = async () => {
  await redisClient.quit();
  await blockingClient.quit();
  console.log("Redis connections closed");
};
