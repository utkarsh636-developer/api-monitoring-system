import { User, Prisma, Client } from '@prisma/client';
import BaseClientRepository from '../repository/baseClientRepository';
import BaseApiKeyRepository from '../repository/baseApiKeyRepository';
import BaseRepository from '../../auth/repository/BaseRepository';
import AppError from '../../../shared/utils/AppError';
import logger from '../../../shared/config/logger';

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


}
