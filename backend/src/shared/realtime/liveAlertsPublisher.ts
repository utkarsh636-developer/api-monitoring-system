import redisConnection from '../config/redis';
import logger from '../config/logger';

export const LIVE_ALERTS_CHANNEL = 'alerts:live';

export interface AlertEvent {
    endpoint: string;
    method: string;
    actualValue: number;     
    expectedValue: number;   
    stdDevs: number;         
    timestamp: number;       
}

class LiveAlertsPublisher {
    publish(event: AlertEvent): void {
        const client = redisConnection.getClient();

        if (!client) {
            logger.warn('[LiveAlertsPublisher] Redis client unavailable, skipping publish');
            return;
        }

        const payload = JSON.stringify(event);

        client.publish(LIVE_ALERTS_CHANNEL, payload).catch((error: unknown) => {
            logger.error('[LiveAlertsPublisher] Failed to publish alert event', {
                error: error instanceof Error ? error.message : String(error),
                channel: LIVE_ALERTS_CHANNEL,
            });
        });
    }
}

const liveAlertsPublisher = new LiveAlertsPublisher();
export default liveAlertsPublisher;
