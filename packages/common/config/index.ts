export const config = {
  backend: {
    DEVELOPMENT_URL: process.env.DEVELOPMENT_URL,
    PRODUCTION_URL: process.env.PRODUCTION_URL,
    PORT: process.env.PORT,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  },
  resend: {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  },
  redis: {
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  },
  kafka: {
    KAFKA_URL: process.env.KAFKA,
  },
  backpack: {
    BACKPACK_URL: process.env.BACKPACK_URL,
  },
  database: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
};
