import logger from '../../../shared/config/logger';
import AppError from '../../../shared/utils/AppError';
import { MetricsRepository } from '../../processer/repository/metricsRepository';
import { AuthService } from '../../auth/service/authService';
import { ClientRepository } from '../../client/repository/clientRepository';

export interface AnalyticsFilters {
    startTime?: string | number | Date | null;
    endTime?: string | number | Date | null;
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

export interface TopEndpointsOptions {
    limit?: number;
    startTime?: string | number | Date | null;
}

export interface TopEndpointResult {
    serviceName: string;
    endpoint: string;
    method: string;
    totalHits: number;
    avgLatency: number;
    errorHits: number;
    errorRate: number;
}

export interface TimeSeriesFilters {
    serviceName?: string;
    endpoint?: string;
    startTime?: string | number | Date | null;
    endTime?: string | number | Date | null;
    limit?: number;
}
export interface TimeSeriesResult {
    serviceName: string;
    endpoint: string;
    method: string;
    totalHits: number;
    errorHits: number;
    avgLatency: number;
    minLatency: number;
    maxLatency: number;
    timeBucket: Date | string;
}

export class AnalyticsService {
    private metricsRepository: MetricsRepository;
    private authService: AuthService;
    private clientRepository: ClientRepository;

    constructor(
        metricsRepo: MetricsRepository,
        authService: AuthService,
        clientRepository: ClientRepository
    ) {
        if (!metricsRepo) {
            throw new Error("AnalyticsService requires a metricsRepository");
        }
        if (!authService) {
            throw new Error("AnalyticsService requires an authService");
        }
        if (!clientRepository) {
            throw new Error("AnalyticsService requires a clientRepository");
        }
        this.metricsRepository = metricsRepo;
        this.authService = authService;
        this.clientRepository = clientRepository;
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

    async ensureCanViewAnalytics(userId: string | undefined): Promise<boolean> {
        if (!userId) {
            throw new AppError('Authentication required', 401);
        }

        const isSuperAdmin = await this.authService.checkSuperAdminPermissions(userId);
        if (isSuperAdmin) return true;

        const profile = await this.authService.getProfile(userId);

        if (!profile || !profile.canViewAnalytics) {
            throw new AppError('Insufficient permissions to view analytics', 403);
        }

        return false;
    }

    async resolveFinalClientId(params: {
        queryClientId?: string;
        userClientId?: string | null;
        isSuperAdmin: boolean;
    }): Promise<string | null> {
        const { queryClientId, userClientId, isSuperAdmin } = params;

        if (isSuperAdmin) {
            if (queryClientId) {
                if (!this.isValidUUID(queryClientId)) {
                    throw new AppError('Invalid clientId format', 400);
                }

                const client = await this.clientRepository.findById(queryClientId);

                if (!client) throw new AppError('Client not found', 404);

                return queryClientId;
            }

            return null;
        }

        if (!userClientId) {
            throw new AppError('Access denied - no client association', 403);
        }

        if (!this.isValidUUID(userClientId)) {
            throw new AppError('Invalid client association', 400);
        }

        const client = await this.clientRepository.findById(userClientId);

        if (!client) throw new AppError('Client not found', 404);

        return userClientId;
    }

    isValidUUID(id: any): boolean {
        if (typeof id !== 'string') return false;
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        return uuidRegex.test(id);
    }

    async getTopEndpoints(clientId: string | null | undefined, options: TopEndpointsOptions = {}): Promise<TopEndpointResult[]> {
        try {
            const { limit = 10, startTime } = options;
            const parsedStartTime = startTime ? new Date(startTime) : null;
            const endpoints = await this.metricsRepository.getTopEndpoints(clientId, limit, parsedStartTime);
            return endpoints.map((endpoint: any) => {
                const serviceName = endpoint.serviceName ?? endpoint.service_name;
                const totalHits = parseInt(endpoint.totalHits ?? endpoint.total_hits) || 0;
                const errorHits = parseInt(endpoint.errorHits ?? endpoint.error_hits) || 0;
                const avgLatency = parseFloat(endpoint.avgLatency ?? endpoint.avg_latency) || 0;
                const errorRate = totalHits > 0 ? (errorHits / totalHits) * 100 : 0;
                return {
                    serviceName,
                    endpoint: endpoint.endpoint,
                    method: endpoint.method,
                    totalHits,
                    avgLatency: parseFloat(avgLatency.toFixed(2)),
                    errorHits,
                    errorRate: parseFloat(errorRate.toFixed(2)),
                };
            });
        } catch (error) {
            logger.error('Error getting top endpoints:', error);
            throw error;
        }
    }
    
    async getTimeSeries(clientId: string | null | undefined, filters: TimeSeriesFilters = {}): Promise<TimeSeriesResult[]> {
        try {
            const { serviceName, endpoint, startTime, endTime, limit = 100 } = filters;
            const { endTime: end_time, startTime: start_time } = this.parseTimeFilters({ startTime, endTime });
            const metrics = await this.metricsRepository.getMetrics({
                clientId,
                serviceName,
                endpoint,
                startTime: start_time,
                endTime: end_time,
                limit,
            });
            return metrics.map((metric: any) => {
                const serviceName = metric.serviceName ?? metric.service_name;
                const totalHits = parseInt(metric.totalHits ?? metric.total_hits) || 0;
                const errorHits = parseInt(metric.errorHits ?? metric.error_hits) || 0;
                const avgLatency = parseFloat(metric.avgLatency ?? metric.avg_latency) || 0;
                const minLatency = parseFloat(metric.minLatency ?? metric.min_latency) || 0;
                const maxLatency = parseFloat(metric.maxLatency ?? metric.max_latency) || 0;
                const timeBucket = metric.timeBucket ?? metric.time_bucket;
                return {
                    serviceName,
                    endpoint: metric.endpoint,
                    method: metric.method,
                    totalHits,
                    errorHits,
                    avgLatency: parseFloat(avgLatency.toFixed(2)),
                    minLatency: parseFloat(minLatency.toFixed(2)),
                    maxLatency: parseFloat(maxLatency.toFixed(2)),
                    timeBucket,
                };
            });
        } catch (error) {
            logger.error('Error getting time series:', error);
            throw error;
        }
    }
}
