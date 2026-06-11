import { Request, Response, NextFunction } from 'express';
import config from "../../shared/config/index";
import { APPLICATION_ROLES } from "../../shared/constants/roles";
import ResponseFormatter from "../../shared/utils/responseFormatter";

export class AuthController {
    private authService: any;

    constructor(authService: any) {
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

            // Cast as any for now because we will update the service layer's input structure 
            // to accept the plain password and hash it before saving.
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
}
