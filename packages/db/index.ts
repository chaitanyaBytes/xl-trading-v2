// src/lib/prisma.ts

import { PrismaClient } from "@prisma/client";

// Declare a global variable for PrismaClient in development to prevent multiple instances
// during hot-reloading, which can happen in frameworks like Next.js.
// declare global {
//   var prisma: PrismaClient | undefined;
// }

// let prisma: PrismaClient;

// if (process.env.NODE_ENV === "production") {
//   // In production, create a new instance directly.
//   prisma = new PrismaClient();
// } else {
//   // In development, use a global variable to reuse the instance
//   // or create a new one if it doesn't exist.
//   if (!global.prisma) {
//     global.prisma = new PrismaClient();
//   }
//   prisma = global.prisma;
// }

const prisma = new PrismaClient();

export default prisma;
