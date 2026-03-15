const Redis = require('ioredis');

let redis = null;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        console.warn('⚠️ Redis unavailable, caching disabled');
        return null; // Stop reconnecting
      }
      return Math.min(times * 200, 2000);
    }
  });

  redis.on('connect', () => {
    console.log('🔴 Connected to Redis');
  });

  redis.on('error', (err) => {
    console.warn('⚠️ Redis error:', err.message);
  });
} catch (err) {
  console.warn('⚠️ Redis not available, running without cache');
}

module.exports = redis;
