import logger from '../../../shared/config/logger';
import AppError from '../../../shared/utils/AppError';
import { MetricsRepository } from '../../processer/repository/metricsRepository';

export interface AnalyticsFilters {
    startTime?: string | Date;
    endTime?: string | Date;
}

export interface OverallStats {
    totalHits: number;
    errorHits: number;
    successHits: number;
    errorRate: number;
    avgLatency: number;
    uniqueServices: number;
    uniqueEndpoints: number;
    timeRange: {
        start: Date;
        end: Date;
    };
}

export class AnalyticsService {
    private metricsRepository: MetricsRepository;

    constructor(metricsRepo: MetricsRepository) {
        if (!metricsRepo) {
            throw new Error("AnalyticsService requires a metricsRepository");
        }
        this.metricsRepository = metricsRepo;
    }

    async getOverallStats(clientId: string | null | undefined, filters: AnalyticsFilters = {}): Promise<OverallStats> {
        try {
            const { startTime, endTime } = this.parseTimeFilters(filters);

            const stats = await this.metricsRepository.getOverallStats(
                clientId,
                startTime,
                endTime
            );


            const totalHits = parseInt(stats.totalHits ?? stats.total_hits) || 0;
            const errorHits = parseInt(stats.errorHits ?? stats.error_hits) || 0;
            const avgLatency = parseFloat(stats.avgLatency ?? stats.avg_latency) || 0;
            const uniqueServices = parseInt(stats.uniqueServices ?? stats.unique_services) || 0;
            const uniqueEndpoints = parseInt(stats.uniqueEndpoints ?? stats.unique_endpoints) || 0;

            const errorRate = totalHits > 0 ? (errorHits / totalHits) * 100 : 0;

            return {
                totalHits,
                errorHits,
                successHits: totalHits - errorHits,
                errorRate: parseFloat(errorRate.toFixed(2)),
                avgLatency: parseFloat(avgLatency.toFixed(2)) || 0,
                uniqueServices,
                uniqueEndpoints,
                timeRange: {
                    start: startTime,
                    end: endTime,
                },
            };
        } catch (error) {
            logger.error('Error getting overall stats:', error);
            throw error;
        }
    }

    parseTimeFilters(filters: AnalyticsFilters = {}): { startTime: Date; endTime: Date } {
        let startTime: Date;
        if (!filters.startTime) {
            startTime = new Date();
            startTime.setHours(startTime.getHours() - 24); // Last 24 hrs
        } else {
            startTime = new Date(filters.startTime);
        }

        let endTime: Date;
        if (!filters.endTime) {
            endTime = new Date();
        } else {
            endTime = new Date(filters.endTime);
        }

        return { startTime, endTime };
    }
}
