import { Client, Prisma } from '@prisma/client';

export default abstract class BaseClientRepository {
    // Retrieve the Prisma model dynamically when queries are executed
    protected abstract get model(): any;

    constructor() {}

    abstract create(clientData: Prisma.ClientCreateInput): Promise<Client>;

    abstract findById(clientId: string): Promise<Client | null>;

    abstract findBySlug(slug: string): Promise<Client | null>;

    abstract find(
        filters: Prisma.ClientWhereInput, 
        options?: { skip?: number; take?: number; orderBy?: Prisma.ClientOrderByWithRelationInput }
    ): Promise<Client[]>;

    abstract count(filters: Prisma.ClientWhereInput): Promise<number>;
}
