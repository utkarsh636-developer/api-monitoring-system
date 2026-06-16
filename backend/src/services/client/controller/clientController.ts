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

    async createApiKey(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { clientId } = req.params;
            const apiKey = await this.clientService.createApiKey(clientId, req.body, req.user!);
            return res.status(201).json(ResponseFormatter.success(apiKey, "API key created successfully", 201));
        } catch (error) {
            next(error);
        }
    }

    async getClientApiKeys(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { clientId } = req.params;
            const apiKeys = await this.clientService.getClientApiKeys(clientId, req.user!);
            return res.status(200).json(ResponseFormatter.success(apiKeys, "API keys fetched successfully", 200));
        } catch (error) {
            next(error);
        }
    }
  
}
