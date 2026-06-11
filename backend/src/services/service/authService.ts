import jwt from "jsonwebtoken";
import config from "../../shared/config/index";
import logger from "../../shared/config/logger";
import AppError from "../../shared/utils/AppError";
import { User, Prisma, Role } from "@prisma/client";

export class AuthService {
    private userRepository: any;

    constructor(userRepository: any) {
        if (!userRepository) {
            throw new Error("UserRepository is Required");
        }
        this.userRepository = userRepository;
    }

    generateToken(user: User): string {
        const { id, email, username, role, clientId } = user;

        const payload = {
            userId: id,
            username,
            email,
            role,
            clientId
        };

        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn as any
        });
    }

    formatUserForResponse(user: User): Omit<User, 'passwordHash'> {
        const userObj = { ...user };
        delete (userObj as any).passwordHash;
        return userObj;
    }

    async onboardSuperAdmin(
        superAdminData: Prisma.UserCreateInput
    ): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
        try {
            const existingUsers = await this.userRepository.findAll();

            if (existingUsers && existingUsers.length > 0) {
                throw new AppError("Super admin onboarding is disabled", 403);
            }

            // Force the role to be SUPER_ADMIN for onboarding
            const data = {
                ...superAdminData,
                role: Role.SUPER_ADMIN
            };

            const user = await this.userRepository.create(data);
            const token = this.generateToken(user);

            logger.info("Admin onboarded successfully", {
                username: user.username
            });

            return {
                user: this.formatUserForResponse(user),
                token
            };
        } catch (error: unknown) {
            logger.error("Error in onboarding Super admin", error);
            throw error;
        }
    }
}
