import { PrismaClient } from "@prisma/client";

// Singleton pattern prevents multiple PrismaClient instances
// during hot-reloads in development (nodemon)
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    // Only log queries in development, not in production
    log: process.env.NODE_ENV !== "production" ? ["query"] : ["error"],
    // Connection pool tuning for faster DB access
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

export default prisma;
