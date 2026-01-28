import express from "express";
import { config } from "dotenv";
import cron from "node-cron";
import cookieParser from "cookie-parser";


import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import coordinatorRoutes from "./routes/coordinator.route.js";
import settingsRoutes from "./routes/settings.route.js";
import adminRoutes from "./routes/admin.route.js";
import scheduleRoutes from "./routes/schedule.route.js"
import trackerRoutes from "./routes/Tracker.routes.js";
import cors from "cors";

import errorHandler from "./utils/errorHandler.js";

import { refreshProfiles } from "./utils/cron.js";

config();

const app = express();

const CRON_TIMING = process.env.CRON_TIMING || "0 */2 * * *";
cron.schedule(CRON_TIMING, async () => {
  console.log("==============Refreshing profiles==============");
  await refreshProfiles();
  console.log("==============Refreshed  profiles==============");
});

app.use(express.json({ limit: "20mb" }));
app.use(
  cors({
    origin: ["https://cpbytestudentportal.netlify.app",
      "http://localhost:5173"
    ],
    credentials: true,
  })
);

app.use(cookieParser());

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