import { BaseRepository, BaseRepositoryDependencies } from '../../processer/repository/baseRepository';
import dbConnection from '../../../shared/config/prisma';

export interface AlertInput {
    endpoint: string;
    method: string;
    actualValue: number;
    expectedValue: number;
    stdDevs: number;
    detectedAt: Date;
}

export class AlertRepository extends BaseRepository {
    constructor({ logger }: BaseRepositoryDependencies = {}) {
        super({ logger });
    }

    async save(alert: AlertInput): Promise<void> {
        try {
            const query = `
                INSERT INTO "LatencyAlert"
                    ("endpoint", "method", "actualValue", "expectedValue", "stdDevs", "detectedAt", "createdAt")
                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            `;
            await this.executeWrite(query, [
                alert.endpoint,
                alert.method.toUpperCase(),
                alert.actualValue,
                alert.expectedValue,
                alert.stdDevs,
                alert.detectedAt,
            ]);
        } catch (error) {
            this.logger.error('[AlertRepository] Error saving alert:', error);
            throw error;
        }
    }

    async find(filter: { endpoint?: string; method?: string } = {}): Promise<any[]> {
        try {
            const params: any[] = [];
            let paramIndex = 1;
            const conditions: string[] = [];

            if (filter.endpoint) {
                conditions.push(`"endpoint" = $${paramIndex}`);
                params.push(filter.endpoint);
                paramIndex++;
            }
            if (filter.method) {
                conditions.push(`"method" = $${paramIndex}`);
                params.push(filter.method.toUpperCase());
                paramIndex++;
            }

            const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const query = `
                SELECT * FROM "LatencyAlert"
                ${where}
                ORDER BY "detectedAt" DESC
                LIMIT 100
            `;
            return await this.executeRead(query, params);
        } catch (error) {
            this.logger.error('[AlertRepository] Error fetching alerts:', error);
            throw error;
        }
    }

    async count(): Promise<number> {
        try {
            const result = await this.executeRead('SELECT COUNT(*)::int AS count FROM "LatencyAlert"');
            return result[0]?.count || 0;
        } catch (error) {
            this.logger.error('[AlertRepository] Error counting alerts:', error);
            throw error;
        }
    }

    async deleteOldHits(beforeDate: Date): Promise<number> {
        try {
            const result = await this.executeWrite(
                'DELETE FROM "LatencyAlert" WHERE "detectedAt" < $1',
                [beforeDate]
            );
            return result;
        } catch (error) {
            this.logger.error('[AlertRepository] Error deleting old alerts:', error);
            throw error;
        }
    }

    private async executeRead(sql: string, params: any[] = []): Promise<any[]> {
        const client = dbConnection.getClient();
        if (!client) {
            throw new Error('[AlertRepository] Database client not available');
        }
        return client.$queryRawUnsafe(sql, ...params);
    }

    private async executeWrite(sql: string, params: any[] = []): Promise<any> {
        const client = dbConnection.getClient();
        if (!client) {
            throw new Error('[AlertRepository] Database client not available');
        }
        return client.$executeRawUnsafe(sql, ...params);
    }
}
