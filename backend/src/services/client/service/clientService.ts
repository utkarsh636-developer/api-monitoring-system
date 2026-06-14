import { User, Prisma, Client, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import BaseClientRepository from '../repository/baseClientRepository';
import BaseApiKeyRepository from '../repository/baseApiKeyRepository';
import BaseRepository from '../../auth/repository/BaseRepository';
import AppError from '../../../shared/utils/AppError';
import logger from '../../../shared/config/logger';
import { APPLICATION_ROLES, isValidClientRole } from '../../../shared/constants/roles';

interface ClientServiceDependencies {
    clientRepository: BaseClientRepository;
    apiKeyRepository: BaseApiKeyRepository;
    userRepository: BaseRepository<User, Prisma.UserCreateInput>;
}

export class ClientService {
    private clientRepository: BaseClientRepository;
    private apiKeyRepository: BaseApiKeyRepository;
    private userRepository: BaseRepository<User, Prisma.UserCreateInput>;

    constructor(dependencies: ClientServiceDependencies) {
        if (!dependencies) {
            throw new Error('Dependencies are required');
        }
        if (!dependencies.clientRepository) {
            throw new Error('ClientRepository is required');
        }
        if (!dependencies.apiKeyRepository) {
            throw new Error('ApiKeyRepository is required');
        }
        if (!dependencies.userRepository) {
            throw new Error('UserRepository is required');
        }

        // Assign dependencies to instance variables
        this.clientRepository = dependencies.clientRepository;
        this.apiKeyRepository = dependencies.apiKeyRepository;
        this.userRepository = dependencies.userRepository;
    }

    formatClientForResponse(user: User): Omit<User, 'passwordHash'> {
        const userObj = { ...user };
        delete (userObj as any).passwordHash; // Prisma uses 'passwordHash' rather than 'password'
        return userObj;
    }

    generateSlug(name: string): string {
        return name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    async createClient(
        clientData: { name: string; email: string; description?: string | null; website?: string | null }, 
        adminUser: { userId: string }
    ): Promise<Client> {
        try {
            const { name, email, description, website } = clientData;

            const slug = this.generateSlug(name);

            const exisitingClient = await this.clientRepository.findBySlug(slug);

            if (exisitingClient) {
                throw new AppError(`Client with slug ${slug} already exists`, 400);
            }

            const client = await this.clientRepository.create({
                name,
                slug,
                email,
                description,
                website,
                creator: {
                    connect: {
                        id: adminUser.userId
                    }
                }
            });

            return client;
        } catch (error: unknown) {
            logger.error('Error creating client:', error);
            throw error;
        }
    }

    canUserAccessClient(user: { role: string; clientId?: string | null }, clientId: string): boolean {
        if (user.role === APPLICATION_ROLES.SUPER_ADMIN) {
            return true;
        }

        return !!(user.clientId && user.clientId.toString() === clientId.toString());
    }

    async createClientUser(
        clientId: string, 
        userData: { username: string; email: string; password?: string; role?: any }, 
        adminUser: { role: string; clientId?: string | null }
    ): Promise<Omit<User, 'passwordHash'>> {
        try {
            if (!this.canUserAccessClient(adminUser, clientId)) {
                throw new AppError("Access denied", 403);
            }

            const { username, email, password, role = APPLICATION_ROLES.CLIENT_VIEWER } = userData;

            if (!password) {
                throw new AppError("Password is required", 400);
            }

            if (!isValidClientRole(role)) {
                throw new AppError("Invalid role for client user", 400);
            }

            const client = await this.clientRepository.findById(clientId);
            if (!client) {
                throw new AppError("Client not found", 404);
            }

            let permissions = {
                canCreateApiKeys: false,
                canManageUsers: false,
                canViewAnalytics: true,
                canExportData: false,
            };

            if (role === Role.CLIENT_ADMIN) {
                permissions = {
                    canCreateApiKeys: true,
                    canManageUsers: true,
                    canViewAnalytics: true,
                    canExportData: true,
                };
            }

            // Hash the password since Prisma does not run database-level pre-save hooks
            const passwordHash = await bcrypt.hash(password, 10);

            const user = await this.userRepository.create({
                username,
                email,
                passwordHash,
                role,
                client: {
                    connect: {
                        id: clientId
                    }
                },
                ...permissions
            });

            logger.info("Client user created", {
                clientId,
                userId: user.id,
                role
            });

            return this.formatClientForResponse(user);
        } catch (error: unknown) {
            logger.error("Error creating client user", error);
            throw error;
        }
    }

}
