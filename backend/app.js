import express from "express";
import { config } from "dotenv";
import cron from "node-cron";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";


import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import coordinatorRoutes from "./routes/coordinator.route.js";
import settingsRoutes from "./routes/settings.route.js";
import adminRoutes from "./routes/admin.route.js";
import scheduleRoutes from "./routes/schedule.route.js"
import trackerRoutes from "./routes/Tracker.routes.js";
import cors from "cors";

import errorHandler from "./utils/errorHandler.js";
import requestIdMiddleware from "./middlewares/requestId.js";

import { refreshProfiles } from "./utils/cron.js";

config();

const app = express();

app.use(requestIdMiddleware);

app.set('trust proxy', 1);

// Enable ETag for conditional responses (304 Not Modified)
app.set('etag', 'strong');

// Response compression — must be first to compress all downstream output
app.use(compressionMiddleware);

// Helmet — tuned for API: disable browser-only headers that add latency/bytes
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));

// rate limiting 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const CRON_TIMING = process.env.CRON_TIMING || "0 */4 * * *";
cron.schedule(CRON_TIMING, async () => {
  console.log("==============Refreshing profiles==============");
  await refreshProfiles();
  console.log("==============Refreshed  profiles==============");
});

// Reduced from 20mb → 5mb: still handles base64 image uploads,
// but reduces buffer allocation pressure for the 99% of requests < 1KB
app.use(express.json({ limit: "5mb" }));

// Pre-compute allowed origins as a Set for O(1) lookups instead of Array.indexOf
const allowed = new Set(
  (process.env.ALLOWED_ORIGINS || "http://localhost:5173,https://cpbytestudentportal.netlify.app").split(',')
);
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (!allowed.has(origin)) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(cookieParser());

// Cache-Control headers for all routes
app.use(cacheControl);

app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/user", userRoutes);

app.use("/api/v1/coordinator", coordinatorRoutes);

app.use("/api/v1/settings", settingsRoutes);

app.use("/api/v1/admin", adminRoutes)

app.use("/api/v1/schedule", scheduleRoutes)

app.use("/api/v1/Tracker", trackerRoutes);

app.get("/api/v1/health", (req, res)=>{

  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date(),
  });

})

app.use(errorHandler);

app.get("/api/v1/delete", (req, res)=>{

res.status(200).json({
  "message" : "User deleted successfully"
})
})

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running on Port ${PORT}`));