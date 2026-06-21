import redisConnection from '../config/redis';
import logger from '../config/logger';

export class CacheService {
    private static get client() {
        const client = redisConnection.getClient();
        if (!client) {
            logger.warn('Redis client is not initialized or offline');
        }
        return client;
    }

    static async get<T>(key: string): Promise<T | null> {
        const client = this.client;
        if (!client) return null;

        try {
            const data = await client.get(key);
            return data ? (JSON.parse(data) as T) : null;
        } catch (error: unknown) {
            logger.error(`Redis GET error for key "${key}":`, error);
            return null; // Fail-open: proceed to database
        }
    }

    static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        const client = this.client;
        if (!client) return;

        try {
            const data = JSON.stringify(value);
            if (ttlSeconds) {
                await client.setex(key, ttlSeconds, data);
            } else {
                await client.set(key, data);
            }
        } catch (error: unknown) {
            logger.error(`Redis SET error for key "${key}":`, error);
        }
    }

    static async del(key: string): Promise<void> {
        const client = this.client;
        if (!client) return;

        try {
            await client.del(key);
        } catch (error: unknown) {
            logger.error(`Redis DEL error for key "${key}":`, error);
        }
    }

    /**
     * Deletes multiple keys matching a wildcard search pattern (e.g., 'analytics:*:client_A')
     */
    static async delPattern(pattern: string): Promise<void> {
        const client = this.client;
        if (!client) return;

        try {
            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(...keys);
            }
        } catch (error: unknown) {
            logger.error(`Redis DEL pattern "${pattern}" error:`, error);
        }
    }
}

export default CacheService;
