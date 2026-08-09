import compression from "compression";

/**
 * Response compression middleware.
 * Compresses JSON responses with gzip/deflate, typically reducing
 * transfer size by 60-80% for API payloads.
 *
 * - threshold: minimum size (bytes) to compress (skip tiny responses)
 * - level: zlib compression level (6 = good balance of speed vs ratio)
 */
const compressionMiddleware = compression({
  threshold: 512,
  level: 6,
  filter: (req, res) => {
    // Don't compress if the client explicitly opts out
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  },
});

export default compressionMiddleware;
