import express, { Router } from "express";
import ingestContainer from '../Dependencies/dependencies';
import validateApiKey from '../../../shared/middlewares/validateApiKey';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisConnection from '../../../shared/config/redis';
import config from '../../../shared/config/index';

const router: Router = express.Router();
const { ingestController } = ingestContainer.controllers;

const ingestLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    // Connect the rate limiter to our centralized Redis store
    store: new RedisStore({
        // @ts-ignore
        sendCommand: (...args: string[]) => {
            const client = redisConnection.getClient();
            if (!client) {
                throw new Error('Redis client is offline');
            }
            // Executes raw Redis command (e.g. INCRBY, EXPIRE) via ioredis
            return client.call(args[0], ...args.slice(1));
        },
    }),
    message: {
        success: false,
        message: 'Too many requests, please try again later',
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false
});

router.post("/", validateApiKey, ingestLimiter, (req, res, next) => {
    ingestController.ingestHit(req, res, next);
});

export default router;
