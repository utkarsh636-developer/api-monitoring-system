import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisConnection from '../config/redis';
import config from '../config/index';

function createRedisStore(prefix: string) {
    return new RedisStore({
        prefix,
        // @ts-ignore
        sendCommand: (...args: string[]) => {
            const client = redisConnection.getClient();
            if (!client) {
                throw new Error('Redis client is offline');
            }
            return client.call(args[0], ...args.slice(1));
        },
    });
}

// General API rate limiter for admin and client routes (100 requests per 1 minute by default)
export const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    store: createRedisStore('rl:api:'),
    validate: { trustProxy: false },
    message: {
        success: false,
        message: 'Too many requests, please try again later',
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Strict rate limiter for sensitive authentication endpoints (30 requests per 15 minutes)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 requests per 15 mins
    store: createRedisStore('rl:auth:'),
    validate: { trustProxy: false },
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again in 15 minutes',
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Analytics rate limiter to prevent heavy dashboard query abuse (100 requests per 15 minutes)
export const analyticsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per 15 mins
    store: createRedisStore('rl:analytics:'),
    validate: { trustProxy: false },
    message: {
        success: false,
        message: 'Too many analytics dashboard requests, please try again later',
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Ingest rate limiter to protect RabbitMQ and ingestion database pipeline
export const ingestLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    store: createRedisStore('rl:ingest:'),
    validate: { trustProxy: false },
    message: {
        success: false,
        message: 'Too many requests, please try again later',
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false
});
