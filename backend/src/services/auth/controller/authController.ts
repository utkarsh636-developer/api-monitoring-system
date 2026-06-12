import { Request, Response, NextFunction } from 'express';
import config from "../../../shared/config/index";
import { APPLICATION_ROLES } from "../../../shared/constants/roles";
import ResponseFormatter from "../../../shared/utils/responseFormatter";
import { AuthService } from "../service/authService";

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
                maxAge: config.cookie.expiresIn
            });

            res.status(201).json(ResponseFormatter.success(user, "User created successfully", 201));
        } catch (error) {
            next(error);
        }
    }

}
