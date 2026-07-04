import Redis from 'ioredis';
import config from './index';
import logger from './logger';

class RedisConnection {
    private client: Redis;

    constructor() {
        logger.info("Initializing Redis client...");
        this.client = new Redis(config.redis.url, {
            maxRetriesPerRequest: null,
        });

        this.client.on('connect', () => {
            logger.info('Redis connected successfully');
        });

        this.client.on('error', (err) => {
            logger.error('Redis connection error:', err);
        });
    }

    async connect(): Promise<Redis> {
        return this.client;
    }

    getClient(): Redis {
        return this.client;
    }

    getStatus(): "connected" | "disconnected" {
        return this.client.status === 'ready' || this.client.status === 'connect' ? "connected" : "disconnected";
    }

    async close(): Promise<void> {
        try {
            await this.client.quit();
            logger.info("Redis connection closed");
        } catch (error: unknown) {
            logger.error("Error in closing Redis connection", error);
        }
    }
}

// == DEVELOPMENT SINGLETON (PREVENTS LEAKS DURING NEXT.JS HMR) ==
declare global {
    var redisGlobalConnection: RedisConnection | undefined;
}

// Check if we already created a connection manager on globalThis
const redisConnection = globalThis.redisGlobalConnection ?? new RedisConnection();

export default redisConnection;

// Cache the connection manager on globalThis only in development mode
if (process.env.NODE_ENV !== 'production') {
    globalThis.redisGlobalConnection = redisConnection;
}

// == PRODUCTION ONLY (COMMENTED OUT FOR FUTURE USE) ==
// export default new RedisConnection();
