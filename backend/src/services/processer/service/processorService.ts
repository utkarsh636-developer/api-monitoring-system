import { Prisma } from '@prisma/client';
import logger from '../../../shared/config/logger';
import { ApiHitRepository } from '../repository/apiHitRepository';
import { MetricsRepository } from '../repository/metricsRepository';

export interface ProcessorServiceDependencies {
    apiHitRepository: ApiHitRepository;
    metricsRepository: MetricsRepository;
}

export class ProcessorService {
    private apiHitRepository: ApiHitRepository;
    private metricsRepository: MetricsRepository;

    constructor({ apiHitRepository, metricsRepository }: ProcessorServiceDependencies) {
        if (!apiHitRepository || !metricsRepository) {
            throw new Error('ProcessorService requires apiHitRepository and metricsRepository');
        }
        this.apiHitRepository = apiHitRepository;
        this.metricsRepository = metricsRepository;
    }

    getTimeBucket(timestamp: Date | string | number, interval: 'hour' | 'day' | 'minute' = 'hour'): Date {
        const date = new Date(timestamp);

        switch (interval) {
            case 'hour':
                date.setMinutes(0, 0, 0);
                break;
            case 'day':
                date.setHours(0, 0, 0, 0);
                break;
            case 'minute':
                date.setSeconds(0, 0);
                break;
            default:
                date.setMinutes(0, 0, 0);
        }

        return date;
    }

    async processEvent(eventData: Prisma.ApiHitUncheckedCreateInput): Promise<void> {
        let rawEventSaved = false;

        try {
            logger.info('Processing event data:', {
                eventId: eventData.eventId,
                clientId: eventData.clientId,
                serviceName: eventData.serviceName,
                endpoint: eventData.endpoint,
                method: eventData.method,
            });

            await this.apiHitRepository.save(eventData);
            rawEventSaved = true;

            logger.info('Raw event saved to PostgreSQL:', {
                eventId: eventData.eventId
            });

            await this.updateMetricsWithFallback(eventData);

            logger.info('Event processed successfully:', {
                eventId: eventData.eventId
            });
        } catch (error: any) {
            if (!rawEventSaved) {
                logger.error('Critical: Failed to save raw event to PostgreSQL:', {
                    error: error.message,
                    eventId: eventData.eventId,
                });
                throw error;
            }

            logger.error('Non-critical: Raw event saved but metrics update failed:', {
                error: error.message,
                eventId: eventData.eventId,
            });
        }
    }

    private async updateMetricsWithFallback(eventData: Prisma.ApiHitUncheckedCreateInput): Promise<void> {
        try {
            const timeBucket = this.getTimeBucket(eventData.timestamp, "hour");

            const metricsData = {
                clientId: eventData.clientId.toString(),
                serviceName: eventData.serviceName,
                endpoint: eventData.endpoint,
                method: eventData.method,
                totalHits: 1,
                errorHits: Number(eventData.statusCode) >= 400 ? 1 : 0,
                avgLatency: Number(eventData.latencyMs),
                minLatency: Number(eventData.latencyMs),
                maxLatency: Number(eventData.latencyMs),
                timeBucket,
            };

            await this.metricsRepository.upsertEndpointMetrics(metricsData);

            logger.info('Metrics updated successfully', {
                eventId: eventData.eventId,
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Cleans up raw event hits older than the specified duration.
     */
    async cleanupOldEvents(daysToKeep = 30): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const deletedCount = await this.apiHitRepository.deleteOldHits(cutoffDate);
            return deletedCount;
        } catch (error) {
            logger.error('Error during cleanup:', error);
            throw error;
        }
    }
}
