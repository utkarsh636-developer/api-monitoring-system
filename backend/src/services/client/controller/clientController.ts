import { Request, Response, NextFunction } from 'express';
import ResponseFormatter from '../../../shared/utils/responseFormatter';
import { ClientService } from '../service/clientService';
import { AuthService } from '../../auth/service/authService';

export class ClientController {
    private clientService: ClientService;
    private authService: AuthService;

    constructor(clientService: ClientService, authService: AuthService) {
        if (!clientService) {
            throw new Error('ClientService is required');
        }
        if (!authService) {
            throw new Error('authService is required');
        }

        this.clientService = clientService;
        this.authService = authService;
    }

    async createClient(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const userId = req.user!.userId;
            
            const isSuperAdmin = await this.authService.checkSuperAdminPermissions(userId);
            if (!isSuperAdmin) {
                return res.status(403).json(ResponseFormatter.error("Access denied", 403));
            }

            const client = await this.clientService.createClient(req.body, req.user!);

            return res.status(201).json(ResponseFormatter.success(client, "Client created successfully", 201));
        } catch (error) {
            next(error);
        }
    }

    async createClientUser(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { clientId } = req.params;
            const user = await this.clientService.createClientUser(clientId, req.body, req.user!);
            return res.status(201).json(ResponseFormatter.success(user, "Client user created successfully", 201));
        } catch (error) {
            next(error);
        }
    }

}
