import { User, Prisma, Role } from '@prisma/client';
import BaseRepository from './BaseRepository';
import dbConnection from '../../../shared/config/prisma';
import logger from '../../../shared/config/logger';

export class UserRepository extends BaseRepository<User, Prisma.UserCreateInput> {
    constructor() {
        const client = dbConnection.getClient();
        if (!client) {
            throw new Error("Database client has not been initialized");
        }
        // Pass the Prisma 'user' model delegate to the parent class
        super(client.user);
    }

    async create(userData: Prisma.UserCreateInput): Promise<User> {
        try {
            const data = { ...userData };

            // 1. Prisma uses uppercase enums: Role.SUPER_ADMIN instead of 'super_admin'
            // 2. We set the flattened permission fields directly on the object
            if (data.role === Role.SUPER_ADMIN) {
                data.canCreateApiKeys = true;
                data.canManageUsers = true;
                data.canViewAnalytics = true;
                data.canExportData = true;
            }

            const user = await this.model.create({ data });
            logger.info("User created successfully", { username: user.username });
            return user;
        } catch (error: unknown) {
            logger.error("Error creating user", error);
            throw error;
        }
    }

    async findById(userId: string): Promise<User | null> {
        try {
            const user = await this.model.findUnique({
                where: { id: userId }
            });
            return user;
        } catch (error: unknown) {
            logger.error("Error finding user by id", error);
            throw error;
        }
    }

    async findByUsername(username: string): Promise<User | null> {
        try {
            const user = await this.model.findUnique({
                where: { username }
            });
            return user;
        } catch (error: unknown) {
            logger.error("Error finding user by username", error);
            throw error;
        }
    }

    async findByEmail(email: string): Promise<User | null> {
        try {
            const user = await this.model.findUnique({
                where: { email }
            });
            return user;
        } catch (error: unknown) {
            logger.error("Error finding user by email", error);
            throw error;
        }
    }

    async findAll(): Promise<User[]> {
        try {
            const users = await this.model.findMany({
                where: { isActive: true }
            });
            return users;
        } catch (error: unknown) {
            logger.error("Error finding active users", error);
            throw error;
        }
    }
}

// Export a singleton instance of the repository
export default new UserRepository();
