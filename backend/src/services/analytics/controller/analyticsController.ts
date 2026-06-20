import { Request, Response, NextFunction } from 'express';
import ResponseFormatter from '../../../shared/utils/responseFormatter';
import AppError from '../../../shared/utils/AppError';
import { AnalyticsService } from '../service/analyticsService';

export interface AnalyticsControllerDependencies {
    analyticsService: AnalyticsService;
}

export class AnalyticsController {
    private analyticsService: AnalyticsService;

    constructor(dependencies: AnalyticsControllerDependencies) {
        if (!dependencies || !dependencies.analyticsService) {
            throw new Error('AnalyticsController requires analyticsService');
        }
        
        this.analyticsService = dependencies.analyticsService;
    }

    async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { startTime, endTime, clientId } = req.query;
            const userId = req.user?.userId;
            const userClientId = req.user?.clientId;

            const isSuperAdmin = await this.analyticsService.ensureCanViewAnalytics(userId);
            const finalClientId = await this.analyticsService.resolveFinalClientId({
                queryClientId: clientId as string | undefined,
                userClientId,
                isSuperAdmin
            });
            const timeRange = this.validateTimeRange(startTime, endTime);

            const stats = await this.analyticsService.getOverallStats(finalClientId, timeRange);

            res.status(200).json(
                ResponseFormatter.success(stats, 'Statistics retrieved successfully', 200)
            );
        } catch (error) {
            next(error);
        }
    }

    validateTimeRange(startTime: any, endTime: any): { startTime: number | null; endTime: number | null } {
        const parseValue = (v: any): number | null => {
            if (v === undefined || v === null || v === '') return null;
            if (/^\d+$/.test(String(v))) return Number(v);
            const parsed = Date.parse(String(v));
            return Number.isNaN(parsed) ? NaN : parsed;
        };

        const start = parseValue(startTime);
        const end = parseValue(endTime);

        if ((startTime && Number.isNaN(start)) || (endTime && Number.isNaN(end))) {
            throw new AppError('Invalid time format', 400);
        }

        if (start !== null && end !== null && start > end) {
            throw new AppError('Invalid time range: start > end', 400);
        }

        return { startTime: start, endTime: end };
    }

    async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { startTime, endTime, clientId } = req.query;
            const userId = req.user?.userId;
            const userClientId = req.user?.clientId;

            const isSuperAdmin = await this.analyticsService.ensureCanViewAnalytics(userId);
            const finalClientId = await this.analyticsService.resolveFinalClientId({
                queryClientId: clientId as string | undefined,
                userClientId,
                isSuperAdmin
            });
            const timeRange = this.validateTimeRange(startTime, endTime);

            const result = await Promise.allSettled([
                this.analyticsService.getOverallStats(finalClientId, timeRange),
                this.analyticsService.getTopEndpoints(finalClientId, { limit: 5, startTime: timeRange.startTime }),
                this.analyticsService.getTimeSeries(finalClientId, { ...timeRange, limit: 24 }),
            ]);

            const [stats, topEndpoints, recentTimeSeries] = result.map((item) => 
                item.status === "fulfilled" ? item.value : null
            );

            const dashboard = {
                stats,
                topEndpoints,
                recentActivity: recentTimeSeries // Fixed the typo: recentActitivy -> recentActivity
            };

            res.status(200).json(
                ResponseFormatter.success(dashboard, "Dashboard data retrieved successfully", 200)
            );
        } catch (error) {
            next(error);
        }
    }
}
