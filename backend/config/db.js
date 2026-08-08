import { PrismaClient } from "@prisma/client";
import logger from "./logger.js";

const prismaRaw = new PrismaClient();

const prisma = prismaRaw.$extends({
  query: {
    async $allOperations({ model, operation, args, query }) {
      const start = Date.now();
      try {
        const result = await query(args);
        return result;
      } finally {
        const duration = Date.now() - start;
        logger.info(`${model || "General"}.${operation}`, {
          model,
          operation,
          durationMs: duration
        });
      }
    }
  }
});

export default prisma;
