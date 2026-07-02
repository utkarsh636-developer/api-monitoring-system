import { Client, Prisma } from '@prisma/client';
import BaseClientRepository from "./baseClientRepository";
import dbConnection from "../../../shared/config/prisma";
import logger from "../../../shared/config/logger";

export class ClientRepository extends BaseClientRepository {
    constructor() {
        super();
    }

    // Retrieve the Prisma Client delegate dynamically at query-time
    protected get model(): any {
        const client = dbConnection.getClient();
        if (!client) {
            throw new Error("Database client has not been initialized");
        }
        return client.client; // Matches the 'Client' model in schema.prisma
    }

    async create(clientData: Prisma.ClientCreateInput): Promise<Client> {
        try {
            const client = await this.model.create({
                data: clientData
            });

            logger.info('Client created in PostgreSQL', {
                id: client.id,
                slug: client.slug
            });

            return client;
        } catch (error: unknown) {
            logger.error('Error creating client in db', error);
            throw error;
        }
    }

    async findById(clientId: string): Promise<Client | null> {
        try {
            const client = await this.model.findUnique({
                where: { id: clientId }
            });

            logger.info('Client details from PostgreSQL', { id: client?.id });

            return client;
        } catch (error: unknown) {
            logger.error('Error finding client in db by id', error);
            throw error;
        }
    }

    async findBySlug(slug: string): Promise<Client | null> {
        try {
            const client = await this.model.findUnique({
                where: { slug }
            });
            return client;
        } catch (error: unknown) {
            logger.error('Error finding client by slug:', error);
            throw error;
        }
    }

    async find(
        filters: Prisma.ClientWhereInput = {}, 
        options: { skip?: number; take?: number; orderBy?: Prisma.ClientOrderByWithRelationInput } = {}
    ): Promise<Client[]> {
        try {
            const { take = 50, skip = 0, orderBy = { createdAt: 'desc' } } = options;

            const clients = await this.model.findMany({
                where: filters,
                orderBy,
                skip,
                take
            });

            return clients;
        } catch (error: unknown) {
            logger.error('Error finding clients:', error);
            throw error;
        }
    }

    async count(filters: Prisma.ClientWhereInput = {}): Promise<number> {
        try {
            const count = await this.model.count({
                where: filters
            });
            return count;
        } catch (error: unknown) {
            logger.error('Error counting clients:', error);
            throw error;
        }
    }

    async update(clientId: string, clientData: Prisma.ClientUpdateInput): Promise<Client> {
        try {
            const client = await this.model.update({
                where: { id: clientId },
                data: clientData
            });

            logger.info('Client updated in PostgreSQL', { id: client.id });
            return client;
        } catch (error: unknown) {
            logger.error('Error updating client in db', error);
            throw error;
        }
    }

    async delete(clientId: string): Promise<Client> {
        try {
            const client = await this.model.delete({
                where: { id: clientId }
            });

            logger.info('Client deleted from PostgreSQL', { id: client.id });
            return client;
        } catch (error: unknown) {
            logger.error('Error deleting client from db', error);
            throw error;
        }
    }
}

export default new ClientRepository();
