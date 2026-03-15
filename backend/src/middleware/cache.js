const redis = require('../config/redis');

/**
 * Redis Cache Middleware
 * Caches GET responses with a configurable TTL
 * @param {number} ttlSeconds - Time-to-live in seconds (default 300 = 5 min)
 */
function cacheMiddleware(ttlSeconds = 300) {
  return async (req, res, next) => {
    // Skip caching if Redis is not available
    if (!redis || redis.status !== 'ready') {
      return next();
    }

    // Build cache key from URL + user id (if authenticated)
    const userId = req.user ? req.user.id : 'anon';
    const lang = req.headers['accept-language'] || 'ru';
    const cacheKey = `cache:${userId}:${lang}:${req.originalUrl}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // Override res.json to capture and cache the response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.setex(cacheKey, ttlSeconds, JSON.stringify(data)).catch(() => {});
        }
        return originalJson(data);
      };

      next();
    } catch (err) {
      // If Redis fails, just continue without caching
      next();
    }
  };
}

/**
 * Invalidate cache for a pattern
 * @param {string} pattern - Redis key pattern to invalidate
 */
async function invalidateCache(pattern) {
  if (!redis || redis.status !== 'ready') return;
  try {
    const keys = await redis.keys(`cache:*${pattern}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn('Cache invalidation error:', err.message);
  }
}

module.exports = { cacheMiddleware, invalidateCache };
