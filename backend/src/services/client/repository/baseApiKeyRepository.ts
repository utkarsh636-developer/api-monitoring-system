import { ApiKey, Prisma } from '@prisma/client';

export default abstract class BaseApiKeyRepository {
    // Retrieve the Prisma model dynamically when queries are executed
    protected abstract get model(): any;

    constructor() {}

    abstract create(apiKeyData: Prisma.ApiKeyCreateInput): Promise<ApiKey>;

    abstract findByKeyValue(keyValue: string, includeInactive?: boolean): Promise<ApiKey | null>;

    abstract findByClientId(clientId: string, filters?: Prisma.ApiKeyWhereInput): Promise<ApiKey[]>;

    abstract countByClientId(clientId: string, filters?: Prisma.ApiKeyWhereInput): Promise<number>;
}
