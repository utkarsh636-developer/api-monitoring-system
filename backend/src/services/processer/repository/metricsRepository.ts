import { BaseRepository, BaseRepositoryDependencies } from './baseRepository';
import dbConnection from '../../../shared/config/prisma';

const MAX_LIMIT = 1000;

export interface EndpointMetricsInput {
    clientId: string;
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

export interface MetricsFilter {
    clientId?: string | null;
    serviceName?: string;
    endpoint?: string;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
    limit?: number;
    offset?: number;
}

export class MetricsRepository extends BaseRepository {
    constructor({ logger }: BaseRepositoryDependencies = {}) {
        super({ logger });
    }

    async upsertEndpointMetrics(metricsData: EndpointMetricsInput): Promise<void> {
        try {
            const {
                clientId,
                serviceName,
                endpoint,
                method,
                totalHits,
                errorHits,
                avgLatency,
                minLatency,
                maxLatency,
                timeBucket,
            } = metricsData;

            const query = `
            INSERT INTO "EndpointMetrics" (
                "clientId", "serviceName", "endpoint", "method", "totalHits", "errorHits",
                "avgLatency", "minLatency", "maxLatency", "timeBucket", "updatedAt"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
            ON CONFLICT ("clientId", "serviceName", "endpoint", "method", "timeBucket")
            DO UPDATE SET
               "totalHits" = "EndpointMetrics"."totalHits" + EXCLUDED."totalHits",
               "errorHits" = "EndpointMetrics"."errorHits" + EXCLUDED."errorHits",
               "avgLatency" = (
                   (("EndpointMetrics"."avgLatency" * "EndpointMetrics"."totalHits") + (EXCLUDED."avgLatency" * EXCLUDED."totalHits")) 
                   / ("EndpointMetrics"."totalHits" + EXCLUDED."totalHits")
               ),
               "minLatency" = LEAST("EndpointMetrics"."minLatency", EXCLUDED."minLatency"),
               "maxLatency" = GREATEST("EndpointMetrics"."maxLatency", EXCLUDED."maxLatency"),
               "updatedAt" = CURRENT_TIMESTAMP
            `;

            await this.query(query, [
                clientId,
                serviceName,
                endpoint,
                method.toUpperCase(),
                totalHits,
                errorHits,
                avgLatency,
                minLatency,
                maxLatency,
                new Date(timeBucket),
            ]);
        } catch (error) {
            this.logger.error('Error upserting endpoint metrics:', error);
            throw error;
        }
    }

    async getMetrics(filter: MetricsFilter = {}): Promise<any[]> {
        try {
            const { clientId, serviceName, endpoint, startTime, endTime, limit = 100, offset = 0 } = filter;
            const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
            const safeOffset = Math.max(0, offset);

            let query = `
            SELECT
                "serviceName",
                "endpoint",
                "method",
                SUM("totalHits") as "totalHits",
                SUM("errorHits") as "errorHits",
                SUM("avgLatency" * "totalHits") / NULLIF(SUM("totalHits"), 0) as "avgLatency",
                MIN("minLatency") as "minLatency",
                MAX("maxLatency") as "maxLatency",
                "timeBucket"
            FROM "EndpointMetrics"
            `;

            const params: any[] = [];
            let paramIndex = 1;
            const whereConditions: string[] = [];

            if (clientId != null) {
                whereConditions.push(`"clientId" = $${paramIndex}`);
                params.push(clientId);
                paramIndex++;
            }

            if (serviceName) {
                whereConditions.push(`"serviceName" = $${paramIndex}`);
                params.push(serviceName);
                paramIndex++;
            }

            if (endpoint) {
                whereConditions.push(`"endpoint" = $${paramIndex}`);
                params.push(endpoint);
                paramIndex++;
            }

            if (startTime) {
                whereConditions.push(`"timeBucket" >= $${paramIndex}`);
                params.push(new Date(startTime));
                paramIndex++;
            }

            if (endTime) {
                whereConditions.push(`"timeBucket" <= $${paramIndex}`);
                params.push(new Date(endTime));
                paramIndex++;
            }

            if (whereConditions.length > 0) {
                query += ` WHERE ${whereConditions.join(' AND ')}`;
            }

            query += `
                GROUP BY "serviceName", "endpoint", "method", "timeBucket"
                ORDER BY "timeBucket" DESC
                LIMIT $${paramIndex}
                OFFSET $${paramIndex + 1}
            `;

            params.push(safeLimit, safeOffset);

            const result = await this.query(query, params);
            return result;
        } catch (error) {
            this.logger.error('Error getting endpoint metrics:', error);
            throw error;
        }
    }

    async getTopEndpoints(clientId: string | null | undefined, limit = 10, startTime: Date | string | null = null): Promise<any[]> {
        try {
            const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);

            let query = `
            SELECT
              "serviceName",
              "endpoint",
              "method",
              SUM("totalHits") as "totalHits",
              SUM("avgLatency" * "totalHits") / NULLIF(SUM("totalHits"), 0) as "avgLatency",
              SUM("errorHits") as "errorHits"
            FROM "EndpointMetrics"
            `;

            const params: any[] = [];
            let paramIndex = 1;

            if (clientId != null) {
                query += ` WHERE "clientId" = $${paramIndex}`;
                params.push(clientId);
                paramIndex++;
            }

            if (startTime) {
                query += clientId != null ? ` AND` : ` WHERE`;
                query += ` "timeBucket" >= $${paramIndex}`;
                params.push(new Date(startTime));
                paramIndex++;
            }

            query += `
            GROUP BY "serviceName", "endpoint", "method"
            ORDER BY "totalHits" DESC
            LIMIT $${paramIndex}
            `;
            params.push(safeLimit);

            const result = await this.query(query, params);
            return result;
        } catch (error) {
            this.logger.error('Error getting top endpoints:', error);
            throw error;
        }
    }

    async getOverallStats(clientId: string | null | undefined, startTime: Date | string | null = null, endTime: Date | string | null = null): Promise<any> {
        try {
            let query = `
            SELECT
              SUM("totalHits") as "totalHits",
              SUM("errorHits") as "errorHits",
              SUM("avgLatency" * "totalHits") / NULLIF(SUM("totalHits"), 0) as "avgLatency",
              COUNT(DISTINCT "serviceName") as "uniqueServices",
              COUNT(DISTINCT "endpoint") as "uniqueEndpoints"
            FROM "EndpointMetrics"
            `;

            const params: any[] = [];
            let paramIndex = 1;

            if (clientId != null) {
                query += ` WHERE "clientId" = $${paramIndex}`;
                params.push(clientId);
                paramIndex++;
            }

            if (startTime) {
                query += clientId != null ? ` AND` : ` WHERE`;
                query += ` "timeBucket" >= $${paramIndex}`;
                params.push(new Date(startTime));
                paramIndex++;
            }

            if (endTime) {
                query += (clientId != null || startTime) ? ` AND` : ` WHERE`;
                query += ` "timeBucket" <= $${paramIndex}`;
                params.push(new Date(endTime));
                paramIndex++;
            }

            const result = await this.query(query, params);
            return result[0] || {};
        } catch (error) {
            this.logger.error('Error getting overall stats:', error);
            throw error;
        }
    }

    async save(metricsData: EndpointMetricsInput): Promise<void> {
        return this.upsertEndpointMetrics(metricsData);
    }

    async find(
        filter: MetricsFilter = {},
        options: { limit?: number; skip?: number } = {}
    ): Promise<any[]> {
        return this.getMetrics({ ...filter, limit: options.limit, offset: options.skip });
    }

    async count(filters: any = {}): Promise<number> {
        const result = await this.query('SELECT COUNT(*)::int as count FROM "EndpointMetrics"');
        return result[0]?.count || 0;
    }

    async deleteOldHits(beforeDate: Date): Promise<number> {
        const result = await this.query(
            'DELETE FROM "EndpointMetrics" WHERE "timeBucket" < $1',
            [beforeDate]
        );
        return result;
    }

    private async query(sql: string, params: any[] = []): Promise<any> {
        const client = dbConnection.getClient();
        if (!client) {
            throw new Error('Database client not configured on MetricsRepository');
        }

        const isWrite = /^\s*(insert|update|delete|create|drop|alter)/i.test(sql);
        if (isWrite) {
            return client.$executeRawUnsafe(sql, ...params);
        } else {
            return client.$queryRawUnsafe(sql, ...params);
        }
    }
}
