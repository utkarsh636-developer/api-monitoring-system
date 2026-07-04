import { Request, Response, NextFunction } from 'express';
import config from "../../../shared/config/index";
import { APPLICATION_ROLES } from "../../../shared/constants/roles";
import ResponseFormatter from "../../../shared/utils/responseFormatter";
import { AuthService } from "../service/authService";
import jwt from 'jsonwebtoken';
import CacheService from "../../../shared/service/cacheService";

export class AuthController {
    private authService: AuthService;

    constructor(authService: AuthService) {
        if (!authService) {
            throw new Error("authService is Required");
        }
        this.authService = authService;
    }

    async onboardSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { username, email, password } = req.body;

            const superAdminData = {
                username,
                email,
                password,
                role: APPLICATION_ROLES.SUPER_ADMIN
            };

            const { token, user } = await this.authService.onboardSuperAdmin(superAdminData as any);

            res.cookie("authToken", token, {
                httpOnly: config.cookie.httpOnly,
                secure: config.cookie.secure,
                sameSite: config.cookie.sameSite,
                maxAge: config.cookie.expiresIn
            });

            res.status(201).json(ResponseFormatter.success(user, "Super admin created successfully", 201));
        } catch (error) {
            next(error);
        }
    }

    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { username, email, password, role } = req.body;
            const userData = {
                username, 
                email, 
                password, 
                role: role || APPLICATION_ROLES.CLIENT_VIEWER
            };

            const { token, user } = await this.authService.register(userData as any);

            res.cookie("authToken", token, {
                httpOnly: config.cookie.httpOnly,
                secure: config.cookie.secure,
                sameSite: config.cookie.sameSite,
                maxAge: config.cookie.expiresIn
            });

            res.status(201).json(ResponseFormatter.success(user, "User created successfully", 201));
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { username, password } = req.body;
            const { user, token } = await this.authService.login(username, password);

            res.cookie("authToken", token, {
                httpOnly: config.cookie.httpOnly,
                secure: config.cookie.secure,
                sameSite: config.cookie.sameSite,
                maxAge: config.cookie.expiresIn
            });

            res.status(200).json(ResponseFormatter.success(user, "User LoggedIn successfully", 200));
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user!.userId;
            const result = await this.authService.getProfile(userId);
            res.status(200).json(ResponseFormatter.success(result, "Profile fetched successfully", 200));
        } catch (error) {
            next(error);
        }
    }

    async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const token = req.cookies.authToken || req.headers.authorization?.split(" ")[1];

            if (token) {
                try {
                    const decoded = jwt.decode(token) as { exp?: number };
                    if (decoded && decoded.exp) {
                        const remainingSeconds = decoded.exp - Math.floor(Date.now() / 1000);
                        if (remainingSeconds > 0) {
                            await CacheService.set(`jwt:blacklist:${token}`, true, remainingSeconds);
                        }
                    }
                } catch (err) {
                    // Kept this EMPTY on purpose!
                    // If Redis is offline or the token is corrupt, we catch the error
                    // and ignore it so we can still log the user out.
                }
            }

            res.clearCookie("authToken", {
                httpOnly: config.cookie.httpOnly,
                secure: config.cookie.secure,
                sameSite: config.cookie.sameSite,
            });
            res.status(200).json(ResponseFormatter.success({}, "Logout successful", 200));
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { username, email } = req.body;
            const result = await this.authService.updateProfile(userId, { username, email });
            res.status(200).json(ResponseFormatter.success(result, "Profile updated successfully", 200));
        } catch (error) {
            next(error);
        }
    }

}
