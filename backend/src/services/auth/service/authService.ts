import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import config from "../../../shared/config/index";
import logger from "../../../shared/config/logger";
import AppError from "../../../shared/utils/AppError";
import { User, Prisma, Role } from "@prisma/client";
import { UserRepository } from "../repository/UserRepository";

export class AuthService {
    private userRepository: UserRepository;

    constructor(userRepository: UserRepository) {
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

    async comparePassword(userEnteredPassword: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(userEnteredPassword, hashedPassword);
    }


    async onboardSuperAdmin(
        superAdminData: { username: string; email: string; password?: string }
    ): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
        try {
            const existingUsers = await this.userRepository.findAll();

            if (existingUsers && existingUsers.length > 0) {
                throw new AppError("Super admin onboarding is disabled", 403);
            }

            const { username, email, password } = superAdminData;
            if (!password) {
                throw new AppError("Password is required", 400);
            }
            
            const passwordHash = await bcrypt.hash(password, 10);

            const data: Prisma.UserCreateInput = {
                username,
                email,
                passwordHash,
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

    async register(
        userData: any
    ): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
        try {
            const existingUser = await this.userRepository.findByUsername(userData.username);
            if (existingUser) {
                throw new AppError("Username already exists", 409);
            }

            const existingEmail = await this.userRepository.findByEmail(userData.email);
            if (existingEmail) {
                throw new AppError("Email already exists", 409);
            }

            const { username, email, password, role } = userData;
            if (!password) {
                throw new AppError("Password is required", 400);
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const user = await this.userRepository.create({
                username,
                email,
                passwordHash,
                role
            });
            const token = this.generateToken(user);

            logger.info("User registered successfully", {
                username: user.username
            });

            return {
                user: this.formatUserForResponse(user),
                token
            };
        } catch (error: unknown) {
            logger.error("Error in Register service", error);
            throw error;
        }
    }

    async login(
        username: string, 
        password: string
    ): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
        try {
            const user = await this.userRepository.findByUsername(username);

            if (!user) {
                throw new AppError("Invalid Credentials", 401);
            }

            if (!user.isActive) {
                throw new AppError("Account is deactivated", 403);
            }

            // Since Prisma's model uses 'passwordHash' instead of 'password', 
            // we use 'user.passwordHash' here.
            const isPasswordValid = await this.comparePassword(password, user.passwordHash);
            if (!isPasswordValid) {
                throw new AppError("Invalid Credentials", 401);
            }
            
            const token = this.generateToken(user);

            logger.info("User loggedIn successfully", { username: user.username });

            return {
                user: this.formatUserForResponse(user),
                token
            };
        } catch (error: unknown) {
            logger.error("Error in Login service", error);
            throw error;
        }
    }

    async getProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new AppError('User not found', 404);
            }
            return this.formatUserForResponse(user);
        } catch (error: unknown) {
            logger.error('Error getting user profile:', error);
            throw error;
        }
    }

    async checkSuperAdminPermissions(userId: string): Promise<boolean> {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new AppError("User not found", 404);
            }

            return user.role === Role.SUPER_ADMIN; 
        } catch (error: unknown) {
            logger.error("Error in checking super admin permissions", error);
            throw error;
        }
    }

    async updateProfile(userId: string, profileData: { username: string; email: string }): Promise<Omit<User, 'passwordHash'>> {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new AppError('User not found', 404);
            }

            if (profileData.username && profileData.username !== user.username) {
                const existing = await this.userRepository.findByUsername(profileData.username);
                if (existing) {
                    throw new AppError('Username already taken', 400);
                }
            }
            if (profileData.email && profileData.email !== user.email) {
                const existing = await this.userRepository.findByEmail(profileData.email);
                if (existing) {
                    throw new AppError('Email address already in use', 400);
                }
            }

            const updatedUser = await this.userRepository.update(userId, profileData);
            return this.formatUserForResponse(updatedUser);
        } catch (error: unknown) {
            logger.error('Error updating user profile:', error);
            throw error;
        }
    }

}
