import crypto from "crypto";
import logger, { contextStorage } from "../config/logger.js";

export default function requestIdMiddleware(req, res, next) {
  const traceId = req.headers["x-trace-id"] || crypto.randomUUID();
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("x-trace-id", traceId);
  res.setHeader("x-request-id", requestId);
  
  contextStorage.run({ traceId, requestId }, () => {
    const start = Date.now();
    const url = req.originalUrl || req.url;

    // Log the request start
    logger.logRequestStart(traceId, req.method, url);

    // Log the request end on finish
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.logRequestEnd(traceId, res.statusCode, duration); 
    });

    next();
  });
}
