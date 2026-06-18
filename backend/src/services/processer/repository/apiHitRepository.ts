import { ApiHit, HttpMethod, Prisma } from '@prisma/client';
import { BaseRepository, BaseRepositoryDependencies } from './baseRepository';
import dbConnection from '../../../shared/config/prisma';

export class ApiHitRepository extends BaseRepository {
    constructor({ logger }: BaseRepositoryDependencies = {}) {
        super({ logger });
    }

    protected get model() {
        const client = dbConnection.getClient();
        if (!client) {
            throw new Error("Database client has not been initialized");
        }
        return client.apiHit; 
    }

    async save(eventData: Prisma.ApiHitUncheckedCreateInput): Promise<ApiHit | null> {
        try {
            const apiHit = await this.model.create({
                data: {
                    eventId: eventData.eventId,
                    timestamp: new Date(eventData.timestamp),
                    serviceName: eventData.serviceName,
                    endpoint: eventData.endpoint,
                    method: eventData.method as HttpMethod,
                    statusCode: eventData.statusCode,
                    latencyMs: eventData.latencyMs,
                    clientId: eventData.clientId,
                    apiKeyId: eventData.apiKeyId,
                    ip: eventData.ip || 'unknown',
                    userAgent: eventData.userAgent || '',
                }
            });

            this.logger.info("API hit saved to PostgreSQL", { eventId: eventData.eventId });
            return apiHit;
        } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                this.logger.warn('Duplicate event ID, skipping save', { eventId: eventData.eventId });
                return null;
            }
            this.logger.error('Error saving API hit:', error);
            throw error;
        }
    }

    async find(
        filter: Prisma.ApiHitWhereInput = {},
        options: { limit?: number; skip?: number; sort?: Record<string, number> } = {}
    ): Promise<ApiHit[]> {
        try {
            const { limit = 100, skip = 0, sort = { timestamp: -1 } } = options;

            const orderBy: Prisma.ApiHitOrderByWithRelationInput[] = Object.entries(sort).map(([key, value]) => ({
                [key]: value === -1 ? 'desc' : 'asc'
            }));

            const hits = await this.model.findMany({
                where: filter,
                orderBy,
                take: limit,
                skip: skip
            });

            return hits;
        } catch (error) {
            this.logger.error('Error finding API hits:', error);
            throw error;
        }
    }

    async count(filters: Prisma.ApiHitWhereInput = {}): Promise<number> {
        try {
            const count = await this.model.count({
                where: filters
            });
            return count;
        } catch (error) {
            this.logger.error('Error counting API hits:', error);
            throw error;
        }
    }

    async deleteOldHits(beforeDate: Date): Promise<number> {
        try {
            const result = await this.model.deleteMany({
                where: {
                    timestamp: {
                        lt: beforeDate
                    }
                }
            });
            this.logger.info('Deleted old API hits', { count: result.count });
            return result.count;
        } catch (error) {
            this.logger.error('Error deleting old API hits:', error);
            throw error;
        }
    }
}
