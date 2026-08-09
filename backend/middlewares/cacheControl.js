/**
 * Cache-Control header middleware.
 * Applies appropriate caching policies based on route patterns
 * to reduce redundant round-trips for semi-static data.
 *
 * - Leaderboard/ranking data: cached for 60s
 * - Schedule/events: cached for 300s
 * - Health check: never cached
 * - All other GET requests: must revalidate (ETag-based)
 * - Non-GET requests: never cached
 */

// Route patterns and their cache durations (seconds)
const cacheRules = [
  { pattern: /\/health$/, value: "no-store" },
  { pattern: /\/getTop/, value: "public, max-age=60, stale-while-revalidate=30" },
  { pattern: /\/getAll/, value: "public, max-age=60, stale-while-revalidate=30" },
  { pattern: /\/monthEvents/, value: "public, max-age=300, stale-while-revalidate=60" },
];

const cacheControl = (req, res, next) => {
  // Only cache GET requests
  if (req.method !== "GET") {
    res.set("Cache-Control", "no-store");
    return next();
  }

  // Check route-specific rules
  for (const rule of cacheRules) {
    if (rule.pattern.test(req.path)) {
      res.set("Cache-Control", rule.value);
      return next();
    }
  }

  // Default for GET: allow conditional requests via ETag
  res.set("Cache-Control", "no-cache");
  return next();
};

export default cacheControl;
