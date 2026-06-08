import Redis from 'ioredis';
import { config } from './index';
import { logger } from './logger';

class RedisConnection {
    private client: Redis | null;
    private isConnecting: boolean;

    constructor() {
        this.client = null;
        this.isConnecting = false;
    }

    async connect(): Promise<Redis | null> {
        if (this.client) {
            return this.client;
        }

        if (this.isConnecting) {
            await new Promise<void>((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this.isConnecting) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
            return this.client;
        }

        try {
            this.isConnecting = true;

            logger.info("Connecting to Redis", config.redis.url);

            // Create local instance first to guarantee type-safety
            const redisInstance = new Redis(config.redis.url, {
                maxRetriesPerRequest: null,
            });

            redisInstance.on('connect', () => {
                logger.info('Redis connected successfully');
            });

            redisInstance.on('error', (err) => {
                logger.error('Redis connection error:', err);
            });

            this.client = redisInstance;
            this.isConnecting = false;

            return this.client;
        } catch (error: any) {
            this.isConnecting = false;
            logger.error("Failed to connect to Redis", error);
            throw error;
        }
    }

    getClient(): Redis | null {
        return this.client;
    }

    getStatus(): "connected" | "disconnected" {
        if (!this.client) return "disconnected";
        return "connected";
    }

    async close(): Promise<void> {
        try {
            if (this.client) {
                // quit() is the graceful shutdown method in ioredis
                await this.client.quit();
                this.client = null;
                logger.info("Redis connection closed");
            }
        } catch (error: any) {
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
