import { Request, Response, NextFunction } from 'express';
import ResponseFormatter from '../../../shared/utils/responseFormatter';
import AppError from '../../../shared/utils/AppError';
import logger from '../../../shared/config/logger';
import { AnalyticsService } from '../service/analyticsService';
import { AuthService } from '../../auth/service/authService';
import { ClientRepository } from '../../client/repository/clientRepository';

export interface AnalyticsControllerDependencies {
    analyticsService: AnalyticsService;
    authService: AuthService;
    clientRepository: ClientRepository;
}

export class AnalyticsController {
    private analyticsService: AnalyticsService;
    private authService: AuthService;
    private clientRepository: ClientRepository;

    constructor(dependencies: AnalyticsControllerDependencies) {
        if (!dependencies) {
            throw new Error('AnalyticsController requires analyticsService, authService, and clientRepository');
        }
        
        const { analyticsService, authService, clientRepository } = dependencies;

        if (!analyticsService || !authService || !clientRepository) {
            throw new Error('AnalyticsController requires analyticsService, authService, and clientRepository');
        }

        this.analyticsService = analyticsService;
        this.authService = authService;
        this.clientRepository = clientRepository;
    }

    async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { startTime, endTime } = req.query;

            const isAdmin = await this.ensureCanViewAnalytics(req);
            const finalClientId = await this.resolveFinalClientId(req, isAdmin);
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

    async ensureCanViewAnalytics(req: Request): Promise<boolean> {
        if (!req.user || !req.user.userId) {
            throw new AppError('Authentication required', 401);
        }

        const isSuperAdmin = await this.authService.checkSuperAdminPermissions(req.user.userId);
        if (isSuperAdmin) return true;

        const profile = await this.authService.getProfile(req.user.userId);

        if (!profile || !profile.canViewAnalytics) {
            throw new AppError('Insufficient permissions to view analytics', 403);
        }

        return false;
    }

    async resolveFinalClientId(req: Request, isSuperAdmin: boolean): Promise<string | null> {
        const queryClientId = req.query.clientId as string | undefined;
        const userClientId = req.user?.clientId;

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
}
