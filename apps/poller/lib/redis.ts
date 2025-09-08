import Redis from "ioredis";
import { config } from "@repo/common";

export const redis = new Redis(config.redis.REDIS_URL);
