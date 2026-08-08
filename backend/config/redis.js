import Redis from "ioredis";
import { config } from "dotenv";
import logger from "./logger.js";
config();

let redis = null;
let useMemoryFallback = false;
const memoryStore = new Map();

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1, // fail fast to switch to fallback
      connectTimeout: 3000,
      retryStrategy(times) {
        // Stop retrying after 3 attempts and use fallback
        if (times > 3) {
          useMemoryFallback = true;
          console.warn("Failed to connect to Redis after 3 attempts. Falling back to in-memory session cache.");
          return null; 
        }
        return Math.min(times * 100, 2000);
      }
    });

    redis.on("connect", () => {
      console.log("Connected to Redis Server successfully.");
      useMemoryFallback = false;
    });

    redis.on("error", (err) => {
      console.warn("Redis Server connection issue. Using in-memory fallback session cache.");
      useMemoryFallback = true;
    });
  } catch (err) {
    console.warn("Failed to initialize Redis client. Using in-memory fallback session cache.");
    useMemoryFallback = true;
  }
} else {
  console.log("No REDIS_URL found in environment variables. Using in-memory fallback session cache.");
  useMemoryFallback = true;
}

// Resilient wrapper to mimic standard ioredis operations
const clientWrapper = {
  get: async (key) => {
    let value = null;
    if (useMemoryFallback || !redis) {
      const entry = memoryStore.get(key);
      if (entry) {
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          memoryStore.delete(key);
        } else {
          value = entry.value;
        }
      }
    } else {
      try {
        value = await redis.get(key);
      } catch (err) {
        console.warn("Redis error on get, using memory store fallback:", err.message);
        const entry = memoryStore.get(key);
        if (entry) {
          value = entry.value;
        }
      }
    }

    logger.info(`Cache.${value !== null ? "HIT" : "MISS"}`, {
      key,
      status: value !== null ? "HIT" : "MISS"
    });

    return value;
  },
  set: async (key, value, mode, duration) => {
    if (useMemoryFallback || !redis) {
      let expiresAt = null;
      if (mode === "EX" && typeof duration === "number") {
        expiresAt = Date.now() + duration * 1000;
      }
      memoryStore.set(key, { value: String(value), expiresAt });
      return "OK";
    }
    try {
      return await redis.set(key, value, mode, duration);
    } catch (err) {
      console.warn("Redis error on set, using memory store fallback:", err.message);
      let expiresAt = null;
      if (mode === "EX" && typeof duration === "number") {
        expiresAt = Date.now() + duration * 1000;
      }
      memoryStore.set(key, { value: String(value), expiresAt });
      return "OK";
    }
  },
  del: async (key) => {
    if (useMemoryFallback || !redis) {
      const deleted = memoryStore.has(key);
      memoryStore.delete(key);
      return deleted ? 1 : 0;
    }
    try {
      return await redis.del(key);
    } catch (err) {
      console.warn("Redis error on del, using memory store fallback:", err.message);
      const deleted = memoryStore.has(key);
      memoryStore.delete(key);
      return deleted ? 1 : 0;
    }
  },
  delByPattern: async (pattern) => {
    if (useMemoryFallback || !redis) {
      // Escape special characters and convert glob '*' to regex '.*'
      const regexStr = "^" + pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\\\*/g, ".*") + "$";
      const regex = new RegExp(regexStr);
      let count = 0;
      for (const key of memoryStore.keys()) {
        if (regex.test(key)) {
          memoryStore.delete(key);
          count++;
        }
      }
      return count;
    }
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        return await redis.del(...keys);
      }
      return 0;
    } catch (err) {
      console.warn("Redis error on delByPattern:", err.message);
      return 0;
    }
  }
};

export default clientWrapper;
