import { ApiKey, Prisma } from '@prisma/client';

export default abstract class BaseApiKeyRepository {
    // Retrieve the Prisma model dynamically when queries are executed
    protected abstract get model(): any;

    constructor() {}

    abstract create(apiKeyData: Prisma.ApiKeyCreateInput): Promise<ApiKey>;

    abstract findByKeyValue(keyValue: string, includeInactive?: boolean): Promise<ApiKey | null>;

    abstract findByClientId(clientId: string, filters?: Prisma.ApiKeyWhereInput): Promise<ApiKey[]>;

    abstract countByClientId(clientId: string, filters?: Prisma.ApiKeyWhereInput): Promise<number>;

    abstract findById(id: string): Promise<ApiKey | null>;

    abstract update(id: string, apiKeyData: Prisma.ApiKeyUpdateInput): Promise<ApiKey>;

    abstract delete(id: string): Promise<ApiKey>;
}
