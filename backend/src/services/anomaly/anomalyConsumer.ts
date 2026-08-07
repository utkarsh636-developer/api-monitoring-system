import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import { z } from 'zod';
import Redis from 'ioredis';
import config from '../../shared/config/index';
import logger from '../../shared/config/logger';
import dbConnection from '../../shared/config/prisma';
import anomalyContainer from './Dependencies/dependencies';
import { LIVE_METRICS_CHANNEL, LiveMetricEvent } from '../../shared/realtime/liveMetricsPublisher';
import { AnomalyService } from './service/anomalyService';

// ── Schema ────────────────────────────────────────────────────────────────────
// Validate that every message on "metrics:live" has the fields we need before
// passing it to the service layer.  Unknown extra fields are stripped (z.object
// is strict by default).  Malformed messages are logged and silently discarded —
// the process must NOT crash on bad data from the channel.
const metricEventSchema = z.object({
    endpoint: z.string(),
    method: z.string(),
    statusCode: z.number(),
    latencyMs: z.number(),
    timestamp: z.number(),
});

// ── Consumer class ────────────────────────────────────────────────────────────
export interface AnomalyConsumerDependencies {
    anomalyService: AnomalyService;
    logger: any;
}

export class AnomalyConsumer {
    private readonly anomalyService: AnomalyService;
    private readonly logger: any;

    /**
     * A dedicated Redis connection used exclusively for SUBSCRIBE.
     *
     * WHY a separate connection?
     *   Once a Redis connection enters subscriber mode (via SUBSCRIBE/PSUBSCRIBE),
     *   ioredis blocks all normal commands (GET, SET, PUBLISH, etc.) on that
     *   connection.  Using a dedicated connection isolates the subscriber from the
     *   shared application Redis client, preventing command interference.
     *
     * This pattern is identical to how dashboardWsServer.ts creates its own
     * dedicated subscriber — never reusing the shared redisConnection singleton.
     */
    private subscriber: Redis;

    public isRunning: boolean = false;

    constructor({ anomalyService, logger }: AnomalyConsumerDependencies) {
        this.anomalyService = anomalyService;
        this.logger = logger;

        this.subscriber = new Redis(config.redis.url, {
            maxRetriesPerRequest: null,
            lazyConnect: true,
        });

        this._attachSubscriberEvents();
    }

    private _attachSubscriberEvents(): void {
        this.subscriber.on('connect', () => {
            this.logger.info('[AnomalyConsumer] Redis subscriber connected');
        });

        this.subscriber.on('ready', () => {
            this._subscribe();
        });

        this.subscriber.on('error', (error: Error) => {
            this.logger.error('[AnomalyConsumer] Redis subscriber error', {
                error: error.message,
            });
        });

        this.subscriber.on('close', () => {
            this.logger.warn('[AnomalyConsumer] Redis subscriber connection closed');
            this.isRunning = false;
        });

        this.subscriber.on('reconnecting', () => {
            this.logger.info('[AnomalyConsumer] Redis subscriber reconnecting...');
        });

        // ── Hot path: message handler ─────────────────────────────────────────
        this.subscriber.on('message', (channel: string, message: string) => {
            if (channel !== LIVE_METRICS_CHANNEL) return;

            // All errors here are caught so a single bad message or a transient
            // DB error never crashes the long-running subscriber process.
            this._handleMessage(message).catch((err: unknown) => {
                this.logger.error('[AnomalyConsumer] Unhandled error in message handler', {
                    error: err instanceof Error ? err.message : String(err),
                });
            });
        });
    }

    private _subscribe(): void {
        this.subscriber.subscribe(LIVE_METRICS_CHANNEL).then(() => {
            this.isRunning = true;
            this.logger.info(`[AnomalyConsumer] Subscribed to channel: ${LIVE_METRICS_CHANNEL}`);
        }).catch((error: unknown) => {
            this.logger.error('[AnomalyConsumer] Failed to subscribe to Redis channel', {
                error: error instanceof Error ? error.message : String(error),
                channel: LIVE_METRICS_CHANNEL,
            });
        });
    }

    private async _handleMessage(raw: string): Promise<void> {
        let parsed: unknown;

        // 1. Parse JSON — discard silently on malformed input
        try {
            parsed = JSON.parse(raw);
        } catch {
            this.logger.warn('[AnomalyConsumer] Received non-JSON message, discarding', {
                raw: raw.slice(0, 200),
            });
            return;
        }

        // 2. Validate shape — discard silently on schema mismatch
        const result = metricEventSchema.safeParse(parsed);
        if (!result.success) {
            this.logger.warn('[AnomalyConsumer] Message failed schema validation, discarding', {
                issues: result.error.issues.map((i) => i.message).join(', '),
            });
            return;
        }

        // 3. Delegate to service layer
        await this.anomalyService.handleMetricEvent(result.data as LiveMetricEvent);
    }

    async start(): Promise<void> {
        this.logger.info('[AnomalyConsumer] Starting anomaly consumer...');
        await this.subscriber.connect();
    }

    async stop(): Promise<void> {
        this.logger.info('[AnomalyConsumer] Stopping anomaly consumer...');
        try {
            if (this.isRunning) {
                await this.subscriber.unsubscribe(LIVE_METRICS_CHANNEL);
            }
            await this.subscriber.quit();
            await dbConnection.close();
        } catch (error) {
            this.logger.error('[AnomalyConsumer] Error during stop:', error);
        }
    }
}

// ── Process entry point ───────────────────────────────────────────────────────

const consumer = new AnomalyConsumer({
    anomalyService: anomalyContainer.services.anomalyService,
    logger,
});

async function startConsumerWithRetry(): Promise<void> {
    const maxRetries = 5;
    const baseDelayMs = 5000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.info(`[AnomalyConsumer] Starting (attempt ${attempt}/${maxRetries})`);
            await consumer.start();
            logger.info('[AnomalyConsumer] Started successfully');
            return;
        } catch (error) {
            logger.error(`[AnomalyConsumer] Start attempt ${attempt} failed:`, error);

            if (attempt === maxRetries) {
                logger.error('[AnomalyConsumer] Max retries reached, exiting...');
                process.exit(1);
            }

            const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), 30_000);
            logger.info(`[AnomalyConsumer] Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}

process.on('SIGINT', async () => {
    logger.info('[AnomalyConsumer] Received SIGINT, shutting down gracefully...');
    await consumer.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('[AnomalyConsumer] Received SIGTERM, shutting down gracefully...');
    await consumer.stop();
    process.exit(0);
});

process.on('uncaughtException', (error: Error) => {
    logger.error('[AnomalyConsumer] Uncaught exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error('[AnomalyConsumer] Unhandled promise rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

startConsumerWithRetry();

export default consumer;
