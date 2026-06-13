import { User, Prisma } from '@prisma/client';
import BaseClientRepository from '../repository/baseClientRepository';
import BaseApiKeyRepository from '../repository/baseApiKeyRepository';
import BaseRepository from '../../auth/repository/BaseRepository';

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
}
