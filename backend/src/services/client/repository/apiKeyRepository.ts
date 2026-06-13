import { ApiKey, Prisma } from '@prisma/client';
import BaseApiKeyRepository from "./baseApiKeyRepository";
import dbConnection from "../../../shared/config/prisma";
import logger from "../../../shared/config/logger";

export class ApiKeyRepository extends BaseApiKeyRepository {
    constructor() {
        super();
    }

    // Retrieve the Prisma Client delegate dynamically at query-time
    protected get model(): any {
        const client = dbConnection.getClient();
        if (!client) {
            throw new Error("Database client has not been initialized");
        }
        return client.apiKey; // Matches the 'ApiKey' model in schema.prisma
    }

    async create(apiKeyData: Prisma.ApiKeyCreateInput): Promise<ApiKey> {
        try {
            const apiKey = await this.model.create({
                data: apiKeyData
            });
            logger.info('API key created in database', { keyId: apiKey.keyId });
            return apiKey;
        } catch (error: unknown) {
            logger.error('Error creating API key in database:', error);
            throw error;
        }
    }

    async findByKeyValue(keyValue: string, includeInactive = false): Promise<ApiKey | null> {
        try {
            const where: Prisma.ApiKeyWhereInput = { keyValue };
            if (!includeInactive) {
                where.isActive = true;
            }

            // Using findFirst instead of findUnique because we might filter by 'isActive' which isn't a unique field.
            // Includes the associated Client model details (equivalent to mongoose .populate('clientId'))
            const apiKey = await this.model.findFirst({
                where,
                include: {
                    client: true
                }
            });
            return apiKey;
        } catch (error: unknown) {
            logger.error('Error finding API key by value:', error);
            throw error;
        }
    }

    async findByClientId(clientId: string, filters: Prisma.ApiKeyWhereInput = {}): Promise<ApiKey[]> {
        try {
            const where: Prisma.ApiKeyWhereInput = {
                clientId,
                ...filters
            };

            // Queries keys belonging to the client and selects only the username/email of the creator
            // (equivalent to mongoose .populate('createdBy', 'username email'))
            const apiKeys = await this.model.findMany({
                where,
                include: {
                    creator: {
                        select: {
                            username: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return apiKeys;
        } catch (error: unknown) {
            logger.error('Error finding API keys by client ID:', error);
            throw error;
        }
    }

    async countByClientId(clientId: string, filters: Prisma.ApiKeyWhereInput = {}): Promise<number> {
        try {
            const count = await this.model.count({
                where: {
                    clientId,
                    ...filters
                }
            });
            return count;
        } catch (error: unknown) {
            logger.error('Error counting API keys:', error);
            throw error;
        }
    }
}

export default new ApiKeyRepository();
