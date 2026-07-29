import redisConnection from '../config/redis';
import logger from '../config/logger';

export const LIVE_METRICS_CHANNEL = 'metrics:live';

export interface LiveMetricEvent {
    endpoint: string;
    method: string;
    statusCode: number;
    latencyMs: number;
    timestamp: number;
}

class LiveMetricsPublisher {
    publish(event: LiveMetricEvent): void {
        const client = redisConnection.getClient();

        if (!client) {
            logger.warn('[LiveMetricsPublisher] Redis client unavailable, skipping publish');
            return;
        }

        const payload = JSON.stringify(event);

        client.publish(LIVE_METRICS_CHANNEL, payload).catch((error: unknown) => {
            logger.error('[LiveMetricsPublisher] Failed to publish metric event', {
                error: error instanceof Error ? error.message : String(error),
                channel: LIVE_METRICS_CHANNEL,
            });
        });
    }
}

const liveMetricsPublisher = new LiveMetricsPublisher();
export default liveMetricsPublisher;
