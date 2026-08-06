import logger from '../../../shared/config/logger';
import { LiveMetricEvent } from '../../../shared/realtime/liveMetricsPublisher';
import { AlertEvent } from '../../../shared/realtime/liveAlertsPublisher';
import liveAlertsPublisher from '../../../shared/realtime/liveAlertsPublisher';
import { EwmaService, EndpointState } from './ewmaService';
import { AlertRepository } from '../repository/alertRepository';

export interface AnomalyServiceDependencies {
    ewmaService: EwmaService;
    alertRepository: AlertRepository;
}

export class AnomalyService {
    private readonly ewmaService: EwmaService;
    private readonly alertRepository: AlertRepository;

    /**
     * Per-endpoint in-memory state map.
     * Key: `${METHOD}:${endpoint}` — e.g. "GET:/api/v1/users"
     *
     * WHY in-memory (not Redis/Postgres)?
     *   EWMA state is inherently a single-process running statistic.
     *   Persisting it on every sample would add DB/Redis RTT to the hot path.
     *   On process restart the state resets, which is acceptable — the 20-sample
     *   cold-start guard simply re-warms the baseline, usually within minutes.
     */
    private readonly stateMap: Map<string, EndpointState> = new Map();

    constructor({ ewmaService, alertRepository }: AnomalyServiceDependencies) {
        this.ewmaService = ewmaService;
        this.alertRepository = alertRepository;
    }

    /**
     * Entry point called by anomalyConsumer.ts for each metric event received
     * from the "metrics:live" Redis channel.
     *
     * Flow:
     *   1. Build the per-endpoint key.
     *   2. Get or initialise state for that key.
     *   3. Run EWMA evaluation.
     *   4. Persist updated state in the map.
     *   5. If anomaly detected → publish to "alerts:live" + persist to DB.
     */
    async handleMetricEvent(event: LiveMetricEvent): Promise<void> {
        const key = `${event.method.toUpperCase()}:${event.endpoint}`;

        const currentState: EndpointState = this.stateMap.get(key) ?? {
            mean: event.latencyMs,  // Bootstrap mean with the first sample
            variance: 0,
            count: 0,
        };

        const { updatedState, isAnomaly, stdDevs, expectedValue } = this.ewmaService.evaluate(
            event.latencyMs,
            currentState
        );

        // Always persist the new state — this is the only write in the hot path
        this.stateMap.set(key, updatedState);

        if (!isAnomaly) return;

        const alert: AlertEvent = {
            endpoint: event.endpoint,
            method: event.method.toUpperCase(),
            actualValue: event.latencyMs,
            expectedValue: Number(expectedValue.toFixed(2)),
            stdDevs: Number(stdDevs.toFixed(3)),
            timestamp: event.timestamp,
        };

        logger.warn('[AnomalyService] Anomaly detected', {
            endpoint: alert.endpoint,
            method: alert.method,
            actualValue: alert.actualValue,
            expectedValue: alert.expectedValue,
            stdDevs: alert.stdDevs,
        });

        // Publish to "alerts:live" — non-blocking fire-and-forget
        liveAlertsPublisher.publish(alert);

        // Persist to PostgreSQL — await so we capture DB errors in the try/catch of the caller
        try {
            await this.alertRepository.save({
                endpoint: alert.endpoint,
                method: alert.method,
                actualValue: alert.actualValue,
                expectedValue: alert.expectedValue,
                stdDevs: alert.stdDevs,
                detectedAt: new Date(alert.timestamp),
            });
        } catch (dbError) {
            // DB failure must NOT prevent the Redis publish from completing.
            // The alert is already delivered to the dashboard — a missing DB row
            // is non-critical compared to dropping the real-time notification.
            logger.error('[AnomalyService] Failed to persist alert to DB', { error: dbError });
        }
    }
}
